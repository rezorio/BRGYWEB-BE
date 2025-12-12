import { Injectable, Logger, Module } from '@nestjs/common';
import { DocumentRequest, RequestStatus } from '../documents/entities/document-request.entity';
import { User } from '../auth/entities/user.entity';
import { getSmsConfig } from '../config/sms.config';
import { SemaphoreSmsProvider } from './providers/semaphore.provider';
import { TwilioSmsProvider } from './providers/twilio.provider';
import { IprogSmsProvider } from './providers/iprogsms.provider';

export interface SmsProvider {
  sendSms(phoneNumber: string, message: string): Promise<boolean>;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private provider: SmsProvider;
  private config = getSmsConfig();

  constructor() {
    this.logger.log('[SMS Service] Initializing with config:', {
      provider: this.config.provider,
      enabled: this.config.enabled,
      hasApiKey: !!this.config.apiKey,
    });
    this.initializeProvider();
  }

  /**
   * Initialize SMS provider based on configuration
   */
  private initializeProvider() {
    this.logger.log(`[SMS Service] Config enabled value: ${this.config.enabled} (type: ${typeof this.config.enabled})`);
    
    if (!this.config.enabled) {
      this.logger.warn('SMS service is disabled');
      this.provider = new DisabledSmsProvider();
      return;
    }

    switch (this.config.provider) {
      case 'semaphore':
        this.provider = new SemaphoreSmsProvider();
        this.logger.log('Using Semaphore SMS provider');
        break;
      case 'twilio':
        this.provider = new TwilioSmsProvider();
        this.logger.log('Using Twilio SMS provider');
        break;
      case 'iprogsms':
        this.provider = new IprogSmsProvider();
        this.logger.log('Using IPROG SMS provider');
        break;
      case 'mock':
      default:
        this.provider = new MockSmsProvider();
        this.logger.log('Using Mock SMS provider for development');
        break;
    }
  }

  /**
   * Set SMS provider (for dependency injection or testing)
   */
  setProvider(provider: SmsProvider) {
    this.provider = provider;
  }

