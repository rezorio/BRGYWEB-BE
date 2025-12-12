const mysql = require('mysql2/promise');
require('dotenv').config();

async function dropDocumentTables() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'db_brgy',
    });

    console.log('✅ Connected to MySQL database');
    console.log('🗑️  Dropping document request tables...\n');

    // Drop document_requests table
    try {
      await connection.query('DROP TABLE IF EXISTS document_requests');
      console.log('✅ Dropped table: document_requests');
    } catch (error) {
      console.error('❌ Error dropping document_requests:', error.message);
    }

    // Drop document_templates table
    try {
      await connection.query('DROP TABLE IF EXISTS document_templates');
      console.log('✅ Dropped table: document_templates');
    } catch (error) {
      console.error('❌ Error dropping document_templates:', error.message);
    }

    // Verify tables are gone
    console.log('\n🔍 Verifying tables are removed...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('document_requests', 'document_templates')
    `, [process.env.DB_DATABASE || 'db_brgy']);

    if (tables.length === 0) {
      console.log('✅ All document request tables successfully removed!');
    } else {
      console.log('⚠️  Some tables still exist:', tables.map(t => t.TABLE_NAME).join(', '));
    }

    console.log('\n🎉 Database cleanup completed!');
    
  } catch (error) {
    console.error('❌ Failed to drop tables:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

// Run the script
dropDocumentTables().catch(console.error);
