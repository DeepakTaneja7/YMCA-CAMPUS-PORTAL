const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db'); // Import your database connection
const router = express.Router();

// ── STUDENT REGISTRATION (POST /api/auth/register) ──
router.post('/register', async (req, res) => {
    try {
        // 1. Grab the data sent from the frontend form
        const { fullName, enrollment, email, department, year, phone, password } = req.body;

        // 2. Check if a student with this roll number or email already exists
        const [existingStudents] = await db.execute(
            'SELECT * FROM students WHERE enrollment_no = ? OR email = ?',
            [enrollment, email]
        );

        if (existingStudents.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'A student with this enrollment number or email is already registered.' 
            });
        }

        // 3. Scramble (hash) the password for security
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 4. Insert the new student into the MySQL database
        const insertQuery = `
            INSERT INTO students (enrollment_no, full_name, email, department, study_year, phone, password_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        await db.execute(insertQuery, [enrollment, fullName, email, department, year, phone, hashedPassword]);

        // 5. Send a success message back to the frontend
        res.status(201).json({ 
            success: true, 
            message: 'Student account created successfully!' 
        });

    } catch (error) {
        console.error('❌ Registration Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An internal server error occurred.' 
        });
    }
});


// ── STUDENT LOGIN (POST /api/auth/login) ──
router.post('/login', async (req, res) => {
    try {
        const { enrollment, password } = req.body;

        // 1. Search for the student in MySQL by enrollment number
        const [users] = await db.execute('SELECT * FROM students WHERE enrollment_no = ?', [enrollment]);

        // If no user is found
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid enrollment number or password.' });
        }

        const student = users[0];

        // 2. Compare the typed password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, student.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid enrollment number or password.' });
        }

        // 3. Success! Send back the student's basic info
        res.status(200).json({
            success: true,
            message: 'Login successful!',
            user: {
                enrollment: student.enrollment_no,
                name: student.full_name,
                dept: student.department,
                year: student.study_year
            }
        });

    } catch (error) {
        console.error('❌ Login API Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});



module.exports = router;