  /**
   * Send SMS notification when user submits a document request
   */
  async sendRequestSubmittedNotification(request: DocumentRequest): Promise<boolean> {
    if (!this.config.enabled) {
      this.logger.debug('SMS disabled - skipping request submitted notification');
      return false;
    }

    try {
      const message = this.formatRequestSubmittedMessage(request);
      const success = await this.provider.sendSms(request.user.phoneNumber, message);
      
      if (success) {
        this.logger.log(`SMS sent for request submission: Request ID ${request.id}, Phone: ${request.user.phoneNumber}`);
      } else {
        this.logger.warn(`Failed to send SMS for request submission: Request ID ${request.id}`);
      }
      
      return success;
    } catch (error) {
      this.logger.error(`Error sending request submitted SMS: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Send SMS notification when request is approved
   */
  async sendRequestApprovedNotification(request: DocumentRequest): Promise<boolean> {
    if (!this.config.enabled) {
      this.logger.debug('SMS disabled - skipping request approved notification');
      return false;
    }

    try {
      const message = this.formatRequestApprovedMessage(request);
      const success = await this.provider.sendSms(request.user.phoneNumber, message);
      
      if (success) {
        this.logger.log(`SMS sent for request approval: Request ID ${request.id}, Phone: ${request.user.phoneNumber}`);
      } else {
        this.logger.warn(`Failed to send SMS for request approval: Request ID ${request.id}`);
      }
      
      return success;
    } catch (error) {
      this.logger.error(`Error sending request approved SMS: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Send SMS notification when request is denied
   */
  async sendRequestDeniedNotification(request: DocumentRequest): Promise<boolean> {
    if (!this.config.enabled) {
      this.logger.debug('SMS disabled - skipping request denied notification');
      return false;
    }

    try {
      const message = this.formatRequestDeniedMessage(request);
      const success = await this.provider.sendSms(request.user.phoneNumber, message);
      
      if (success) {
        this.logger.log(`SMS sent for request denial: Request ID ${request.id}, Phone: ${request.user.phoneNumber}`);
      } else {
        this.logger.warn(`Failed to send SMS for request denial: Request ID ${request.id}`);
      }
      
      return success;
    } catch (error) {
      this.logger.error(`Error sending request denied SMS: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Format message for request submitted notification
   */
  private formatRequestSubmittedMessage(request: DocumentRequest): string {
    const documentType = this.formatDocumentType(request.requestType);
    const userName = `${request.user.firstName} ${request.user.lastName}`;
    
    return `BRGY BAGONG BARRIO: Good day ${userName}! Your request for ${documentType} has been received and is now pending for approval. We will notify you once it's processed. Thank you!`;
  }

  /**
   * Format message for request approved notification
   */
  private formatRequestApprovedMessage(request: DocumentRequest): string {
    const documentType = this.formatDocumentType(request.requestType);
    const userName = `${request.user.firstName} ${request.user.lastName}`;
    const processedDate = request.processedAt ? request.processedAt.toLocaleDateString() : new Date().toLocaleDateString();
    
    return `BRGY BAGONG BARRIO: Good news ${userName}! Your request for ${documentType} has been APPROVED on ${processedDate}. You may now download your document. Thank you!`;
  }

  /**
   * Format message for request denied notification
   */
  private formatRequestDeniedMessage(request: DocumentRequest): string {
    const documentType = this.formatDocumentType(request.requestType);
    const userName = `${request.user.firstName} ${request.user.lastName}`;
    const reason = request.denialReason || 'Please visit the barangay hall for more information.';
    
    return `BRGY BAGONG BARRIO: ${userName}, your request for ${documentType} has been DENIED. Reason: ${reason}. Please contact the barangay hall for assistance. Thank you!`;
  }

  /**
   * Format document type for display
   */
  private formatDocumentType(type: string): string {
    switch (type) {
      case 'barangay_clearance':
        return 'Barangay Clearance';
      case 'certificate_of_residency':
        return 'Certificate of Residency';
      case 'certificate_of_indigency':
        return 'Certificate of Indigency';
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  /**
   * Validate phone number format
   */
  private validatePhoneNumber(phoneNumber: string): boolean {
    // Remove non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid PH mobile number (starts with 09 and has 11 digits)
    return /^09\d{9}$/.test(cleanNumber);
  }

  /**
   * Format phone number to PH format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove non-digit characters
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // If number starts with 0, keep it (PH format)
    if (cleanNumber.startsWith('0')) {
      return cleanNumber;
    }
    
    // If number is 10 digits (no leading 0), add 0
    if (cleanNumber.length === 10) {
      return '0' + cleanNumber;
    }
    
    return cleanNumber;
  }
}

/**
 * Mock SMS Provider for development/testing
 */
class MockSmsProvider implements SmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log the SMS that would be sent
    this.logger.log(`[MOCK SMS] To: ${phoneNumber}, Message: ${message}`);
    
    // Simulate 95% success rate
    return Math.random() > 0.05;
  }
}

/**
 * Disabled SMS Provider for when SMS is disabled
 */
class DisabledSmsProvider implements SmsProvider {
  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    return false;
  }
}

/**
 * OTP SMS Methods
 */
export class OTPSmsService {
  private readonly logger = new Logger('OTPSmsService');
  private smsService: SmsService;

  constructor() {
    this.smsService = new SmsService();
  }

  /**
   * Send OTP for registration
   */
  async sendRegistrationOTP(phoneNumber: string, code: string, firstName: string): Promise<boolean> {
    const message = `BRGY BAGONG BARRIO: Hi ${firstName}! Your registration OTP is ${code}. This code will expire in 10 minutes. Do not share this code with anyone.`;
    
    try {
      const result = await this.smsService.sendSms(phoneNumber, message);
      this.logger.log(`Registration OTP sent to ${phoneNumber}: ${result ? 'Success' : 'Failed'}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send registration OTP to ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Send OTP for password reset
   */
  async sendPasswordResetOTP(phoneNumber: string, code: string, firstName: string): Promise<boolean> {
    const message = `BRGY BAGONG BARRIO: Hi ${firstName}! Your password reset OTP is ${code}. This code will expire in 10 minutes. Do not share this code with anyone.`;
    
    try {
      const result = await this.smsService.sendSms(phoneNumber, message);
      this.logger.log(`Password reset OTP sent to ${phoneNumber}: ${result ? 'Success' : 'Failed'}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send password reset OTP to ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Send generic OTP
   */
  async sendOTP(phoneNumber: string, code: string, purpose: string = 'verification'): Promise<boolean> {
    const message = `BRGY BAGONG BARRIO: Your ${purpose} OTP is ${code}. This code will expire in 10 minutes. Do not share this code with anyone.`;
    
    try {
      const result = await this.smsService.sendSms(phoneNumber, message);
      this.logger.log(`OTP sent to ${phoneNumber} for ${purpose}: ${result ? 'Success' : 'Failed'}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${phoneNumber}:`, error);
      return false;
    }
  }
}
