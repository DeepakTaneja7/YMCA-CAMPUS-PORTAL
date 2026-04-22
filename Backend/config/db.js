const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool (better for performance than a single connection)
const pool = mysql.createPool({
    uri: process.env.DATABASE_URL, 
    ssl: {
        rejectUnauthorized: false
    }
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


module.exports = pool.promise();