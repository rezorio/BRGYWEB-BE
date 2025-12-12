import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentRequest, RequestStatus } from './entities/document-request.entity';
import { User } from '../auth/entities/user.entity';
import { CreateDocumentRequestDto } from './dto/create-request.dto';
import { CreateAdminDocumentRequestDto } from './dto/create-admin-request.dto';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { SmsService } from '../sms/sms.service';
import * as fs from 'fs';
import * as path from 'path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import * as mammoth from 'mammoth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const htmlPdf = require('html-pdf-node');

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentRequest)
    private documentRequestRepository: Repository<DocumentRequest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private smsService: SmsService,
  ) {}

  /**
   * Create a new document request with profile completion gate
   */
  async createRequest(userId: string, createDto: CreateDocumentRequestDto) {
    // Fetch user with fresh data (no cache)
    const user = await this.userRepository.findOne({
      where: { id: userId },
      cache: false
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // PROFILE COMPLETION GATE - The crucial check
    if (!user.checkProfileCompleteness()) {
      throw new ForbiddenException(
        'Profile incomplete. Please complete your profile with firstName, lastName, birthday, streetNumber, and streetName before requesting documents.'
      );
    }

    // Check if user already has a pending request for this document type
    const requestType = createDto.requestType || 'barangay_clearance';
    const existingPendingRequest = await this.hasPendingRequestForType(userId, requestType);
    if (existingPendingRequest) {
      throw new BadRequestException(
        `You already have a pending request for ${requestType}. Please wait for it to be processed or cancel it before submitting a new request.`
      );
    }

    // Update the profile completion flag if not already set
    if (!user.isProfileComplete) {
      user.isProfileComplete = true;
      await this.userRepository.save(user);
    }

    // Create the document request
    const request = this.documentRequestRepository.create({
      user,
      requestType: createDto.requestType,
      purpose: createDto.purpose,
      status: RequestStatus.PENDING
    });

    const savedRequest = await this.documentRequestRepository.save(request);

    // Send SMS notification for request submission
    try {
      await this.smsService.sendRequestSubmittedNotification(savedRequest);
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      // Continue even if SMS fails
    }

    return savedRequest;
  }

  /**
   * Admin: Manually create a document request for a user (no profile completion gate)
   */
  async createAdminRequest(createDto: CreateAdminDocumentRequestDto) {
    const user = await this.userRepository.findOne({
      where: { id: createDto.userId },
      cache: false,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const request = this.documentRequestRepository.create({
      user,
      requestType: createDto.requestType,
      purpose: createDto.purpose,
      status: RequestStatus.PENDING,
    });

    const savedRequest = await this.documentRequestRepository.save(request);

    // Send SMS notification for admin-created request
    try {
      await this.smsService.sendRequestSubmittedNotification(savedRequest);
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      // Continue even if SMS fails
    }

    return savedRequest;
  }

  /**
   * Get all pending requests (for admin)
   */
  async getPendingRequests() {
    return await this.documentRequestRepository.find({
      where: { status: RequestStatus.PENDING },
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get all requests (for admin)
   */
  async getAllRequests() {
    return await this.documentRequestRepository.find({
      relations: ['user', 'processedBy'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get user's own requests
   */
  async getUserRequests(userId: string) {
    return await this.documentRequestRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get user's pending request (only one pending request allowed at a time)
   */
  async getUserPendingRequest(userId: string) {
    return await this.documentRequestRepository.findOne({
      where: { 
        user: { id: userId },
        status: RequestStatus.PENDING 
      },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get all user's pending requests (grouped by document type)
   */
  async getUserPendingRequests(userId: string) {
    return await this.documentRequestRepository.find({
      where: { 
        user: { id: userId },
        status: RequestStatus.PENDING 
      },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Check if user has a pending request for a specific document type
   */
  async hasPendingRequestForType(userId: string, requestType: string) {
    const request = await this.documentRequestRepository.findOne({
      where: { 
        user: { id: userId },
        requestType: requestType,
        status: RequestStatus.PENDING 
      }
    });
    return request;
  }

  /**
   * Cancel a pending request (user can only cancel their own pending requests)
   */
  async cancelRequest(requestId: number, userId: string) {
    const request = await this.documentRequestRepository.findOne({
      where: { id: requestId },
      relations: ['user']
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Verify the request belongs to the user
    if (request.user.id !== userId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    // Only pending requests can be cancelled
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    // Delete the request (or you could add a CANCELLED status if preferred)
    await this.documentRequestRepository.remove(request);

    return { 
      success: true, 
      message: 'Request cancelled successfully' 
    };
  }

  /**
   * Approve request and generate document (THE HARD PART)
   */
  async approveRequest(requestId: number, adminId: string, approveDto: ApproveRequestDto) {
    const request = await this.documentRequestRepository.findOne({
      where: { id: requestId },
      relations: ['user']
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }

    // Generate the document
    const buffer = await this.generateDocument(request);
    
    // Save the document to file system
    const fileName = `Clearance_${request.user.lastName}_${new Date().toISOString().substring(0, 10)}.docx`;
    const filePath = path.join(process.cwd(), 'generated-documents', fileName);
    
    // Ensure the directory exists
    const dir = path.join(process.cwd(), 'generated-documents');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the file
    fs.writeFileSync(filePath, buffer);

    // Update request status
    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }
    request.status = RequestStatus.APPROVED;
    request.processedBy = admin;
    request.processedAt = new Date();
    request.adminNotes = approveDto.adminNotes || '';
    request.generatedFilePath = fileName;
    
    await this.documentRequestRepository.save(request);

    // Send SMS notification for approved request
    try {
      await this.smsService.sendRequestApprovedNotification(request);
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      // Continue even if SMS fails
    }

    // Return the buffer for immediate download
    return { buffer, fileName, request };
  }

  /**
   * Deny request
   */
  async denyRequest(requestId: number, adminId: string, denialReason: string) {
    const request = await this.documentRequestRepository.findOne({
      where: { id: requestId },
      relations: ['user']
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }

    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }
    request.status = RequestStatus.DENIED;
    request.processedBy = admin;
    request.processedAt = new Date();
    request.denialReason = denialReason;
    
    const savedRequest = await this.documentRequestRepository.save(request);

    // Send SMS notification for denied request
    try {
      await this.smsService.sendRequestDeniedNotification(savedRequest);
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      // Continue even if SMS fails
    }

    return savedRequest;
  }

  /**
   * Generate DOCX document from template
   */
  private async generateDocument(request: DocumentRequest): Promise<Buffer> {
    const user = request.user;
    
    // Ensure templates directory exists
    const templatesDir = path.join(process.cwd(), 'templates');
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
      // Create default template if it doesn't exist
      await this.createDefaultTemplate(templatesDir);
    }

    // Get the template file path
    const templatePath = path.join(templatesDir, 'clearance_template.docx');
    
    // Check if template exists, if not create it
    if (!fs.existsSync(templatePath)) {
      await this.createDefaultTemplate(templatesDir);
    }

    // Load the template
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    // Initialize docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Format the birthday
    const birthDate = user.dateOfBirth 
      ? new Date(user.dateOfBirth).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : '';

    // Set the data for placeholders (IMPORTANT: These must match template placeholders)
    doc.setData({
      full_name: `${user.firstName} ${user.lastName}`,
      first_name: user.firstName,
      last_name: user.lastName,
      birth_date: birthDate,
      street_address: `${user.streetNumber} ${user.streetName}`,
      street_number: user.streetNumber,
      street_name: user.streetName,
      barangay_name: 'Bagong Barrio',  // Fixed as per requirements
      city_name: 'Caloocan City',      // Fixed as per requirements
      full_address: `${user.streetNumber} ${user.streetName}, Bagong Barrio, Caloocan City`,
      request_purpose: request.purpose,
      date_issued: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      current_year: new Date().getFullYear(),
      current_date: new Date().toLocaleDateString('en-US'),
    });

    // Render the document (replace placeholders)
    doc.render();

    // Generate the final buffer
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    return buffer;
  }

  /**
   * Create a default template if none exists
   */
  private async createDefaultTemplate(templatesDir: string): Promise<void> {
    // Create a basic DOCX template with placeholders
    const zip = new PizZip();
    
    // Create the document.xml with our template
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>REPUBLIC OF THE PHILIPPINES</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>CITY OF CALOOCAN</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>BARANGAY BAGONG BARRIO</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>BARANGAY CLEARANCE</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>Date: {date_issued}</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>TO WHOM IT MAY CONCERN:</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>This is to certify that {full_name}, born on {birth_date}, is a resident of {full_address}.</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>This clearance is issued for the purpose of: {request_purpose}</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>Given this {date_issued} at Barangay Bagong Barrio, Caloocan City.</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>_____________________</w:t></w:r></w:p>
    <w:p><w:r><w:t>Barangay Captain</w:t></w:r></w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    zip.file('word/document.xml', documentXml);

    // Add required DOCX structure files
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

    // Generate and save the template
    const buffer = zip.generate({ type: 'nodebuffer' });
    const templatePath = path.join(templatesDir, 'clearance_template.docx');
    fs.writeFileSync(templatePath, buffer);
    
    console.log('✅ Default template created at:', templatePath);
  }

  /**
   * Download generated document
   */
  async getGeneratedDocument(requestId: number, userId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const request = await this.documentRequestRepository.findOne({
      where: { id: requestId },
      relations: ['user']
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Check if user owns this request
    if (request.user.id !== userId) {
      // Additional admin check would go here
      throw new ForbiddenException('Access denied');
    }

    if (request.status !== RequestStatus.APPROVED || !request.generatedFilePath) {
      throw new BadRequestException('Document not yet generated');
    }

    const filePath = path.join(process.cwd(), 'generated-documents', request.generatedFilePath);
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Generated document file not found');
    }

    const buffer = fs.readFileSync(filePath);
    return { buffer, fileName: request.generatedFilePath };
  }

  /**
   * Test utility: convert uploaded DOCX template into a JSON representation
   */
  async convertDocxToJson(file: Express.Multer.File): Promise<{
    fileName: string;
    size: number;
    documentXml: string;
    placeholders: string[];
    images: { [key: string]: string };
    docxBase64: string;
  }> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded');
    }

    const zip = new PizZip(file.buffer);
    const documentXmlFile = zip.file('word/document.xml');

    if (!documentXmlFile) {
      throw new BadRequestException('Invalid DOCX file: document.xml not found');
    }

    const documentXml = documentXmlFile.asText();

    const placeholderMatches = Array.from(documentXml.matchAll(/\{([^}]+)\}/g));
    const placeholders = Array.from(
      new Set(placeholderMatches.map((match) => match[1])),
    );

    // Extract images from word/media/ folder
    const images: { [key: string]: string } = {};
    const mediaFiles = zip.file(/^word\/media\//);
    
    for (const mediaFile of mediaFiles) {
      const fileName = mediaFile.name.split('/').pop();
      if (fileName && /\.(png|jpg|jpeg|gif|bmp|tiff|svg)$/i.test(fileName)) {
        const imageBuffer = mediaFile.asNodeBuffer();
        const base64 = imageBuffer.toString('base64');
        const ext = fileName.split('.').pop()?.toLowerCase();
        let mimeType = 'image/png';
        
        if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'gif') mimeType = 'image/gif';
        else if (ext === 'bmp') mimeType = 'image/bmp';
        else if (ext === 'svg') mimeType = 'image/svg+xml';
        
        images[fileName] = `data:${mimeType};base64,${base64}`;
      }
    }

    return {
      fileName: file.originalname,
      size: file.size,
      documentXml,
      placeholders,
      images,
      docxBase64: file.buffer.toString('base64'),
    };
  }

  async renderDocxPreview(payload: {
    docxBase64: string;
    data?: Record<string, unknown>;
    fileName?: string;
  }): Promise<{ html: string; docxBase64: string; fileName: string }> {
    if (!payload?.docxBase64) {
      throw new BadRequestException('docxBase64 is required');
    }

    try {
      const templateBuffer = Buffer.from(payload.docxBase64, 'base64');
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.setData(payload.data || {});

      doc.render();

      const filledBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const mammothResult = await mammoth.convertToHtml({ buffer: filledBuffer }, {
        convertImage: (mammoth.images as unknown as any).inline((element) => {
          return element.read('base64').then((imageBuffer) => ({
            src: `data:${element.contentType};base64,${imageBuffer}`,
          }));
        }),
      });

      const safeBaseName = payload.fileName && payload.fileName.trim().length > 0
        ? payload.fileName.replace(/[^a-zA-Z0-9-_\.]/g, '_')
        : `template_${Date.now()}.docx`;

      const fileName = safeBaseName.toLowerCase().endsWith('.docx')
        ? safeBaseName
        : `${safeBaseName}.docx`;

      return {
        html: mammothResult.value || '',
        docxBase64: filledBuffer.toString('base64'),
        fileName,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to render DOCX preview:', error);
      throw new BadRequestException('Failed to render template preview');
    }
  }

  async downloadRenderedDocx(payload: {
    docxBase64: string;
    fileName?: string;
  }): Promise<{ buffer: Buffer; fileName: string }> {
    if (!payload?.docxBase64) {
      throw new BadRequestException('docxBase64 is required');
    }

    const buffer = Buffer.from(payload.docxBase64, 'base64');

    const safeBaseName = payload.fileName && payload.fileName.trim().length > 0
      ? payload.fileName.replace(/[^a-zA-Z0-9-_\.]/g, '_')
      : `template_${Date.now()}.docx`;

    const fileName = safeBaseName.toLowerCase().endsWith('.docx')
      ? safeBaseName
      : `${safeBaseName}.docx`;

    return { buffer, fileName };
  }

  /**
   * Test utility: generate a DOCX from a JSON payload containing documentXml
   */
  async convertJsonToDocx(payload: {
    documentXml: string;
    fileName?: string;
  }): Promise<{ buffer: Buffer; fileName: string }> {
    if (!payload || !payload.documentXml) {
      throw new BadRequestException('documentXml is required');
    }

    const zip = new PizZip();

    zip.file('word/document.xml', payload.documentXml);

    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

    const buffer = zip.generate({ type: 'nodebuffer' });

    const safeBaseName = payload.fileName && payload.fileName.trim().length > 0
      ? payload.fileName.replace(/[^a-zA-Z0-9-_\.]/g, '_')
      : `template_${Date.now()}.docx`;

    const fileName = safeBaseName.toLowerCase().endsWith('.docx')
      ? safeBaseName
      : `${safeBaseName}.docx`;

    return { buffer, fileName };
  }

  /**
   * Get template status for all document types
   */
  async getTemplateStatus() {
    const templatesDir = path.join(process.cwd(), 'templates');
    
    // Ensure templates directory exists
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    const documentTypes = [
      { type: 'barangay_clearance', fileName: 'barangay_clearance.docx' },
      { type: 'certificate_of_residency', fileName: 'certificate_of_residency.docx' },
      { type: 'certificate_of_indigency', fileName: 'certificate_of_indigency.docx' },
    ];

    return documentTypes.map((docType) => {
      const templatePath = path.join(templatesDir, docType.fileName);
      const hasTemplate = fs.existsSync(templatePath);
      let updatedAt: Date | null = null;

      if (hasTemplate) {
        try {
          const stats = fs.statSync(templatePath);
          updatedAt = stats.mtime;
        } catch (error) {
          console.error(`Error reading template stats for ${docType.type}:`, error);
        }
      }

      return {
        type: docType.type,
        hasTemplate,
        updatedAt,
      };
    });
  }

  /**
   * Upload template for a specific document type
   */
  async uploadTemplate(file: Express.Multer.File, type: string) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    if (!file.originalname.toLowerCase().endsWith('.docx')) {
      throw new BadRequestException('Only .docx files are allowed');
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be 5MB or less');
    }

    // Validate document type
    const validTypes = ['barangay_clearance', 'certificate_of_residency', 'certificate_of_indigency'];
    if (!validTypes.includes(type)) {
      throw new BadRequestException('Invalid document type');
    }

    const templatesDir = path.join(process.cwd(), 'templates');
    
    // Ensure templates directory exists
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    // Save the template with the document type name
    const fileName = `${type}.docx`;
    const templatePath = path.join(templatesDir, fileName);
    
    fs.writeFileSync(templatePath, file.buffer);
    
    console.log(`✅ Template uploaded for ${type} at:`, templatePath);
  }

  /**
   * Convert HTML to PDF using html-pdf-node
   */
  async convertHtmlToPdf(html: string, fileName?: string): Promise<{ buffer: Buffer; fileName: string }> {
    try {
      const options = {
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      };

      const file = { content: html };
      const pdfBuffer = await htmlPdf.generatePdf(file, options);

      const safeBaseName = fileName && fileName.trim().length > 0
        ? fileName.replace(/[^a-zA-Z0-9-_\.]/g, '_')
        : `document_${Date.now()}.pdf`;

      const pdfFileName = safeBaseName.toLowerCase().endsWith('.pdf')
        ? safeBaseName
        : safeBaseName.replace(/\.(docx?)$/i, '.pdf') || `${safeBaseName}.pdf`;

      return { buffer: pdfBuffer, fileName: pdfFileName };
    } catch (error) {
      console.error('Failed to convert HTML to PDF:', error);
      throw new BadRequestException('Failed to convert document to PDF');
    }
  }

  /**
   * Render DOCX template and convert to PDF
   */
  async renderDocxToPdf(payload: {
    docxBase64: string;
    data?: Record<string, unknown>;
    fileName?: string;
  }): Promise<{ buffer: Buffer; fileName: string; html: string }> {
    if (!payload?.docxBase64) {
      throw new BadRequestException('docxBase64 is required');
    }

    try {
      // First render the DOCX with data
      const templateBuffer = Buffer.from(payload.docxBase64, 'base64');
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.setData(payload.data || {});
      doc.render();

      const filledBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Convert DOCX to HTML using mammoth
      const mammothResult = await mammoth.convertToHtml({ buffer: filledBuffer }, {
        convertImage: (mammoth.images as unknown as any).inline((element) => {
          return element.read('base64').then((imageBuffer) => ({
            src: `data:${element.contentType};base64,${imageBuffer}`,
          }));
        }),
      });

      const html = mammothResult.value || '';

      // Convert HTML to PDF
      const { buffer, fileName: pdfFileName } = await this.convertHtmlToPdf(
        html,
        payload.fileName,
      );

      return { buffer, fileName: pdfFileName, html };
    } catch (error) {
      console.error('Failed to render DOCX to PDF:', error);
      throw new BadRequestException('Failed to render template to PDF');
    }
  }
}
