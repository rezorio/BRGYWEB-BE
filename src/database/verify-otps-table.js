const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'db_brgy',
  });

  try {
    // Check if table exists
    const [tables] = await connection.query('SHOW TABLES LIKE "otps"');
    
    if (tables.length === 0) {
      console.log('❌ Table "otps" not found');
      return;
    }
    
    console.log('✅ Table "otps" exists');
    
    // Show columns
    const [columns] = await connection.query('DESCRIBE otps');
    console.log('\n📋 Table Structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    
    // Count records
    const [count] = await connection.query('SELECT COUNT(*) as total FROM otps');
    console.log(`\n📊 Total OTP records: ${count[0].total}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

verifyTable()
  .then(() => {
    console.log('\n✨ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
