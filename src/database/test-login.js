const axios = require('axios');

async function testLogin() {
  try {
    console.log('🧪 Testing Login API...\n');
    
    // Test with a sample user (you'll need to use your actual credentials)
    const loginData = {
      email: 'admin@example.com',  // Change this to your email
      password: 'Admin@123'         // Change this to your password
    };
    
    console.log('📤 Sending login request...');
    console.log('Email:', loginData.email);
    
    const response = await axios.post('http://localhost:3000/api/auth/login', loginData);
    
    console.log('\n✅ Login successful!');
    console.log('Response status:', response.status);
    console.log('\n📦 Response data:');
    console.log('- Access Token:', response.data.accessToken ? '✅ Present' : '❌ Missing');
    console.log('- Refresh Token:', response.data.refreshToken ? '✅ Present' : '❌ Missing');
    console.log('- User ID:', response.data.user?.id || 'N/A');
    console.log('- User Email:', response.data.user?.email || 'N/A');
    console.log('- User Name:', `${response.data.user?.firstName || ''} ${response.data.user?.lastName || ''}`);
    console.log('- User Role:', response.data.user?.role || 'N/A');
    
    console.log('\n🎉 Login API is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Login failed!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
      
      if (error.response.status === 500) {
        console.error('\n🔍 Internal Server Error - Check backend logs for details');
      } else if (error.response.status === 401) {
        console.error('\n🔍 Invalid credentials - Check email/password');
      }
    } else if (error.request) {
      console.error('No response from server');
      console.error('Is the backend running on http://localhost:3000?');
    } else {
      console.error('Error:', error.message);
    }
  }
}

console.log('='.repeat(60));
console.log('LOGIN API TEST');
console.log('='.repeat(60));
console.log('\n⚠️  NOTE: Update email and password in this script');
console.log('    to match your actual user credentials\n');

testLogin();
