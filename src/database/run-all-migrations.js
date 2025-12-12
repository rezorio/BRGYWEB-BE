const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runAllMigrations() {
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

    console.log('Connected to MySQL database');

    // Add user profile fields
    console.log('\n📝 Running user profile fields migration...');
    const userFieldsMigration = path.join(__dirname, '../../migrations/add-user-profile-fields.sql');
    
    if (fs.existsSync(userFieldsMigration)) {
      const userFieldsSQL = fs.readFileSync(userFieldsMigration, 'utf8');
      
      try {
        await connection.query(userFieldsSQL);
        console.log('✅ User profile fields added successfully!');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('⚠️  Some user profile fields already exist, skipping...');
        } else {
          console.error('❌ Error adding user profile fields:', error.message);
        }
      }
    }

    // Verify tables and columns
    console.log('\n🔍 Verifying database structure...');
    
    // Check user table columns
    const [userColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME IN ('middle_name', 'phone_number', 'street', 'barangay', 'city')
    `, [process.env.DB_DATABASE || 'db_brgy']);
    
    console.log(`\n✅ User profile columns added: ${userColumns.length} fields`);
    
    console.log('\n🎉 All migrations completed successfully!');
    console.log('\n📌 Next steps:');
    console.log('   1. Start backend: npm run start:dev');
    console.log('   2. Start frontend: npm run dev');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

// Run all migrations
runAllMigrations().catch(console.error);
