const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { sendAppointmentEmail } = require('../utils/mailer');

const getAvailableSlots = async (req, res) => {
  const { date, doctor_id } = req.query;
  try {
    let query = 'SELECT appointment_time FROM appointments WHERE appointment_date = ? AND status != ?';
    let params = [date, 'cancelled'];
    if (doctor_id) { query += ' AND doctor_id = ?'; params.push(doctor_id); }
    const [booked] = await db.query(query, params);
    const bookedTimes = booked.map(b => b.appointment_time);
    const slots = [];
    for (let h = 9; h < 16; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
        slots.push({ time, available: !bookedTimes.includes(time) });
      }
    }
    res.json(slots);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const bookAppointment = async (req, res) => {
  const { test_package_id, appointment_date, appointment_time, notes, appointment_type, doctor_id, specialization, patient_note } = req.body;
  const patient_id = req.user.id;
  try {
    const [existing] = await db.query(
      'SELECT id FROM appointments WHERE appointment_date = ? AND appointment_time = ? AND status != ? AND (doctor_id = ? OR (doctor_id IS NULL AND ? IS NULL))',
      [appointment_date, appointment_time, 'cancelled', doctor_id || null, doctor_id || null]
    );
    if (existing.length > 0)
      return res.status(400).json({ message: 'Slot already booked. Please choose another.' });

    let paymentAmount = 0;
    let packageInfo = null;
    if (test_package_id) {
      const [packages] = await db.query('SELECT * FROM test_packages WHERE id = ?', [test_package_id]);
      packageInfo = packages[0] || null;
      paymentAmount = packageInfo?.price || 0;
    }

    const token = 'TKN-' + Date.now().toString().slice(-6);
    const qrCode = uuidv4();
    const type = appointment_type || 'test';

    const [result] = await db.query(
      `INSERT INTO appointments (patient_id, test_package_id, appointment_date, appointment_time, token_number, qr_code, payment_amount, notes, appointment_type, doctor_id, specialization, patient_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, test_package_id || null, appointment_date, appointment_time, token, qrCode, paymentAmount, notes || null, type, doctor_id || null, specialization || null, patient_note || null]
    );

    // Notify in-app
    await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [patient_id, 'Appointment Booked', `Your appointment on ${appointment_date} at ${appointment_time} is confirmed. Token: ${token}`, 'appointment']);

    if (doctor_id) {
      await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [doctor_id, 'New Consultation Booked', `Patient booked a consultation on ${appointment_date} at ${appointment_time}. Token: ${token}`, 'appointment']);
    }

    // Send confirmation email
    try {
      const [users] = await db.query('SELECT * FROM users WHERE id = ?', [patient_id]);
      let doctorInfo = null;
      if (doctor_id) {
        const [docs] = await db.query('SELECT u.name, d.room_number FROM users u JOIN doctors d ON u.id = d.user_id WHERE u.id = ?', [doctor_id]);
        doctorInfo = docs[0] || null;
      }
      await sendAppointmentEmail(
        users[0],
        { token_number: token, appointment_date, appointment_time, appointment_type: type, specialization, payment_amount: paymentAmount },
        packageInfo,
        doctorInfo
      );
    } catch (mailErr) {
      console.error('Appointment email failed:', mailErr.message);
    }

    res.status(201).json({ message: 'Appointment booked successfully!', appointment_id: result.insertId, token_number: token, qr_code: qrCode });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

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

const getMyAppointments = async (req, res) => {
  try {
    const [appointments] = await db.query(
      `SELECT a.*, tp.name as package_name, tp.description as package_desc, tp.duration_hours,
        tp.pre_requirements, tp.room_number as test_room_number, tp.category,
        u.name as doctor_name, d.specialization as doctor_specialization, d.room_number as doctor_room
       FROM appointments a
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       LEFT JOIN users u ON a.doctor_id = u.id
       LEFT JOIN doctors d ON a.doctor_id = d.user_id
       WHERE a.patient_id = ? ORDER BY a.appointment_date DESC`,
      [req.user.id]
    );
    res.json(appointments);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const getAllAppointments = async (req, res) => {
  const logged_in_doctor_id = req.user.id;
  const { date, type } = req.query;
  try {
    let query = `
      SELECT a.*, u.name as patient_name, u.phone as patient_phone,
        tp.name as package_name, tp.room_number as test_room_number, tp.pre_requirements,
        p.age, p.gender, p.blood_group, doc.name as doctor_name
      FROM appointments a
      LEFT JOIN users u ON a.patient_id = u.id
      LEFT JOIN test_packages tp ON a.test_package_id = tp.id
      LEFT JOIN patients p ON a.patient_id = p.user_id
      LEFT JOIN users doc ON a.doctor_id = doc.id
      WHERE (
        (a.appointment_type = 'test')
        OR (a.appointment_type = 'consultation' AND a.doctor_id = ?)
      )`;
    const params = [logged_in_doctor_id];
    if (date) { query += ' AND a.appointment_date = ?'; params.push(date); }
    if (type) { query += ' AND a.appointment_type = ?'; params.push(type); }
    query += ' ORDER BY a.appointment_date ASC, a.appointment_time ASC';
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
    await db.query('UPDATE appointments SET status = ?, payment_status = COALESCE(?, payment_status) WHERE id = ?',
      [status, payment_status || null, id]);
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

module.exports = { getAvailableSlots, bookAppointment, uploadImage, getMyAppointments, getAllAppointments, getByToken, updateStatus, cancelAppointment };
