const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { sendAppointmentEmail } = require('../utils/mailer');

const MAX_APPOINTMENTS_PER_DAY = 75;

// ── Daily capacity check ───────────────────────────────────────────────────────
const getAvailableSlots = async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'date is required' });
  try {
    const [[{ booked }]] = await db.query(
      `SELECT COUNT(*) as booked FROM appointments
       WHERE appointment_date = ? AND status != 'cancelled'`,
      [date]
    );
    const remaining = Math.max(0, MAX_APPOINTMENTS_PER_DAY - booked);
    res.json({
      date,
      total_capacity: MAX_APPOINTMENTS_PER_DAY,
      booked: parseInt(booked),
      remaining,
      available: remaining > 0,
      note: 'Patients must check in by 7:00 AM. Tokens are issued on a first-come, first-served basis.'
    });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// ── Book single appointment (test OR consultation) ─────────────────────────────
const bookAppointment = async (req, res) => {
  const { test_package_id, appointment_date, notes, appointment_type, doctor_id, specialization, patient_note, preferred_payment_mode } = req.body;
  const patient_id = req.user.id;
  try {
    const [[{ booked }]] = await db.query(
      `SELECT COUNT(*) as booked FROM appointments WHERE appointment_date = ? AND status != 'cancelled'`,
      [appointment_date]
    );
    if (booked >= MAX_APPOINTMENTS_PER_DAY)
      return res.status(400).json({ message: `Appointments for ${appointment_date} are fully booked. Please choose another date.` });

    const type = appointment_type || 'test';
    const [existingPatient] = await db.query(
      `SELECT id FROM appointments WHERE appointment_date = ? AND patient_id = ? AND appointment_type = ? AND status != 'cancelled'`,
      [appointment_date, patient_id, type]
    );
    if (existingPatient.length > 0)
      return res.status(400).json({ message: `You already have a ${type} booked on this date.` });

    let paymentAmount = 0;
    let packageInfo = null;
    if (test_package_id) {
      const [pkgs] = await db.query('SELECT * FROM test_packages WHERE id = ?', [test_package_id]);
      packageInfo = pkgs[0] || null;
      paymentAmount = packageInfo?.price || 0;
    }
    if (type === 'consultation' && doctor_id) {
      const [docFee] = await db.query('SELECT consultation_fee FROM doctors WHERE user_id = ?', [doctor_id]);
      paymentAmount = docFee[0]?.consultation_fee || 500;
    }

    const token = 'TKN-' + Date.now().toString().slice(-6);
    const [result] = await db.query(
      `INSERT INTO appointments
        (patient_id, test_package_id, appointment_date, appointment_time, token_number, qr_code,
         payment_amount, notes, appointment_type, doctor_id, specialization, patient_note)
       VALUES (?, ?, ?, '07:00:00', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, test_package_id || null, appointment_date, token, uuidv4(),
       paymentAmount, notes || null, type, doctor_id || null, specialization || null, patient_note || null]
    );

    await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [patient_id, 'Appointment Booked', `Appointment on ${appointment_date} confirmed. Token: ${token}. Check in by 7:00 AM.`, 'appointment']);
    if (doctor_id) {
      await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [doctor_id, 'New Consultation Booked', `Patient booked a consultation on ${appointment_date}. Token: ${token}`, 'appointment']);
    }

    try {
      const [users] = await db.query('SELECT * FROM users WHERE id = ?', [patient_id]);
      let doctorInfo = null;
      if (doctor_id) {
        const [docs] = await db.query('SELECT u.name, d.room_number FROM users u JOIN doctors d ON u.id = d.user_id WHERE u.id = ?', [doctor_id]);
        doctorInfo = docs[0] || null;
      }
      await sendAppointmentEmail(users[0], { token_number: token, appointment_date, appointment_time: '07:00:00', appointment_type: type, specialization, payment_amount: paymentAmount }, packageInfo, doctorInfo);
    } catch (mailErr) { console.error('Appointment email failed:', mailErr.message); }

    res.status(201).json({ message: 'Appointment booked!', appointment_id: result.insertId, token_number: token });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// ── Book BOTH test and consultation in one request ─────────────────────────────
const bookBoth = async (req, res) => {
  const { test_package_id, doctor_id, appointment_date, notes, specialization, patient_note, preferred_payment_mode } = req.body;
  const patient_id = req.user.id;
  try {
    const [[{ booked }]] = await db.query(
      `SELECT COUNT(*) as booked FROM appointments WHERE appointment_date = ? AND status != 'cancelled'`, [appointment_date]
    );
    if (booked + 2 > MAX_APPOINTMENTS_PER_DAY)
      return res.status(400).json({ message: `Not enough slots available on ${appointment_date}.` });

    const [existing] = await db.query(
      `SELECT appointment_type FROM appointments WHERE appointment_date = ? AND patient_id = ? AND status != 'cancelled'`,
      [appointment_date, patient_id]
    );
    if (existing.length > 0) {
      const types = existing.map(e => e.appointment_type);
      if (types.includes('test') && types.includes('consultation'))
        return res.status(400).json({ message: 'You already have both a test and consultation booked on this date.' });
      if (types.includes('test'))
        return res.status(400).json({ message: 'You already have a test booked on this date.' });
      if (types.includes('consultation'))
        return res.status(400).json({ message: 'You already have a consultation booked on this date.' });
    }

    const results = [];

    if (test_package_id) {
      const [pkgs] = await db.query('SELECT * FROM test_packages WHERE id = ?', [test_package_id]);
      const pkg = pkgs[0];
      const token = 'TKN-' + Date.now().toString().slice(-6);
      const [r] = await db.query(
        `INSERT INTO appointments (patient_id, test_package_id, appointment_date, appointment_time, token_number, qr_code, payment_amount, notes, appointment_type)
         VALUES (?, ?, ?, '07:00:00', ?, ?, ?, ?, 'test')`,
        [patient_id, test_package_id, appointment_date, token, uuidv4(), pkg?.price || 0, notes || null]
      );
      await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [patient_id, 'Test Booked', `${pkg?.name} on ${appointment_date}. Token: ${token}.`, 'appointment']);
      results.push({ type: 'test', token_number: token, appointment_id: r.insertId, package_name: pkg?.name });
    }

    await new Promise(r => setTimeout(r, 10));

    if (doctor_id) {
      const [docFee] = await db.query('SELECT consultation_fee FROM doctors WHERE user_id = ?', [doctor_id]);
      const fee = docFee[0]?.consultation_fee || 500;
      const token = 'TKN-' + Date.now().toString().slice(-6);
      const [r] = await db.query(
        `INSERT INTO appointments (patient_id, appointment_date, appointment_time, token_number, qr_code, payment_amount, notes, appointment_type, doctor_id, specialization, patient_note)
         VALUES (?, ?, '07:00:00', ?, ?, ?, ?, 'consultation', ?, ?, ?)`,
        [patient_id, appointment_date, token, uuidv4(), fee, notes || null, doctor_id, specialization || null, patient_note || null]
      );
      await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [patient_id, 'Consultation Booked', `Consultation on ${appointment_date}. Token: ${token}.`, 'appointment']);
      await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [doctor_id, 'New Consultation Booked', `Patient booked a consultation on ${appointment_date}. Token: ${token}`, 'appointment']);
      results.push({ type: 'consultation', token_number: token, appointment_id: r.insertId });
    }

    res.status(201).json({ message: 'Appointments booked!', bookings: results });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// ── Upload image for appointment ───────────────────────────────────────────────
const uploadImage = async (req, res) => {
  const { appointment_id } = req.params;
  const { image_base64, image_name } = req.body;
  try {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filename = `${Date.now()}_${image_name || 'image.jpg'}`;
    const filepath = path.join(uploadDir, filename);
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
    await db.query('UPDATE appointments SET image_path = ? WHERE id = ? AND patient_id = ?', [filename, appointment_id, req.user.id]);
    const [appt] = await db.query('SELECT doctor_id, patient_id FROM appointments WHERE id = ?', [appointment_id]);
    if (appt[0]?.doctor_id) {
      const [pat] = await db.query('SELECT name FROM users WHERE id = ?', [appt[0].patient_id]);
      await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [appt[0].doctor_id, 'Patient Uploaded Image', `${pat[0].name} uploaded a medical image.`, 'appointment']);
    }
    res.json({ message: 'Image uploaded', filename });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// ── Patient: get own appointments ──────────────────────────────────────────────
const getMyAppointments = async (req, res) => {
  try {
    const [appointments] = await db.query(
      `SELECT a.*, tp.name as package_name, tp.description as package_desc,
         tp.duration_hours, tp.pre_requirements, tp.room_number as test_room_number, tp.category,
         u.name as doctor_name, d.specialization as doctor_specialization, d.room_number as doctor_room
       FROM appointments a
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       LEFT JOIN users u ON a.doctor_id = u.id
       LEFT JOIN doctors d ON a.doctor_id = d.user_id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC`,
      [req.user.id]
    );
    res.json(appointments);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// ── Doctor: get appointments
// FIXED: Only returns appointments where THIS doctor is assigned
//   - consultation: doctor_id = this doctor
//   - test:         doctor_id = this doctor (if doctor has been assigned) OR all tests
//                   (since hospital tests are accessible to all doctors)
// Per business logic: show ALL test appointments + only THIS doctor's consultations
// But patients page should ONLY show patients linked to THIS doctor.
// For appointments page we keep showing all tests (useful for doctor to see who's in hospital)
// but the patients page is strictly filtered.
const getAllAppointments = async (req, res) => {
  const doctor_id = req.user.id;
  const { date, type } = req.query;
  try {
    let query = `
      SELECT a.*, u.name as patient_name, u.phone as patient_phone,
        tp.name as package_name, tp.room_number as test_room_number, tp.pre_requirements,
        p.age, p.gender, p.blood_group,
        doc.name as doctor_name, d2.specialization as doctor_specialization
      FROM appointments a
      LEFT JOIN users u ON a.patient_id = u.id
      LEFT JOIN test_packages tp ON a.test_package_id = tp.id
      LEFT JOIN patients p ON a.patient_id = p.user_id
      LEFT JOIN users doc ON a.doctor_id = doc.id
      LEFT JOIN doctors d2 ON a.doctor_id = d2.user_id
      WHERE (
        a.appointment_type = 'test'
        OR (a.appointment_type = 'consultation' AND a.doctor_id = ?)
      )`;
    const params = [doctor_id];
    if (date) { query += ' AND a.appointment_date = ?'; params.push(date); }
    if (type) { query += ' AND a.appointment_type = ?'; params.push(type); }
    query += ' ORDER BY a.appointment_date DESC, a.appointment_time ASC';
    const [appointments] = await db.query(query, params);
    res.json(appointments);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const getByToken = async (req, res) => {
  const { token } = req.params;
  try {
    const [appointments] = await db.query(
      `SELECT a.*, u.name as patient_name, u.email as patient_email, u.phone as patient_phone,
        tp.name as package_name, tp.pre_requirements, tp.room_number as test_room_number,
        p.age, p.gender, p.blood_group, p.address
       FROM appointments a
       LEFT JOIN users u ON a.patient_id = u.id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       LEFT JOIN patients p ON a.patient_id = p.user_id
       WHERE a.token_number = ?`,
      [token]
    );
    if (appointments.length === 0)
      return res.status(404).json({ message: 'No appointment found with this token' });
    res.json(appointments[0]);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status, payment_status } = req.body;
  try {
    await db.query(
      'UPDATE appointments SET status = ?, payment_status = COALESCE(?, payment_status) WHERE id = ?',
      [status, payment_status || null, id]
    );
    const [appt] = await db.query('SELECT patient_id FROM appointments WHERE id = ?', [id]);
    if (appt.length > 0) {
      await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [appt[0].patient_id, 'Appointment Update', `Your appointment status updated to: ${status}`, 'appointment']);
    }
    res.json({ message: 'Status updated' });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const cancelAppointment = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE appointments SET status = ? WHERE id = ? AND patient_id = ?', ['cancelled', id, req.user.id]);
    res.json({ message: 'Appointment cancelled' });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const submitFeedback = async (req, res) => {
  const { appointment_id, rating, feedback_text, service_ratings } = req.body;
  const patient_id = req.user.id;
  try {
    const [appts] = await db.query(
      'SELECT * FROM appointments WHERE id = ? AND patient_id = ? AND status = "completed"',
      [appointment_id, patient_id]
    );
    if (appts.length === 0)
      return res.status(404).json({ message: 'No completed appointment found' });
    const [existing] = await db.query('SELECT id FROM feedback WHERE appointment_id = ?', [appointment_id]);
    if (existing.length > 0)
      return res.status(400).json({ message: 'Feedback already submitted for this appointment' });
    await db.query(
      'INSERT INTO feedback (appointment_id, patient_id, rating, feedback_text, service_ratings) VALUES (?, ?, ?, ?, ?)',
      [appointment_id, patient_id, rating, feedback_text || '', JSON.stringify(service_ratings || {})]
    );
    res.status(201).json({ message: 'Thank you for your feedback!' });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const getMyFeedback = async (req, res) => {
  try {
    const [feedbacks] = await db.query(
      `SELECT f.*, a.appointment_date, tp.name as package_name, a.token_number
       FROM feedback f
       JOIN appointments a ON f.appointment_id = a.id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       WHERE f.patient_id = ? ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json(feedbacks);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

module.exports = {
  getAvailableSlots, bookAppointment, bookBoth, uploadImage,
  getMyAppointments, getAllAppointments, getByToken,
  updateStatus, cancelAppointment, submitFeedback, getMyFeedback,
};