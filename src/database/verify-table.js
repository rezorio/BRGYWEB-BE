const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'db_brgy',
    });

    console.log('Checking announcements table...\n');

    // Check if table exists
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'announcements'"
    );

    if (tables.length > 0) {
      console.log('✅ Announcements table exists!');
      
      // Show table structure
      const [columns] = await connection.query('DESCRIBE announcements');
      console.log('\nTable structure:');
      console.table(columns);
    } else {
      console.log('❌ Announcements table not found!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyTable();
