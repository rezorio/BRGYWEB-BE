/**
 * Node.js Script to Refresh Profile Completeness Status for All Users
 * This script calls the refresh endpoint for all users in the system
 * 
 * Usage: node refresh-all-profiles.js
 */

const axios = require('axios');

// Configuration - You can pass credentials as command line arguments
// Usage: node refresh-all-profiles.js [email] [password]
const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = process.argv[2] || 'admin@example.com';  // Change this or pass as argument
const ADMIN_PASSWORD = process.argv[3] || 'admin123';        // Change this or pass as argument

console.log(`Using credentials: ${ADMIN_EMAIL} / ${'*'.repeat(ADMIN_PASSWORD.length)}`);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  log('=== Profile Status Refresh Script ===', 'cyan');
  console.log('');

  try {
    // Step 1: Login as admin
    log('Step 1: Logging in as admin...', 'yellow');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    
    const token = loginResponse.data.accessToken;
    log('✓ Login successful!', 'green');
    console.log('');

    // Step 2: Get all users
    log('Step 2: Fetching all users...', 'yellow');
    const usersResponse = await axios.get(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const users = usersResponse.data;
    log(`✓ Found ${users.length} users`, 'green');
    console.log('');

    // Step 3: Refresh profile status for each user
    log('Step 3: Refreshing profile status for all users...', 'yellow');
    console.log('');

    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      const userId = user.id;
      const userEmail = user.email;

      log(`Processing: ${userEmail} (ID: ${userId})`, 'cyan');

      try {
        const refreshResponse = await axios.post(
          `${BASE_URL}/users/${userId}/refresh-profile-status`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const userData = refreshResponse.data;
        const status = userData.isProfileComplete ? 'COMPLETE' : 'INCOMPLETE';
        const statusColor = userData.isProfileComplete ? 'green' : 'yellow';

        log(`  ✓ Status: ${status}`, statusColor);
        log(`  - First Name: ${userData.firstName || 'N/A'}`, 'gray');
        log(`  - Last Name: ${userData.lastName || 'N/A'}`, 'gray');
        log(`  - Phone: ${userData.phoneNumber || 'N/A'}`, 'gray');
        log(`  - Street: ${userData.street || 'N/A'}`, 'gray');
        console.log('');

        successCount++;
      } catch (error) {
        log(`  ✗ Failed: ${error.message}`, 'red');
        console.log('');
        failCount++;
      }
    }

    // Summary
    log('=== Summary ===', 'cyan');
    console.log(`Total users: ${users.length}`);
    log(`Successfully refreshed: ${successCount}`, 'green');
    if (failCount > 0) {
      log(`Failed: ${failCount}`, 'red');
    }
    console.log('');
    log('Done!', 'green');

  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    if (error.response) {
      log(`Response: ${JSON.stringify(error.response.data)}`, 'red');
    }
    process.exit(1);
  }
}

// Run the script
main();
