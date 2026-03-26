const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool (better for performance than a single connection)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection right away
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('Make sure XAMPP/MySQL is running and your .env passwords are correct!');
    } else {
        console.log('✅ Connected to MySQL Database successfully!');
        connection.release(); // Return the connection to the pool
    }
});

// Export it so we can use it in other files (like our auth routes later)
module.exports = pool.promise();