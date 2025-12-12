const mysql = require('mysql2/promise');
require('dotenv').config();

async function testAnnouncementsTable() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'DB_brgy',
    });

    console.log('Connected to database successfully!');

    // Check table structure
    console.log('\n=== Announcements Table Structure ===');
    const [columns] = await connection.query('DESCRIBE announcements');
    console.table(columns);

    // Check if there are any announcements
    console.log('\n=== Current Announcements ===');
    const [announcements] = await connection.query('SELECT * FROM announcements');
    console.log(`Found ${announcements.length} announcements:`);
    if (announcements.length > 0) {
      console.table(announcements);
    }

    // Check roles table
    console.log('\n=== Available Roles ===');
    const [roles] = await connection.query('SELECT * FROM roles');
    console.table(roles);

    // Check users and their roles
    console.log('\n=== Users and Roles ===');
    const [users] = await connection.query(`
      SELECT u.id, u.email, u.firstName, u.lastName, r.name as role 
      FROM users u 
      LEFT JOIN users_roles ur ON u.id = ur.userId 
      LEFT JOIN roles r ON ur.roleId = r.id
    `);
    console.table(users);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed.');
    }
  }
}

testAnnouncementsTable();
