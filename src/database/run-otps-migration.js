const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'db_brgy',
    multipleStatements: true,
  });

  try {
    console.log('📦 Reading migration file...');
    const migrationPath = path.join(
      __dirname,
      '..',
      '..',
      'migrations',
      'create-otps-table.sql',
    );
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running OTPs table migration...');
    await connection.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('📋 Table created: otps');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
