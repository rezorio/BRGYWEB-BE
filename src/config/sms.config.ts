export interface SmsConfig {
  provider: 'twilio' | 'semaphore' | 'iprogsms' | 'custom' | 'mock';
  apiKey?: string;
  apiSecret?: string;
  senderNumber?: string;
  baseUrl?: string;
  enabled: boolean;
}

export const defaultSmsConfig: SmsConfig = {
  provider: 'mock',
  enabled: true,
};

/**
 * Get SMS configuration based on provider
 */
export function getSmsConfig(): SmsConfig {
  console.log('[SMS Config] Environment check:', {
    SMS_PROVIDER: process.env.SMS_PROVIDER,
    SMS_ENABLED: process.env.SMS_ENABLED,
    SMS_ENABLED_TYPE: typeof process.env.SMS_ENABLED,
    IPROG_SMS_API_TOKEN: process.env.IPROG_SMS_API_TOKEN ? 'SET' : 'NOT SET',
  });
 
  const provider = process.env.SMS_PROVIDER || 'mock';
  const isEnabled = process.env.SMS_ENABLED === 'true';
  
  console.log('[SMS Config] Computed isEnabled:', isEnabled);
  
  let config: SmsConfig;
  
  switch (provider) {
    case 'semaphore':
      config = {
        provider: 'semaphore',
        apiKey: process.env.SEMAPHORE_API_KEY,
        baseUrl: 'https://api.semaphore.co/api/v4/messages',
        enabled: isEnabled,
      };
      break;
    case 'twilio':
      config = {
        provider: 'twilio',
        apiKey: process.env.TWILIO_ACCOUNT_SID,
        apiSecret: process.env.TWILIO_AUTH_TOKEN,
        senderNumber: process.env.TWILIO_PHONE_NUMBER,
        enabled: isEnabled,
      };
      break;
    case 'iprogsms':
      config = {
        provider: 'iprogsms',
        apiKey: process.env.IPROG_SMS_API_TOKEN,
        enabled: isEnabled,
      };
      break;
    case 'custom':
      config = {
        provider: 'custom',
        baseUrl: process.env.CUSTOM_SMS_BASE_URL,
        apiKey: process.env.CUSTOM_SMS_API_KEY,
        enabled: isEnabled,
      };
      break;
    default:
      config = defaultSmsConfig;
      break;
  }
  
  console.log('[SMS Config] Final config:', {
    provider: config.provider,
    enabled: config.enabled,
    hasApiKey: !!config.apiKey,
  });
  
  return config;
}
