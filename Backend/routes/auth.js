const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db'); // Import your database connection
const router = express.Router();

// --- The Magic Password Rule ---
// Must contain 8+ characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// ── STUDENT REGISTRATION (POST /api/auth/register) ──
router.post('/register', async (req, res) => {
    try {
        // 1. Grab the data sent from the frontend form
        const { fullName, enrollment, email, department, year, phone, password } = req.body;

        // --- STRICT PASSWORD VALIDATION ---
        if (!password || !passwordRegex.test(password)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.' 
            });
        }

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

// ── HOD REGISTRATION (POST /api/auth/hod/register) ──
router.post('/hod/register', async (req, res) => {
    try {
        const { empId, name, email, department, phone, password } = req.body;

        // --- STRICT PASSWORD VALIDATION ---
        if (!password || !passwordRegex.test(password)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.' 
            });
        }

        // 2. We also check if the department already has an HOD (because of your UNIQUE rule)
        const [existing] = await db.execute(
            'SELECT * FROM hods WHERE email = ? OR emp_id = ? OR department = ?', 
            [email, empId, department]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'An HOD with this Email, Employee ID, or Department already exists.' 
            });
        }

        // 3. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Save to database 
        const query = 'INSERT INTO hods (emp_id, full_name, email, department, phone, password_hash) VALUES (?, ?, ?, ?, ?, ?)';
        await db.execute(query, [empId, name, email, department, phone, hashedPassword]);

        res.status(201).json({ success: true, message: 'HOD registered successfully!' });
    } catch (error) {
        console.error('❌ HOD Registration Error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

// ── HOD LOGIN (POST /api/auth/hod/login) ──
router.post('/hod/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find the HOD by email in your MySQL 'hods' table
        const [users] = await db.execute('SELECT * FROM hods WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const hod = users[0];

        // 2. Compare the typed password with the hashed one in the DB
        const isMatch = await bcrypt.compare(password, hod.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // 3. Success! Send back the HOD data (excluding the password)
        res.status(200).json({
            success: true,
            user: {
                empId: hod.emp_id,
                name: hod.full_name,
                email: hod.email,
                dept: hod.department
            }
        });
    } catch (error) {
        console.error('❌ HOD Login Error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

module.exports = router;