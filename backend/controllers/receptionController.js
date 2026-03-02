const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const { sendReportEmail } = require('../utils/mailer');

// Search appointment by token
const getAppointmentByToken = async (req, res) => {
  const { token } = req.params;
  try {
    const [appts] = await db.query(
      `SELECT a.*,
        u.name as patient_name, u.email as patient_email, u.phone as patient_phone,
        tp.name as package_name, tp.price as package_price, tp.room_number as test_room_number,
        tp.pre_requirements,
        p.age, p.gender, p.blood_group,
        doc.name as doctor_name, d.room_number as doctor_room,
        conf.name as confirmed_by_name
       FROM appointments a
       LEFT JOIN users u ON a.patient_id = u.id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       LEFT JOIN patients p ON a.patient_id = p.user_id
       LEFT JOIN users doc ON a.doctor_id = doc.id
       LEFT JOIN doctors d ON a.doctor_id = d.user_id
       LEFT JOIN users conf ON a.payment_confirmed_by = conf.id
       WHERE a.token_number = ?`,
      [token.toUpperCase()]
    );
    if (appts.length === 0)
      return res.status(404).json({ message: 'No appointment found with this token' });
    res.json(appts[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Confirm payment and check-in patient
const confirmPaymentAndCheckIn = async (req, res) => {
  const { token } = req.body;
  const reception_id = req.user.id;
  try {
    const [appts] = await db.query('SELECT * FROM appointments WHERE token_number = ?', [token.toUpperCase()]);
    if (appts.length === 0)
      return res.status(404).json({ message: 'Appointment not found' });

    const appt = appts[0];
    if (appt.status === 'cancelled')
      return res.status(400).json({ message: 'This appointment has been cancelled' });
    if (appt.payment_confirmed)
      return res.status(400).json({ message: 'Payment already confirmed for this token' });
    if (appt.status === 'completed')
      return res.status(400).json({ message: 'This appointment is already completed' });

    await db.query(
      `UPDATE appointments SET
        payment_status = 'paid',
        payment_confirmed = 1,
        payment_confirmed_at = NOW(),
        payment_confirmed_by = ?,
        status = 'checked_in'
       WHERE token_number = ?`,
      [reception_id, token.toUpperCase()]
    );

    // Auto assign test rooms
    if (appt.appointment_type === 'test' && appt.test_package_id) {
      const [rooms] = await db.query('SELECT * FROM test_rooms WHERE status = "active" ORDER BY id');
      const [pkg] = await db.query('SELECT * FROM test_packages WHERE id = ?', [appt.test_package_id]);
      const pkgName = pkg[0]?.name || '';
      let roomsToAssign = rooms.slice(0, 1);
      if (pkgName.includes('Full')) roomsToAssign = rooms.slice(0, 4);
      else if (pkgName.includes('Cardiac')) roomsToAssign = rooms.slice(0, 2);

      await db.query('DELETE FROM patient_tests WHERE appointment_id = ?', [appt.id]);
      for (let i = 0; i < roomsToAssign.length; i++) {
        await db.query(
          'INSERT INTO patient_tests (appointment_id, room_id, status, sequence_order) VALUES (?, ?, ?, ?)',
          [appt.id, roomsToAssign[i].id, i === 0 ? 'in_queue' : 'pending', i + 1]
        );
        if (i === 0) {
          const [qCount] = await db.query('SELECT COUNT(*) as c FROM queue WHERE room_id = ? AND status = "waiting"', [roomsToAssign[i].id]);
          await db.query(
            'INSERT INTO queue (appointment_id, room_id, position, status) VALUES (?, ?, ?, "waiting")',
            [appt.id, roomsToAssign[i].id, (qCount[0].c || 0) + 1]
          );
        }
      }
      const roomName = roomsToAssign[0]?.name || 'Room 1';
      await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [appt.patient_id, 'Payment Confirmed ✅', `Payment confirmed. Please proceed to ${roomName}.`, 'appointment']);
    } else {
      await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [appt.patient_id, 'Payment Confirmed ✅', 'Payment confirmed. Please wait in the waiting area for your consultation.', 'appointment']);
    }

    const [updated] = await db.query(
      `SELECT a.*, u.name as patient_name, tp.name as package_name
       FROM appointments a
       LEFT JOIN users u ON a.patient_id = u.id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       WHERE a.token_number = ?`,
      [token.toUpperCase()]
    );
    res.json({ message: 'Payment confirmed and patient checked in!', appointment: updated[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get today's appointments
const getTodayAppointments = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [appointments] = await db.query(
      `SELECT a.*,
        u.name as patient_name, u.phone as patient_phone,
        tp.name as package_name, tp.room_number as test_room_number,
        p.age, p.gender, p.blood_group,
        doc.name as doctor_name
       FROM appointments a
       LEFT JOIN users u ON a.patient_id = u.id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       LEFT JOIN patients p ON a.patient_id = p.user_id
       LEFT JOIN users doc ON a.doctor_id = doc.id
       WHERE a.appointment_date = ? AND a.status != 'cancelled'
       ORDER BY a.appointment_time ASC`,
      [today]
    );
    const total     = appointments.length;
    const confirmed = appointments.filter(a => a.payment_confirmed).length;
    const pending   = appointments.filter(a => !a.payment_confirmed && a.status === 'booked').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    res.json({ appointments, stats: { total, confirmed, pending, completed } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Upload report from reception (by token)
const uploadReport = async (req, res) => {
  const { token_number, report_title, report_content, dispatch_date } = req.body;
  const reception_id = req.user.id;
  try {
    const [appts] = await db.query('SELECT * FROM appointments WHERE token_number = ?', [token_number]);
    if (appts.length === 0)
      return res.status(404).json({ message: 'Appointment not found for this token' });

    const appt = appts[0];
    if (!appt.payment_confirmed)
      return res.status(400).json({ message: 'Payment not confirmed for this appointment' });

    let pdfPath = null;
    if (req.file) pdfPath = req.file.filename;

    const [result] = await db.query(
      `INSERT INTO reports (appointment_id, patient_id, doctor_id, report_title, report_content, dispatch_date, is_available, pdf_path)
       VALUES (?, ?, ?, ?, ?, ?, true, ?)`,
      [appt.id, appt.patient_id, reception_id, report_title, report_content || '', dispatch_date || null, pdfPath]
    );

    await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [appt.patient_id, 'Report Available 📋', `Your report "${report_title}" is now ready. Check your reports section.`, 'report']);
    await db.query('UPDATE appointments SET status = "completed" WHERE id = ?', [appt.id]);

    // Send email
    try {
      const [users] = await db.query('SELECT * FROM users WHERE id = ?', [appt.patient_id]);
      let pdfBuffer = null;
      let pdfFilename = `MediCare_Report_${token_number}.pdf`;
      if (pdfPath) {
        const pdfFile = path.join(__dirname, '../uploads', pdfPath);
        if (fs.existsSync(pdfFile)) pdfBuffer = fs.readFileSync(pdfFile);
      }
      await sendReportEmail(users[0], { report_title, token_number }, appt, pdfBuffer, pdfFilename);
    } catch (mailErr) {
      console.error('Report email failed:', mailErr.message);
    }

    res.status(201).json({ message: 'Report uploaded and patient notified!', report_id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all reports created by reception
const getReceptionReports = async (req, res) => {
  try {
    const [reports] = await db.query(
      `SELECT r.*, u.name as patient_name, a.token_number, a.appointment_date, tp.name as package_name
       FROM reports r
       LEFT JOIN users u ON r.patient_id = u.id
       LEFT JOIN appointments a ON r.appointment_id = a.id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       WHERE r.doctor_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getAppointmentByToken, confirmPaymentAndCheckIn, getTodayAppointments, uploadReport, getReceptionReports };
