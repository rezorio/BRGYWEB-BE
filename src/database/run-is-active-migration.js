const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: process.env.DB_DATABASE || 'db_brgy',
    multipleStatements: true
  });

  try {
    console.log('Connected to database');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../migrations/add-is-active-column.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration: add-is-active-column.sql');
    await connection.query(sql);
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
