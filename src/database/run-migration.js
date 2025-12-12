const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
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

    console.log('Connected to database successfully!');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '002_create_announcements_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration: 002_create_announcements_table.sql');
    
    // Execute the migration
    await connection.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('Announcements table has been created.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

runMigration();
