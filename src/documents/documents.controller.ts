import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  UseGuards, 
  Request,
  Res,
  HttpStatus,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { CreateDocumentRequestDto } from './dto/create-request.dto';
import { CreateAdminDocumentRequestDto } from './dto/create-admin-request.dto';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Create a new document request (requires authenticated user with complete profile)
   */
  @Post('request')
  @UseGuards(JwtAuthGuard)
  async createRequest(@Request() req, @Body() createDto: CreateDocumentRequestDto) {
    const userId = req.user.userId;
    const request = await this.documentsService.createRequest(userId, createDto);
    return {
      success: true,
      message: 'Document request submitted successfully',
      data: request
    };
  }

  /**
   * Admin: Manually create a document request for a user
   */
  @Post('admin/requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async createAdminRequest(@Body() createDto: CreateAdminDocumentRequestDto) {
    const request = await this.documentsService.createAdminRequest(createDto);
    return {
      success: true,
      message: 'Document request created successfully',
      data: request
    };
  }

  /**
   * Get user's own requests
   */
  @Get('my-requests')
  @UseGuards(JwtAuthGuard)
  async getMyRequests(@Request() req) {
    const userId = req.user.userId;
    const requests = await this.documentsService.getUserRequests(userId);
    return {
      success: true,
      data: requests
    };
  }

  /**
   * Get user's pending request (if any)
   */
  @Get('my-pending-request')
  @UseGuards(JwtAuthGuard)
  async getMyPendingRequest(@Request() req) {
    const userId = req.user.userId;
    const request = await this.documentsService.getUserPendingRequest(userId);
    return {
      success: true,
      data: request
    };
  }

  /**
   * Get all user's pending requests
   */
  @Get('my-pending-requests')
  @UseGuards(JwtAuthGuard)
  async getMyPendingRequests(@Request() req) {
    const userId = req.user.userId;
    const requests = await this.documentsService.getUserPendingRequests(userId);
    return {
      success: true,
      data: requests
    };
  }

  /**
   * Cancel a pending request
   */
  @Post('cancel/:id')
  @UseGuards(JwtAuthGuard)
  async cancelRequest(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user.userId;
    const result = await this.documentsService.cancelRequest(id, userId);
    return result;
  }

  /**
   * Admin: Get all pending requests
   */
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async getPendingRequests() {
    const requests = await this.documentsService.getPendingRequests();
    return {
      success: true,
      data: requests
    };
  }

  /**
   * Admin: Get all requests
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async getAllRequests() {
    const requests = await this.documentsService.getAllRequests();
    return {
      success: true,
      data: requests
    };
  }

  /**
   * Admin: Get template status for all document types
   */
  @Get('admin/templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async getTemplateStatus() {
    const templates = await this.documentsService.getTemplateStatus();
    return {
      success: true,
      data: templates
    };
  }

  /**
   * Admin: Upload template for a specific document type
   */
  @Post('admin/templates/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @UseInterceptors(FileInterceptor('template'))
  async uploadTemplate(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
  ) {
    await this.documentsService.uploadTemplate(file, type);
    return {
      success: true,
      message: 'Template uploaded successfully'
    };
  }

  /**
   * Admin: Approve request and generate document (MAIN APPROVAL ROUTE)
   */
  @Post('admin/requests/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async approveRequest(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() approveDto: ApproveRequestDto,
    @Res() res: Response
  ) {
    const adminId = req.user.userId;
    const result = await this.documentsService.approveRequest(id, adminId, approveDto);
    
    // Send the document as downloadable response
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
    });
    
    res.send(result.buffer);
  }

  /**
   * Admin: Deny request
   */
  @Post('admin/requests/:id/deny')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async denyRequest(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body('denialReason') denialReason: string
  ) {
    const adminId = req.user.userId;
    const request = await this.documentsService.denyRequest(id, adminId, denialReason);
    return {
      success: true,
      message: 'Request denied successfully',
      data: request
    };
  }

  /**
   * Download a generated document (for approved requests)
   */
  @Get('download/:id')
  @UseGuards(JwtAuthGuard)
  async downloadDocument(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Res() res: Response
  ) {
    const userId = req.user.userId;
    const { buffer, fileName } = await this.documentsService.getGeneratedDocument(id, userId);
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });
    
    res.send(buffer);
  }

  /**
   * TEST: Upload a DOCX template and convert it to JSON
   */
  @Post('test/upload-template')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @UseInterceptors(FileInterceptor('template'))
  async uploadTemplateForTest(@UploadedFile() file: Express.Multer.File) {
    const result = await this.documentsService.convertDocxToJson(file);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * TEST: Convert JSON (with documentXml) back into a DOCX file
   */
  @Post('test/generate-from-json')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async generateFromJson(
    @Body() body: { documentXml: string; fileName?: string },
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.documentsService.convertJsonToDocx(body);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    res.send(buffer);
  }

  /**
   * TEST: Render a DOCX template with sample data and return HTML preview + DOCX base64
   */
  @Post('test/render-preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async renderTemplatePreview(@Body() body: { docxBase64: string; data?: Record<string, unknown>; fileName?: string }) {
    const result = await this.documentsService.renderDocxPreview(body);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * TEST: Download a rendered DOCX that was previously generated/previewed
   */
  @Post('test/download-rendered')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async downloadRenderedDocx(
    @Body() body: { docxBase64: string; fileName?: string },
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.documentsService.downloadRenderedDocx(body);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    res.send(buffer);
  }

  /**
   * TEST: Render DOCX template to PDF with sample data
   */
  @Post('test/render-pdf')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async renderTemplateToPdf(
    @Body() body: { docxBase64: string; data?: Record<string, unknown>; fileName?: string },
  ) {
    const result = await this.documentsService.renderDocxToPdf(body);
    return {
      success: true,
      data: {
        html: result.html,
        fileName: result.fileName,
        pdfBase64: result.buffer.toString('base64'),
      },
    };
  }

  /**
   * TEST: Download PDF from base64
   */
  @Post('test/download-pdf')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async downloadPdf(
    @Body() body: { pdfBase64: string; fileName?: string },
    @Res() res: Response,
  ) {
    if (!body?.pdfBase64) {
      throw new BadRequestException('pdfBase64 is required');
    }

    const buffer = Buffer.from(body.pdfBase64, 'base64');
    const fileName = body.fileName || 'document.pdf';

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    res.send(buffer);
  }
}
