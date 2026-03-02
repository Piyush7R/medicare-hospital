const db = require('../config/db');

// Get queue status for a patient's appointment
const getPatientQueue = async (req, res) => {
  const patient_id = req.user.id;
  try {
    const [appointments] = await db.query(
      `SELECT a.*, tp.name as package_name 
       FROM appointments a 
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       WHERE a.patient_id = ? AND a.appointment_date = CURDATE() 
       AND a.status IN ('checked_in','in_progress')
       ORDER BY a.appointment_date DESC LIMIT 1`,
      [patient_id]
    );
    if (appointments.length === 0)
      return res.json({ active: false, message: 'No active appointment today' });

    const appt = appointments[0];

    // Get patient tests workflow
    const [tests] = await db.query(
      `SELECT pt.*, tr.name as room_name, tr.test_type
       FROM patient_tests pt
       LEFT JOIN test_rooms tr ON pt.room_id = tr.id
       WHERE pt.appointment_id = ?
       ORDER BY pt.sequence_order`,
      [appt.id]
    );

    // Queue position in current room
    const currentTest = tests.find(t => t.status === 'in_queue' || t.status === 'in_progress');
    let queuePosition = null;
    if (currentTest) {
      const [ahead] = await db.query(
        `SELECT COUNT(*) as count FROM queue q
         JOIN appointments a ON q.appointment_id = a.id
         WHERE q.room_id = ? AND q.status = 'waiting' AND a.appointment_time < ?`,
        [currentTest.room_id, appt.appointment_time]
      );
      queuePosition = (ahead[0].count || 0) + 1;
    }

    res.json({
      active: true,
      appointment: appt,
      tests,
      currentTest,
      queuePosition,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Check in patient (generate test workflow)
const checkInPatient = async (req, res) => {
  const { appointment_id } = req.body;
  try {
    // Get appointment
    const [appts] = await db.query('SELECT * FROM appointments WHERE id = ?', [appointment_id]);
    if (appts.length === 0) return res.status(404).json({ message: 'Appointment not found' });

    // Get test package rooms
    const [pkg] = await db.query('SELECT * FROM test_packages WHERE id = ?', [appts[0].test_package_id]);

    // Get all active rooms for workflow
    const [rooms] = await db.query('SELECT * FROM test_rooms WHERE status = "active" ORDER BY id');

    // Assign rooms based on package (simplified: assign first N rooms)
    let roomsToAssign = rooms.slice(0, 3); // default 3 rooms
    if (pkg[0]?.name?.includes('Blood')) roomsToAssign = rooms.slice(0, 1);
    if (pkg[0]?.name?.includes('Cardiac')) roomsToAssign = [rooms[0], rooms[1]];
    if (pkg[0]?.name?.includes('Full')) roomsToAssign = rooms.slice(0, 4);

    // Clear existing tests
    await db.query('DELETE FROM patient_tests WHERE appointment_id = ?', [appointment_id]);

    // Create test workflow
    for (let i = 0; i < roomsToAssign.length; i++) {
      const status = i === 0 ? 'in_queue' : 'pending';
      await db.query(
        'INSERT INTO patient_tests (appointment_id, room_id, status, sequence_order) VALUES (?, ?, ?, ?)',
        [appointment_id, roomsToAssign[i].id, status, i + 1]
      );
      // Add to queue for first room
      if (i === 0) {
        const [queueCount] = await db.query(
          'SELECT COUNT(*) as count FROM queue WHERE room_id = ? AND status = "waiting"',
          [roomsToAssign[i].id]
        );
        await db.query(
          'INSERT INTO queue (appointment_id, room_id, position, status) VALUES (?, ?, ?, ?)',
          [appointment_id, roomsToAssign[i].id, (queueCount[0].count || 0) + 1, 'waiting']
        );
      }
    }

    // Update appointment status
    await db.query('UPDATE appointments SET status = "checked_in" WHERE id = ?', [appointment_id]);

    // Notify patient
    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [appts[0].patient_id, 'Checked In Successfully', `You have been checked in. Please proceed to Room 1 - Blood Collection. Your tests will begin shortly.`, 'queue']
    );

    res.json({ message: 'Patient checked in and workflow created', rooms: roomsToAssign.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Complete a test and move patient to next room
const completeTest = async (req, res) => {
  const { patient_test_id } = req.body;
  try {
    // Mark current test complete
    await db.query(
      'UPDATE patient_tests SET status = "completed", completed_at = NOW() WHERE id = ?',
      [patient_test_id]
    );

    // Get the test details
    const [tests] = await db.query('SELECT * FROM patient_tests WHERE id = ?', [patient_test_id]);
    const test = tests[0];

    // Get next test in sequence
    const [nextTests] = await db.query(
      'SELECT pt.*, tr.name as room_name FROM patient_tests pt JOIN test_rooms tr ON pt.room_id = tr.id WHERE pt.appointment_id = ? AND pt.sequence_order = ? AND pt.status = "pending"',
      [test.appointment_id, test.sequence_order + 1]
    );

    // Update queue
    await db.query('UPDATE queue SET status = "completed" WHERE appointment_id = ? AND room_id = ?', [test.appointment_id, test.room_id]);

    if (nextTests.length > 0) {
      // Move to next room
      await db.query('UPDATE patient_tests SET status = "in_queue" WHERE id = ?', [nextTests[0].id]);

      // Add to queue for next room
      const [queueCount] = await db.query(
        'SELECT COUNT(*) as count FROM queue WHERE room_id = ? AND status = "waiting"',
        [nextTests[0].room_id]
      );
      await db.query(
        'INSERT INTO queue (appointment_id, room_id, position, status) VALUES (?, ?, ?, ?)',
        [test.appointment_id, nextTests[0].room_id, (queueCount[0].count || 0) + 1, 'waiting']
      );

      // Get patient and notify
      const [appt] = await db.query('SELECT patient_id FROM appointments WHERE id = ?', [test.appointment_id]);
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [appt[0].patient_id, 'Proceed to Next Room', `Please proceed to ${nextTests[0].room_name}. You are in the queue.`, 'queue']
      );

      // Update appointment to in_progress
      await db.query('UPDATE appointments SET status = "in_progress" WHERE id = ?', [test.appointment_id]);

      res.json({ message: 'Test completed, patient moved to next room', nextRoom: nextTests[0].room_name });
    } else {
      // All tests done
      const [appt] = await db.query('SELECT patient_id FROM appointments WHERE id = ?', [test.appointment_id]);
      await db.query('UPDATE appointments SET status = "completed" WHERE id = ?', [test.appointment_id]);
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [appt[0].patient_id, 'All Tests Completed!', 'All your tests are done. Your report will be available soon. You may leave the hospital.', 'queue']
      );
      res.json({ message: 'All tests completed!', allDone: true });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get live queue for a room (doctor/staff view)
const getRoomQueue = async (req, res) => {
  const { room_id } = req.params;
  try {
    const [queue] = await db.query(
      `SELECT q.*, u.name as patient_name, a.token_number, a.appointment_time, tp.name as package_name
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       JOIN users u ON a.patient_id = u.id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       WHERE q.room_id = ? AND q.status = 'waiting'
       ORDER BY q.position ASC`,
      [room_id]
    );
    const [room] = await db.query('SELECT * FROM test_rooms WHERE id = ?', [room_id]);
    res.json({ room: room[0], queue });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all rooms queue summary
const getAllRoomsQueue = async (req, res) => {
  try {
    const [rooms] = await db.query('SELECT * FROM test_rooms WHERE status = "active"');
    const summary = [];
    for (const room of rooms) {
      const [waiting] = await db.query(
        'SELECT COUNT(*) as count FROM queue WHERE room_id = ? AND status = "waiting"', [room.id]
      );
      const [inProgress] = await db.query(
        'SELECT COUNT(*) as count FROM patient_tests WHERE room_id = ? AND status = "in_progress"', [room.id]
      );
      summary.push({
        ...room,
        waiting_count: waiting[0].count,
        in_progress_count: inProgress[0].count,
        current_occupancy: waiting[0].count + inProgress[0].count,
      });
    }
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get today's live stats for doctor dashboard
const getLiveStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [[{ in_hospital }]] = await db.query(
      `SELECT COUNT(*) as in_hospital FROM appointments WHERE appointment_date = ? AND status IN ('checked_in','in_progress')`, [today]
    );
    const [[{ completed_today }]] = await db.query(
      `SELECT COUNT(*) as completed_today FROM appointments WHERE appointment_date = ? AND status = 'completed'`, [today]
    );
    const [[{ total_today }]] = await db.query(
      `SELECT COUNT(*) as total_today FROM appointments WHERE appointment_date = ? AND status != 'cancelled'`, [today]
    );
    const [[{ pending_checkin }]] = await db.query(
      `SELECT COUNT(*) as pending_checkin FROM appointments WHERE appointment_date = ? AND status = 'booked'`, [today]
    );
    const [rooms] = await db.query('SELECT * FROM test_rooms WHERE status = "active"');
    const roomStats = [];
    for (const room of rooms) {
      const [waiting] = await db.query('SELECT COUNT(*) as count FROM queue WHERE room_id = ? AND status = "waiting"', [room.id]);
      const [done] = await db.query('SELECT COUNT(*) as count FROM patient_tests WHERE room_id = ? AND status = "completed"', [room.id]);
      roomStats.push({ ...room, waiting: waiting[0].count, completed: done[0].count });
    }
    res.json({ in_hospital, completed_today, total_today, pending_checkin, rooms: roomStats });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getPatientQueue, checkInPatient, completeTest, getRoomQueue, getAllRoomsQueue, getLiveStats };
