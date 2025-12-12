const mysql = require('mysql2/promise');
require('dotenv').config();

async function testCreateAnnouncement() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'DB_brgy',
    });

    console.log('Connected to database successfully!');

    // Get an admin user ID
    const [users] = await connection.query(`
      SELECT u.id FROM users u 
      JOIN users_roles ur ON u.id = ur.userId 
      JOIN roles r ON ur.roleId = r.id 
      WHERE r.name = 'Admin' 
      LIMIT 1
    `);

    if (users.length === 0) {
      console.log('No admin user found');
      return;
    }

    const adminUserId = users[0].id;
    console.log('Using admin user ID:', adminUserId);

    // Try to insert a test announcement
    const testAnnouncement = {
      id: 'test-announcement-id',
      title: 'Test Announcement',
      description: 'This is a test announcement to verify database structure',
      date: '2025-11-13',
      isActive: true,
      createdBy: adminUserId
    };

    console.log('\n=== Inserting Test Announcement ===');
    await connection.query(
      'INSERT INTO announcements (id, title, description, date, isActive, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
      [testAnnouncement.id, testAnnouncement.title, testAnnouncement.description, testAnnouncement.date, testAnnouncement.isActive, testAnnouncement.createdBy]
    );

    console.log('✅ Test announcement created successfully!');

    // Verify the announcement was created
    const [announcements] = await connection.query('SELECT * FROM announcements WHERE id = ?', [testAnnouncement.id]);
    console.log('\n=== Created Announcement ===');
    console.table(announcements);

    // Clean up - delete the test announcement
    await connection.query('DELETE FROM announcements WHERE id = ?', [testAnnouncement.id]);
    console.log('\n✅ Test announcement cleaned up successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed.');
    }
  }
}

testCreateAnnouncement();
