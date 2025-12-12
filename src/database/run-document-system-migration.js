const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runDocumentSystemMigration() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'db_brgy',
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL database');
    
    // Run the migration
    const migrationPath = path.join(__dirname, '../../migrations/create-document-system.sql');
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Running document system migration...');
    await connection.query(sql);
    console.log('✅ Migration completed successfully!');
    
    // Verify tables created
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'document_requests'
    `, [process.env.DB_DATABASE || 'db_brgy']);
    
    if (tables.length > 0) {
      console.log('✅ Document requests table created');
      
      // Check columns
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'document_requests'
      `, [process.env.DB_DATABASE || 'db_brgy']);
      
      console.log(`✅ Table has ${columns.length} columns`);
    }
    
    // Check user table updates
    const [userColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME IN ('street_number', 'street_name', 'birthday', 'is_profile_completed')
    `, [process.env.DB_DATABASE || 'db_brgy']);
    
    console.log(`✅ User table updated with ${userColumns.length} new columns`);
    
    console.log('\n🎉 Document generation system setup complete!');
    console.log('\n📌 Next steps:');
    console.log('   1. Restart the backend: npm run start:dev');
    console.log('   2. Users must complete their profiles (firstName, lastName, birthday, streetNumber, streetName)');
    console.log('   3. Access the API at: http://localhost:3000/documents');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('ℹ️  Table already exists. Migration may have already been run.');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

// Run the migration
runDocumentSystemMigration().catch(console.error);
