const express = require('express');
const router = express.Router();
const { protect, patientOnly, doctorOnly } = require('../middleware/authMiddleware');
const {
  getPatientQueue,
  getRoomQueue,
  getAllRoomsQueue,
  checkInPatient,
  completeTest,
  getLiveStats,
} = require('../controllers/queueController');
const db = require('../config/db');

// ── Patient routes ──────────────────────────────────────────────────────────────
router.get('/my', protect, patientOnly, getPatientQueue);
router.post('/checkin', protect, checkInPatient);

// ── Doctor/Staff routes ─────────────────────────────────────────────────────────
router.get('/rooms', protect, getAllRoomsQueue);
router.get('/room/:room_id', protect, getRoomQueue);
router.get('/live-stats', protect, getLiveStats);
router.post('/complete-test', protect, completeTest);

// ── Start service for a patient (move queue status from waiting to in_progress) ─
router.patch('/:queue_id/start', protect, async (req, res) => {
  const { queue_id } = req.params;
  
  try {
    await db.query('START TRANSACTION');

    // Get queue entry
    const [queues] = await db.query('SELECT * FROM queue WHERE id = ?', [queue_id]);
    if (queues.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Queue entry not found' });
    }

    const queue = queues[0];

    // Mark any existing in_progress entries in this room as completed
    await db.query(
      `UPDATE queue SET status = 'completed' WHERE room_id = ? AND status = 'in_progress'`,
      [queue.room_id]
    );

    // Mark this queue entry as in_progress
    await db.query(
      `UPDATE queue SET status = 'in_progress' WHERE id = ?`,
      [queue_id]
    );

    // Update patient_test status
    await db.query(
      `UPDATE patient_tests SET status = 'in_progress' 
       WHERE appointment_id = ? AND room_id = ?`,
      [queue.appointment_id, queue.room_id]
    );

    // Update appointment status
    await db.query(
      `UPDATE appointments SET status = 'in_progress' WHERE id = ?`,
      [queue.appointment_id]
    );

    // Notify patient
    const [apps] = await db.query('SELECT patient_id FROM appointments WHERE id = ?', [queue.appointment_id]);
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
      [
        apps[0].patient_id,
        'Test Started 🔬',
        'Your test is now in progress. Please follow the technician instructions.',
        'appointment'
      ]
    );

    await db.query('COMMIT');
    res.json({ message: 'Service started successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Start service error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;