const mysql = require('mysql2/promise');

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: process.env.DB_DATABASE || 'db_brgy',
  });

  try {
    console.log('Checking users table schema...\n');
    
    const [columns] = await connection.query('DESCRIBE users');
    
    console.log('Current columns in users table:');
    console.log('================================');
    columns.forEach(col => {
      console.log(`${col.Field.padEnd(30)} ${col.Type.padEnd(20)} ${col.Null} ${col.Key} ${col.Default}`);
    });
    
    console.log('\n================================');
    console.log(`Total columns: ${columns.length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkSchema();
