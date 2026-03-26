const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Assuming your db.js is in Backend/config/

// POST route to save a new complaint
router.post('/', async (req, res) => {
    try {
        const { enrollment, title, department, category, priority, building, room, description } = req.body;

        const fullRoomNo = building ? `${building}, ${room}` : room;

        const query = `
            INSERT INTO complaints 
            (student_enrollment, department, room_no, category, priority, title, description) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        await db.execute(query, [enrollment, department, fullRoomNo, category, priority, title, description]);

        res.status(201).json({ success: true, message: 'Complaint submitted successfully!' });
    } catch (error) {
        console.error('❌ Database error:', error);
        res.status(500).json({ success: false, message: 'Server error while saving complaint.' });
    }
});

// ── GET route to fetch complaints for a specific student ──
router.get('/student/:enrollment', async (req, res) => {
    try {
        const { enrollment } = req.params;

        // Ask MySQL for all complaints belonging to this student, sorted by newest first
        const [complaints] = await db.execute(
            'SELECT * FROM complaints WHERE student_enrollment = ? ORDER BY created_at DESC', 
            [enrollment]
        );

        res.status(200).json({ success: true, complaints: complaints });
        
    } catch (error) {
        console.error('❌ Database error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching complaints.' });
    }
});

module.exports = router;