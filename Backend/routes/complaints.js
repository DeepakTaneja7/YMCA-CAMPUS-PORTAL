const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// 1. Authenticate with Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Configure Multer to upload to Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'jcbose_complaints',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  }
});
const upload = multer({ storage });

// SLA Hours by Priority
function getSlaHours(priority) {
  if (priority === 'High') return 4;
  if (priority === 'Medium') return 24;
  return 48;
}

// ── CREATE COMPLAINT (POST /api/complaints) ──
router.post('/', upload.array('photos', 5), async (req, res) => {
  try {
    const { enrollment, title, department, category, priority, building, room, description } = req.body;
    const photoUrls = req.files ? req.files.map(file => file.path) : [];
    const slaHours = getSlaHours(priority);

    const query = `
      INSERT INTO complaints
        (student_enrollment, title, department, category, priority, building, room_no, description, photos, due_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))
    `;

    const [result] = await db.execute(query, [
      enrollment,
      title,
      department,
      category,
      priority,
      building || '',
      room,
      description,
      JSON.stringify(photoUrls),
      slaHours
    ]);

    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('❌ Complaint Upload Error:', error);
    res.status(500).json({ success: false, message: 'Server error during upload' });
  }
});

// ── COMMUNITY FEED FOR ALL STUDENTS (GET /api/complaints/community?enrollment=...) ──
router.get('/community', async (req, res) => {
  try {
    const enrollment = req.query.enrollment || '';

    const query = `
      SELECT
        c.*,
        s.full_name AS studentName,
        (SELECT COUNT(*) FROM complaint_upvotes u WHERE u.complaint_id = c.id) AS upvote_count,
        (SELECT COUNT(*) FROM complaint_upvotes u WHERE u.complaint_id = c.id AND u.student_enrollment = ?) > 0 AS has_upvoted,
        (c.status IN ('Pending', 'In Progress') AND c.due_at IS NOT NULL AND c.due_at < NOW()) AS is_overdue,
        TIMESTAMPDIFF(MINUTE, NOW(), c.due_at) AS sla_minutes_remaining
      FROM complaints c
      LEFT JOIN students s ON c.student_enrollment = s.enrollment_no
      WHERE c.status != 'Rejected'
      ORDER BY is_overdue DESC, upvote_count DESC, c.created_at DESC
    `;

    const [complaints] = await db.execute(query, [enrollment]);
    res.status(200).json({ success: true, complaints });
  } catch (error) {
    console.error('❌ Community Feed Error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching community complaints.' });
  }
});

// ── TOGGLE UPVOTE (POST /api/complaints/:id/upvote) ──
router.post('/:id/upvote', async (req, res) => {
  try {
    const { id } = req.params;
    const { enrollment } = req.body;

    if (!enrollment) {
      return res.status(400).json({ success: false, message: 'Student enrollment is required.' });
    }

    const [complaints] = await db.execute(
      'SELECT id, status FROM complaints WHERE id = ?',
      [id]
    );

    if (complaints.length === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    if (complaints[0].status === 'Resolved' || complaints[0].status === 'Rejected') {
      return res.status(400).json({ success: false, message: 'Closed complaints cannot be upvoted.' });
    }

    const [existing] = await db.execute(
      'SELECT id FROM complaint_upvotes WHERE complaint_id = ? AND student_enrollment = ?',
      [id, enrollment]
    );

    let upvoted = false;
    if (existing.length > 0) {
      await db.execute(
        'DELETE FROM complaint_upvotes WHERE complaint_id = ? AND student_enrollment = ?',
        [id, enrollment]
      );
      upvoted = false;
    } else {
      await db.execute(
        'INSERT INTO complaint_upvotes (complaint_id, student_enrollment) VALUES (?, ?)',
        [id, enrollment]
      );
      upvoted = true;
    }

    const [[countRow]] = await db.execute(
      'SELECT COUNT(*) AS count FROM complaint_upvotes WHERE complaint_id = ?',
      [id]
    );

    res.status(200).json({
      success: true,
      upvoted,
      upvoteCount: Number(countRow.count)
    });
  } catch (error) {
    console.error('❌ Upvote Toggle Error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating upvote.' });
  }
});

