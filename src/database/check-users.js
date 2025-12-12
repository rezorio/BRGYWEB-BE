const mysql = require('mysql2/promise');

async function checkUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: process.env.DB_DATABASE || 'db_brgy',
  });

  try {
    console.log('Checking users in database...\n');
    
    const [users] = await connection.query('SELECT id, email, firstName, lastName, isActive FROM users');
    
    if (users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('\nYou need to register a user first.');
    } else {
      console.log(`✅ Found ${users.length} user(s):\n`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Name: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
        console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
        console.log(`   ID: ${user.id}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkUsers();
