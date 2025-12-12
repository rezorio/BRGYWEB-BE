const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'db_brgy',
    multipleStatements: true,
  });

  try {
    console.log('Connected to database');
    
    const migrationPath = path.join(__dirname, '../../migrations/create-login-attempts-table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration: create-login-attempts-table.sql');
    await connection.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Created:');
    console.log('  - login_attempts table');
    console.log('  - Added failed_login_attempts column to users table');
    console.log('  - Added account_locked_until column to users table');
    console.log('  - Added last_failed_login column to users table');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ All migrations completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
