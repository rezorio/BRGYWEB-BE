import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider } from '../sms.service';
import { getSmsConfig } from '../../config/sms.config';
import axios from 'axios';

@Injectable()
export class IprogSmsProvider implements SmsProvider {
  private readonly logger = new Logger(IprogSmsProvider.name);
  private readonly config = getSmsConfig();
  private readonly baseUrl = 'https://sms.iprogtech.com/api/v1/sms_messages';

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        throw new Error('IPROG SMS API token not configured');
      }

      // Format phone number for IPROG SMS (Philippines format)
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      const payload = {
        api_token: this.config.apiKey,
        phone_number: formattedNumber,
        message: message,
        sms_provider: 0 // Default provider (0, 1, or 2)
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data && response.data.status === 200) {
        this.logger.log(`SMS sent via IPROG SMS: ${response.data.message_id}`);
        return true;
      } else {
        this.logger.error(`IPROG SMS failed: ${JSON.stringify(response.data)}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`IPROG SMS error: ${error.message}`);
      return false;
    }
  }

  /**
   * Format phone number for IPROG SMS API
   * IPROG accepts both 09xxxxxxxx and 639xxxxxxxx formats
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove non-digit characters
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // If number starts with 0, keep it (PH format 09xxxxxxxx)
    if (cleanNumber.startsWith('0') && cleanNumber.length === 11) {
      return cleanNumber;
    }
    
    // If number starts with 63 and has 12 digits, remove 63 and add 0
    if (cleanNumber.startsWith('63') && cleanNumber.length === 12) {
      return '0' + cleanNumber.substring(2);
    }
    
    // If number is 10 digits (no leading 0), add 0
    if (cleanNumber.length === 10) {
      return '0' + cleanNumber;
    }
    
    // If number doesn't start with 0 and is 11 digits, assume it's already correct
    if (cleanNumber.length === 11 && !cleanNumber.startsWith('0')) {
      return '0' + cleanNumber;
    }
    
    // Return as-is if we can't format it
    return cleanNumber;
  }

  /**
   * Check SMS credits balance
   */
  async checkBalance(): Promise<number> {
    try {
      if (!this.config.apiKey) {
        throw new Error('IPROG SMS API token not configured');
      }

      const response = await axios.get(`https://sms.iprogtech.com/api/v1/account/sms_credits?api_token=${this.config.apiKey}`);
      
      if (response.data && response.data.status === 'success') {
        return response.data.data.load_balance || 0;
      }
      
      return 0;
    } catch (error) {
      this.logger.error(`Failed to check IPROG SMS balance: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId: string): Promise<string> {
    try {
      if (!this.config.apiKey) {
        throw new Error('IPROG SMS API token not configured');
      }

      const response = await axios.get(`https://sms.iprogtech.com/api/v1/sms_messages/status?api_token=${this.config.apiKey}&message_id=${messageId}`);
      
      if (response.data && response.data.status === 200) {
        return response.data.message_status || 'unknown';
      }
      
      return 'unknown';
    } catch (error) {
      this.logger.error(`Failed to get IPROG SMS status: ${error.message}`);
      return 'unknown';
    }
  }
}
