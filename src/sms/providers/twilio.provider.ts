import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider } from '../sms.service';
import { getSmsConfig } from '../../config/sms.config';

@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  private readonly logger = new Logger(TwilioSmsProvider.name);
  private readonly config = getSmsConfig();
  private client: any;

  constructor() {
    // Initialize Twilio client if credentials are available
    if (this.config.apiKey && this.config.apiSecret) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const twilio = require('twilio');
        this.client = twilio(this.config.apiKey, this.config.apiSecret);
      } catch (error) {
        this.logger.error('Failed to initialize Twilio client. Make sure twilio package is installed.');
      }
    }
  }

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      if (!this.client) {
        throw new Error('Twilio client not initialized');
      }

      if (!this.config.senderNumber) {
        throw new Error('Twilio sender number not configured');
      }

      // Format phone number to international format
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.config.senderNumber,
        to: formattedNumber
      });
      
      this.logger.log(`SMS sent via Twilio: SID ${result.sid}, Status: ${result.status}`);
      return true;
    } catch (error) {
      this.logger.error(`Twilio SMS error: ${error.message}`);
      return false;
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove non-digit characters
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // If number starts with 0, replace with +63 (international format)
    if (cleanNumber.startsWith('0')) {
      return '+63' + cleanNumber.substring(1);
    }
    
    // If number doesn't start with +63, add it
    if (!cleanNumber.startsWith('+63')) {
      return '+63' + cleanNumber;
    }
    
    return cleanNumber;
  }
}
