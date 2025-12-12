import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider } from '../sms.service';
import { getSmsConfig } from '../../config/sms.config';
import axios from 'axios';

@Injectable()
export class SemaphoreSmsProvider implements SmsProvider {
  private readonly logger = new Logger(SemaphoreSmsProvider.name);
  private readonly config = getSmsConfig();

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        throw new Error('Semaphore API key not configured');
      }

      if (!this.config.baseUrl) {
        throw new Error('Semaphore base URL not configured');
      }

      // Format phone number for Semaphore (Philippines format)
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      const payload = {
        apikey: this.config.apiKey,
        number: formattedNumber,
        message: message,
        sendername: 'BRGYWEB' // You can customize this
      };

      const response = await axios.post(this.config.baseUrl, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.data && response.data[0] && response.data[0].status === 'Success') {
        this.logger.log(`SMS sent via Semaphore: ${response.data[0].message_id}`);
        return true;
      } else {
        this.logger.error(`Semaphore SMS failed: ${JSON.stringify(response.data)}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Semaphore SMS error: ${error.message}`);
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
