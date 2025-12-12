/**
 * SMS Configuration Test Script
 * 
 * This script helps you verify your SMS configuration is set up correctly
 * Run this before testing the full application
 * 
 * Usage: node test-sms.js
 */

require('dotenv').config();

console.log('\n=== SMS Configuration Test ===\n');

// Check if SMS is enabled
const smsEnabled = process.env.SMS_ENABLED;
console.log(`✓ SMS_ENABLED: ${smsEnabled || 'NOT SET'}`);

if (smsEnabled !== 'true') {
  console.log('⚠️  WARNING: SMS is disabled. Set SMS_ENABLED=true in .env file');
}

// Check SMS provider
const smsProvider = process.env.SMS_PROVIDER || 'mock';
console.log(`✓ SMS_PROVIDER: ${smsProvider}`);

// Check provider-specific configuration
console.log('\n--- Provider Configuration ---');

switch (smsProvider) {
  case 'iprogsms':
    const iprogToken = process.env.IPROG_SMS_API_TOKEN;
    console.log(`✓ IPROG_SMS_API_TOKEN: ${iprogToken ? '✅ SET (hidden)' : '❌ NOT SET'}`);
    if (!iprogToken) {
      console.log('⚠️  ERROR: IPROG SMS requires IPROG_SMS_API_TOKEN in .env');
    }
    break;

  case 'semaphore':
    const semaphoreKey = process.env.SEMAPHORE_API_KEY;
    console.log(`✓ SEMAPHORE_API_KEY: ${semaphoreKey ? '✅ SET (hidden)' : '❌ NOT SET'}`);
    if (!semaphoreKey) {
      console.log('⚠️  ERROR: Semaphore requires SEMAPHORE_API_KEY in .env');
    }
    break;

  case 'twilio':
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    console.log(`✓ TWILIO_ACCOUNT_SID: ${twilioSid ? '✅ SET (hidden)' : '❌ NOT SET'}`);
    console.log(`✓ TWILIO_AUTH_TOKEN: ${twilioToken ? '✅ SET (hidden)' : '❌ NOT SET'}`);
    console.log(`✓ TWILIO_PHONE_NUMBER: ${twilioPhone || '❌ NOT SET'}`);
    if (!twilioSid || !twilioToken || !twilioPhone) {
      console.log('⚠️  ERROR: Twilio requires all three credentials in .env');
    }
    break;

  case 'mock':
    console.log('✓ Using MOCK provider (development mode)');
    console.log('  SMS messages will be logged to console instead of sent');
    break;

  default:
    console.log(`⚠️  WARNING: Unknown provider '${smsProvider}'`);
}

// Test phone number formatting
console.log('\n--- Phone Number Format Test ---');
const testNumbers = [
  '09171234567',
  '639171234567',
  '9171234567',
  '+63 917 123 4567',
  '123'
];

console.log('Testing phone number formats:');
testNumbers.forEach(number => {
  const cleaned = number.replace(/\D/g, '');
  let formatted = cleaned;
  
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    formatted = cleaned;
  } else if (cleaned.startsWith('63') && cleaned.length === 12) {
    formatted = '0' + cleaned.substring(2);
  } else if (cleaned.length === 10) {
    formatted = '0' + cleaned;
  }
  
  const isValid = /^09\d{9}$/.test(formatted);
  console.log(`  ${number} → ${formatted} ${isValid ? '✅' : '❌'}`);
});

// Summary
console.log('\n=== Configuration Summary ===\n');

if (smsEnabled === 'true') {
  console.log('✅ SMS notifications are ENABLED');
  
  if (smsProvider === 'mock') {
    console.log('✅ Using MOCK provider for testing');
    console.log('   → SMS will be logged to console');
    console.log('   → No API keys needed');
    console.log('\n📝 Next Steps:');
    console.log('   1. Start backend: npm run start:dev');
    console.log('   2. Submit a document request');
    console.log('   3. Check console for [MOCK SMS] log');
  } else {
    const hasCredentials = 
      (smsProvider === 'iprogsms' && process.env.IPROG_SMS_API_TOKEN) ||
      (smsProvider === 'semaphore' && process.env.SEMAPHORE_API_KEY) ||
      (smsProvider === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
    
    if (hasCredentials) {
      console.log(`✅ Using ${smsProvider.toUpperCase()} provider`);
      console.log('✅ API credentials configured');
      console.log('\n📝 Next Steps:');
      console.log('   1. Start backend: npm run start:dev');
      console.log('   2. Submit a document request with YOUR phone number');
      console.log('   3. Wait 1-2 minutes for SMS delivery');
      console.log('   4. Check your phone for the message');
    } else {
      console.log(`❌ ${smsProvider.toUpperCase()} provider selected but credentials missing`);
      console.log('\n📝 Next Steps:');
      console.log('   1. Add API credentials to .env file');
      console.log('   2. Or switch to mock provider: SMS_PROVIDER=mock');
    }
  }
} else {
  console.log('⚠️  SMS notifications are DISABLED');
  console.log('\n📝 To enable SMS:');
  console.log('   1. Set SMS_ENABLED=true in .env');
  console.log('   2. Set SMS_PROVIDER=mock (for testing)');
  console.log('   3. Restart backend');
}

console.log('\n=== Test Complete ===\n');
