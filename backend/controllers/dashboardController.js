const db = require('../config/db');

const getStats = async (req, res) => {
  const doctor_id = req.user.id;
  try {
    const today = new Date().toISOString().split('T')[0];

    // Only payment-confirmed patients
    const [[{ total_patients }]] = await db.query(
      `SELECT COUNT(DISTINCT a.patient_id) as total_patients FROM appointments a
       WHERE a.payment_confirmed = 1 AND a.status != 'cancelled'
       AND ((a.appointment_type = 'test') OR (a.appointment_type = 'consultation' AND a.doctor_id = ?))`,
      [doctor_id]
    );

    const [[{ today_appointments }]] = await db.query(
      `SELECT COUNT(*) as today_appointments FROM appointments a
       WHERE a.appointment_date = ? AND a.payment_confirmed = 1 AND a.status != 'cancelled'
       AND ((a.appointment_type = 'test') OR (a.appointment_type = 'consultation' AND a.doctor_id = ?))`,
      [today, doctor_id]
    );

    const [[{ in_hospital }]] = await db.query(
      `SELECT COUNT(*) as in_hospital FROM appointments a
       WHERE a.appointment_date = ? AND a.payment_confirmed = 1
       AND a.status IN ('checked_in','in_progress')
       AND ((a.appointment_type = 'test') OR (a.appointment_type = 'consultation' AND a.doctor_id = ?))`,
      [today, doctor_id]
    );

    const [[{ completed_today }]] = await db.query(
      `SELECT COUNT(*) as completed_today FROM appointments a
       WHERE a.appointment_date = ? AND a.status = 'completed'
       AND ((a.appointment_type = 'test') OR (a.appointment_type = 'consultation' AND a.doctor_id = ?))`,
      [today, doctor_id]
    );

    const [status_distribution] = await db.query(
      `SELECT status, COUNT(*) as count FROM appointments a
       WHERE a.appointment_date = ? AND a.payment_confirmed = 1
       AND ((a.appointment_type = 'test') OR (a.appointment_type = 'consultation' AND a.doctor_id = ?))
       GROUP BY status`,
      [today, doctor_id]
    );

    const [recent_appointments] = await db.query(
      `SELECT a.*, u.name as patient_name, tp.name as package_name
       FROM appointments a
       LEFT JOIN users u ON a.patient_id = u.id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       WHERE a.payment_confirmed = 1
       AND ((a.appointment_type = 'test') OR (a.appointment_type = 'consultation' AND a.doctor_id = ?))
       ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 10`,
      [doctor_id]
    );

    // Room occupancy — only rooms where this doctor's patients are
    const [room_occupancy] = await db.query(
      `SELECT tr.id, tr.name, tr.test_type, tr.max_capacity,
        COUNT(CASE WHEN q.status = 'waiting' THEN 1 END) as waiting,
        COUNT(CASE WHEN pt.status = 'completed' THEN 1 END) as completed
       FROM test_rooms tr
       LEFT JOIN queue q ON q.room_id = tr.id AND q.status = 'waiting'
       LEFT JOIN patient_tests pt ON pt.room_id = tr.id
       WHERE tr.status = 'active'
       GROUP BY tr.id, tr.name, tr.test_type, tr.max_capacity`,
      []
    );

    res.json({ stats: { total_patients, today_appointments, in_hospital, completed_today }, status_distribution, recent_appointments, room_occupancy });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getPackages = async (req, res) => {
  try {
    const [packages] = await db.query('SELECT * FROM test_packages ORDER BY price ASC');
    res.json(packages);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const getDoctors = async (req, res) => {
  try {
    const [doctors] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, d.specialization, d.qualification, d.room_number, d.available_from, d.available_to, d.consultation_fee
       FROM users u JOIN doctors d ON u.id = d.user_id WHERE u.role = 'doctor'`
    );
    res.json(doctors);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const getNotifications = async (req, res) => {
  try {
    const [notifications] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.id]
    );
    res.json(notifications);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const markNotificationRead = async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const getPatients = async (req, res) => {
  const doctor_id = req.user.id;
  try {
    const [patients] = await db.query(
      `SELECT DISTINCT u.id, u.name, u.email, u.phone,
         p.age, p.gender, p.blood_group, p.address,
         COUNT(a.id) as total_appointments,
         MAX(a.appointment_date) as last_visit,
         GROUP_CONCAT(DISTINCT COALESCE(tp.name, CONCAT('Consultation - ', a.specialization)) ORDER BY a.appointment_date DESC SEPARATOR ', ') as services
       FROM appointments a
       JOIN users u ON a.patient_id = u.id
       LEFT JOIN patients p ON a.patient_id = p.user_id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       WHERE a.payment_confirmed = 1 AND a.status != 'cancelled'
       AND ((a.appointment_type = 'test') OR (a.appointment_type = 'consultation' AND a.doctor_id = ?))
       GROUP BY u.id, u.name, u.email, u.phone, p.age, p.gender, p.blood_group, p.address
       ORDER BY last_visit DESC`,
      [doctor_id]
    );
    res.json(patients);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

module.exports = { getStats, getPackages, getDoctors, getNotifications, markNotificationRead, getPatients };
