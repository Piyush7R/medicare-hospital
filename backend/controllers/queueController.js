const db = require('../config/db');

// ── Get patient queue for a specific patient ───────────────────────────────────
const getPatientQueue = async (req, res) => {
  const patient_id = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT 
        q.*,
        tr.name as room_name,
        a.token_number,
        a.appointment_date,
        pt.status as test_status
       FROM queue q
       JOIN test_rooms tr ON q.room_id = tr.id
       JOIN appointments a ON q.appointment_id = a.id
       LEFT JOIN patient_tests pt ON q.appointment_id = pt.appointment_id AND q.room_id = pt.room_id
       WHERE a.patient_id = ?
       ORDER BY q.created_at DESC
       LIMIT 1`,
      [patient_id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Get queue for a specific room ──────────────────────────────────────────────
const getRoomQueue = async (req, res) => {
  const { room_id } = req.params;
  try {
    // Get current patient (in_progress)
    const [current] = await db.query(
      `SELECT 
        q.id as queue_id,
        q.appointment_id,
        q.position,
        q.status as queue_status,
        a.token_number,
        a.test_package_id,
        u.name as patient_name,
        u.phone as patient_phone,
        p.age,
        p.gender,
        p.blood_group,
        tp.name as package_name,
        pt.status as test_status,
        pt.id as patient_test_id,
        pt.sequence_order,
        tr.name as room_name,
        tr.test_type
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       JOIN users u ON a.patient_id = u.id
       LEFT JOIN patients p ON u.id = p.user_id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       LEFT JOIN patient_tests pt ON q.appointment_id = pt.appointment_id AND q.room_id = pt.room_id
       LEFT JOIN test_rooms tr ON q.room_id = tr.id
       WHERE q.room_id = ? AND q.status = 'in_progress'
       ORDER BY q.position
       LIMIT 1`,
      [room_id]
    );

    // Get waiting queue - ONLY patients whose CURRENT test is in this room
    const [waiting] = await db.query(
      `SELECT 
        q.id as queue_id,
        q.appointment_id,
        q.position,
        q.status as queue_status,
        a.token_number,
        a.test_package_id,
        u.name as patient_name,
        u.phone as patient_phone,
        p.age,
        p.gender,
        p.blood_group,
        tp.name as package_name,
        pt.status as test_status,
        pt.id as patient_test_id,
        pt.sequence_order,
        tr.name as room_name,
        tr.test_type
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       JOIN users u ON a.patient_id = u.id
       LEFT JOIN patients p ON u.id = p.user_id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       LEFT JOIN patient_tests pt ON q.appointment_id = pt.appointment_id AND q.room_id = pt.room_id
       LEFT JOIN test_rooms tr ON q.room_id = tr.id
       WHERE q.room_id = ? 
         AND q.status = 'waiting'
         AND pt.status IN ('in_queue', 'in_progress')
       ORDER BY q.position`,
      [room_id]
    );

    res.json({
      current: current[0] || null,
      waiting: waiting
    });
  } catch (err) {
    console.error('Get room queue error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Get all rooms with queue counts ────────────────────────────────────────────
const getAllRoomsQueue = async (req, res) => {
  try {
    const [rooms] = await db.query(
      `SELECT 
        tr.id as room_id,
        tr.name as room_name,
        tr.test_type,
        COUNT(CASE WHEN q.status = 'waiting' AND pt.status IN ('in_queue', 'in_progress') THEN 1 END) as waiting_count,
        COUNT(CASE WHEN q.status = 'in_progress' THEN 1 END) as in_progress_count
       FROM test_rooms tr
       LEFT JOIN queue q ON tr.id = q.room_id AND q.status IN ('waiting', 'in_progress')
       LEFT JOIN patient_tests pt ON q.appointment_id = pt.appointment_id AND q.room_id = pt.room_id
       WHERE tr.status = 'active'
       GROUP BY tr.id, tr.name, tr.test_type
       ORDER BY tr.id`
    );
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Check in patient (move to in_queue status) ─────────────────────────────────
const checkInPatient = async (req, res) => {
  const { appointment_id } = req.body;
  try {
    await db.query('START TRANSACTION');

    // Update appointment status
    await db.query(
      `UPDATE appointments SET status = 'checked_in' WHERE id = ?`,
      [appointment_id]
    );

    // Get first test and mark as in_queue
    const [firstTest] = await db.query(
      `SELECT pt.*, tr.name as room_name 
       FROM patient_tests pt
       LEFT JOIN test_rooms tr ON pt.room_id = tr.id
       WHERE pt.appointment_id = ? AND pt.sequence_order = 1`,
      [appointment_id]
    );

    if (firstTest.length > 0) {
      await db.query(
        `UPDATE patient_tests SET status = 'in_queue' WHERE id = ?`,
        [firstTest[0].id]
      );

      // Add to queue if not already there
      const [existingQueue] = await db.query(
        `SELECT id FROM queue WHERE appointment_id = ? AND room_id = ?`,
        [appointment_id, firstTest[0].room_id]
      );

      if (existingQueue.length === 0) {
        const [[{ max_pos }]] = await db.query(
          `SELECT COALESCE(MAX(position), 0) as max_pos FROM queue WHERE room_id = ?`,
          [firstTest[0].room_id]
        );

        await db.query(
          `INSERT INTO queue (appointment_id, room_id, position, status) VALUES (?, ?, ?, 'waiting')`,
          [appointment_id, firstTest[0].room_id, max_pos + 1]
        );
      }
    }

    await db.query('COMMIT');
    res.json({ message: 'Patient checked in successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Check-in error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Complete current test and move to next ─────────────────────────────────────
// ── Complete current test and move to next ─────────────────────────────────────
const completeTest = async (req, res) => {
  const { appointment_id, patient_test_id } = req.body;
  
  try {
    await db.query('START TRANSACTION');

    let currentTest;
    
    if (patient_test_id) {
      const [tests] = await db.query('SELECT * FROM patient_tests WHERE id = ?', [patient_test_id]);
      currentTest = tests[0];
    } else if (appointment_id) {
      const [tests] = await db.query(
        `SELECT * FROM patient_tests 
         WHERE appointment_id = ? AND status IN ('in_progress', 'in_queue') 
         ORDER BY sequence_order LIMIT 1`,
        [appointment_id]
      );
      currentTest = tests[0];
    }

    if (!currentTest) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'No active test found for this appointment' });
    }

    // Mark current test as completed
    await db.query(
      `UPDATE patient_tests SET status = 'completed', completed_at = NOW() WHERE id = ?`,
      [currentTest.id]
    );

    // Mark current queue entry as completed
    await db.query(
      `UPDATE queue SET status = 'completed' WHERE appointment_id = ? AND room_id = ?`,
      [currentTest.appointment_id, currentTest.room_id]
    );

    // Find next test
    const [nextTests] = await db.query(
      `SELECT pt.*, tr.name as room_name 
       FROM patient_tests pt
       LEFT JOIN test_rooms tr ON pt.room_id = tr.id
       WHERE pt.appointment_id = ? AND pt.sequence_order > ? AND pt.status = 'pending'
       ORDER BY pt.sequence_order LIMIT 1`,
      [currentTest.appointment_id, currentTest.sequence_order]
    );

    if (nextTests.length > 0) {
      const nextTest = nextTests[0];

      // Mark next test as in_queue
      await db.query(
        `UPDATE patient_tests SET status = 'in_queue' WHERE id = ?`,
        [nextTest.id]
      );

      // ✅ CHECK if queue entry already exists before inserting
      const [existingQueue] = await db.query(
        `SELECT id FROM queue WHERE appointment_id = ? AND room_id = ? AND status != 'completed'`,
        [currentTest.appointment_id, nextTest.room_id]
      );

      if (existingQueue.length === 0) {
        // Only insert if no existing queue entry
        const [[{ max_pos }]] = await db.query(
          `SELECT COALESCE(MAX(position), 0) as max_pos FROM queue WHERE room_id = ? AND status != 'completed'`,
          [nextTest.room_id]
        );

        await db.query(
          `INSERT INTO queue (appointment_id, room_id, position, status) VALUES (?, ?, ?, 'waiting')`,
          [currentTest.appointment_id, nextTest.room_id, max_pos + 1]
        );
      }

      // Update appointment status
      await db.query(
        `UPDATE appointments SET status = 'in_progress' WHERE id = ?`,
        [currentTest.appointment_id]
      );

      // Notify patient
      const [apps] = await db.query('SELECT patient_id FROM appointments WHERE id = ?', [currentTest.appointment_id]);
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
        [
          apps[0].patient_id,
          'Next Test Ready 🔔',
          `Please proceed to ${nextTest.room_name} for your next test.`,
          'appointment'
        ]
      );

      await db.query('COMMIT');
      res.json({ message: `Test completed. Patient moved to ${nextTest.room_name}` });
    } else {
      // All tests completed
      await db.query(
        `UPDATE appointments SET status = 'completed' WHERE id = ?`,
        [currentTest.appointment_id]
      );

      const [apps] = await db.query('SELECT patient_id FROM appointments WHERE id = ?', [currentTest.appointment_id]);
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
        [
          apps[0].patient_id,
          'All Tests Completed ✅',
          'All your tests are complete. Your report will be available soon.',
          'appointment'
        ]
      );

      await db.query('COMMIT');
      res.json({ message: 'All tests completed successfully!' });
    }
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Complete test error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Get live statistics ─────────────────────────────────────────────────────────
const getLiveStats = async (req, res) => {
  try {
    const [[stats]] = await db.query(`
      SELECT 
        COUNT(CASE WHEN q.status = 'waiting' THEN 1 END) as total_waiting,
        COUNT(CASE WHEN q.status = 'in_progress' THEN 1 END) as total_in_progress,
        COUNT(DISTINCT q.appointment_id) as total_patients
      FROM queue q
      WHERE q.status IN ('waiting', 'in_progress')
    `);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  getPatientQueue,
  getRoomQueue,
  getAllRoomsQueue,
  checkInPatient,
  completeTest,
  getLiveStats,
};