// ── GET COMPLAINTS FOR A SPECIFIC STUDENT (GET /api/complaints/student/:enrollment) ──
router.get('/student/:enrollment', async (req, res) => {
  try {
    const { enrollment } = req.params;

    const query = `
      SELECT
        c.*,
        (SELECT COUNT(*) FROM complaint_upvotes u WHERE u.complaint_id = c.id) AS upvote_count,
        (c.status IN ('Pending', 'In Progress') AND c.due_at IS NOT NULL AND c.due_at < NOW()) AS is_overdue,
        TIMESTAMPDIFF(MINUTE, NOW(), c.due_at) AS sla_minutes_remaining
      FROM complaints c
      WHERE c.student_enrollment = ?
      ORDER BY c.created_at DESC
    `;

    const [complaints] = await db.execute(query, [enrollment]);
    res.status(200).json({ success: true, complaints });
  } catch (error) {
    console.error('❌ Student Complaints Error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching complaints.' });
  }
});

// ── GET COMPLAINTS BY DEPARTMENT FOR HOD (GET /api/complaints/department/:dept) ──
router.get('/department/:dept', async (req, res) => {
  try {
    const { dept } = req.params;

    const query = `
      SELECT
        c.*,
        s.full_name AS studentName,
        s.study_year AS studentYear,
        (SELECT COUNT(*) FROM complaint_upvotes u WHERE u.complaint_id = c.id) AS upvote_count,
        (c.status IN ('Pending', 'In Progress') AND c.due_at IS NOT NULL AND c.due_at < NOW()) AS is_overdue,
        TIMESTAMPDIFF(MINUTE, NOW(), c.due_at) AS sla_minutes_remaining
      FROM complaints c
      LEFT JOIN students s ON c.student_enrollment = s.enrollment_no
      WHERE c.department = ?
      ORDER BY
        is_overdue DESC,
        CASE c.priority WHEN 'High' THEN 3 WHEN 'Medium' THEN 2 ELSE 1 END DESC,
        upvote_count DESC,
        c.created_at DESC
    `;

    const [complaints] = await db.execute(query, [dept]);
    res.status(200).json({ success: true, complaints });
  } catch (error) {
    console.error('❌ Department Complaints Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching complaints.' });
  }
});

// ── UPDATE COMPLAINT STATUS OR REMARK (PUT /api/complaints/:id) ──
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    if (status) {
      if (status === 'Resolved') {
        await db.execute(
          'UPDATE complaints SET status = ?, resolved_at = NOW() WHERE id = ?',
          [status, id]
        );
      } else {
        await db.execute(
          'UPDATE complaints SET status = ?, resolved_at = NULL WHERE id = ?',
          [status, id]
        );
      }
    }

    if (remark !== undefined) {
      await db.execute('UPDATE complaints SET remark = ? WHERE id = ?', [remark, id]);
    }

    res.status(200).json({ success: true, message: 'Complaint updated successfully!' });
  } catch (error) {
    console.error('❌ Update Complaint Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating complaint.' });
  }
});

// ── STUDENT: DELETE COMPLAINT (DELETE /api/complaints/:id) ──
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { enrollment } = req.body;

    const [complaint] = await db.execute(
      'SELECT student_enrollment, status FROM complaints WHERE id = ?',
      [id]
    );

    if (complaint.length === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }
    if (complaint[0].student_enrollment !== enrollment) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }
    if (complaint[0].status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'You can only delete Pending complaints.' });
    }

    await db.execute('DELETE FROM complaints WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Complaint deleted successfully.' });
  } catch (error) {
    console.error('❌ Delete Error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting complaint.' });
  }
});

// ── STUDENT: UPDATE COMPLAINT DETAILS (PUT /api/complaints/student/update/:id) ──
router.put('/student/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { enrollment, title, department, category, priority, building, room, description } = req.body;

    const [complaint] = await db.execute(
      'SELECT student_enrollment, status FROM complaints WHERE id = ?',
      [id]
    );

    if (complaint.length === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }
    if (complaint[0].student_enrollment !== enrollment) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }
    if (complaint[0].status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'You can only edit Pending complaints.' });
    }

    const slaHours = getSlaHours(priority);

    const query = `
      UPDATE complaints
      SET
        title = ?,
        department = ?,
        category = ?,
        priority = ?,
        building = ?,
        room_no = ?,
        description = ?,
        due_at = DATE_ADD(created_at, INTERVAL ? HOUR)
      WHERE id = ?
    `;

    await db.execute(query, [
      title,
      department,
      category,
      priority,
      building || '',
      room,
      description,
      slaHours,
      id
    ]);

    res.status(200).json({ success: true, message: 'Complaint updated successfully.' });
  } catch (error) {
    console.error('❌ Student Update Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating complaint.' });
  }
});

module.exports = router;