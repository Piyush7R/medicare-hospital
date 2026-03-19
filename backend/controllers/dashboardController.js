const db = require('../config/db');

// ── GET /dashboard/stats  ← PatientDashboard ─────────────────────────────────
const getPatientStats = async (req, res) => {
  const patient_id = req.user.id;
  try {
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM appointments
       WHERE patient_id = ? AND status != 'cancelled'`,
      [patient_id]
    );
    const [[{ completed }]] = await db.query(
      `SELECT COUNT(*) as completed FROM appointments
       WHERE patient_id = ? AND status = 'completed'`,
      [patient_id]
    );
    const [[{ upcoming }]] = await db.query(
      `SELECT COUNT(*) as upcoming FROM appointments
       WHERE patient_id = ? AND appointment_date >= CURDATE() AND status = 'booked'`,
      [patient_id]
    );
    const [[{ reports }]] = await db.query(
      `SELECT COUNT(*) as reports FROM reports
       WHERE patient_id = ? AND is_available = 1`,
      [patient_id]
    );

    // Active appointment today (checked_in or in_progress)
    const [active] = await db.query(
      `SELECT a.*, tp.name as package_name, tp.room_number as test_room_number
       FROM appointments a
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       WHERE a.patient_id = ? AND a.appointment_date = CURDATE()
         AND a.status IN ('checked_in','in_progress')
       ORDER BY a.status DESC LIMIT 1`,
      [patient_id]
    );

    // Next upcoming appointment
    const [next] = await db.query(
      `SELECT a.*, tp.name as package_name, tp.price as package_price,
         tp.pre_requirements, tp.room_number as test_room_number,
         u.name as doctor_name, d.room_number as doctor_room
       FROM appointments a
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       LEFT JOIN users u ON a.doctor_id = u.id
       LEFT JOIN doctors d ON a.doctor_id = d.user_id
       WHERE a.patient_id = ? AND a.appointment_date >= CURDATE()
         AND a.status IN ('booked','checked_in','in_progress')
       ORDER BY a.appointment_date ASC, a.appointment_time ASC
       LIMIT 1`,
      [patient_id]
    );

    res.json({
      total_appointments:     total,
      completed_appointments: completed,
      upcoming_appointments:  upcoming,
      total_reports:          reports,
      active_appointment:     active[0] || null,
      next_appointment:       next[0]   || null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── GET /dashboard/doctor-stats  ← DoctorDashboard ───────────────────────────
const getStats = async (req, res) => {
  const doctor_id = req.user.id;
  try {
    const today = new Date().toISOString().split('T')[0];

    const [[{ total_patients }]] = await db.query(
      `SELECT COUNT(DISTINCT a.patient_id) as total_patients FROM appointments a
       WHERE a.appointment_type = 'consultation' AND a.doctor_id = ? AND a.status != 'cancelled'`,
      [doctor_id]
    );
    const [[{ today_appointments }]] = await db.query(
      `SELECT COUNT(*) as today_appointments FROM appointments a
       WHERE a.appointment_date = ? AND a.appointment_type = 'consultation'
       AND a.doctor_id = ? AND a.status != 'cancelled'`,
      [today, doctor_id]
    );
    const [[{ in_hospital }]] = await db.query(
      `SELECT COUNT(*) as in_hospital FROM appointments a
       WHERE a.appointment_date = ? AND a.appointment_type = 'consultation'
       AND a.doctor_id = ? AND a.status IN ('checked_in','in_progress')`,
      [today, doctor_id]
    );
    const [[{ completed_today }]] = await db.query(
      `SELECT COUNT(*) as completed_today FROM appointments a
       WHERE a.appointment_date = ? AND a.appointment_type = 'consultation'
       AND a.doctor_id = ? AND a.status = 'completed'`,
      [today, doctor_id]
    );
    const [status_distribution] = await db.query(
      `SELECT status, COUNT(*) as count FROM appointments a
       WHERE a.appointment_date = ? AND a.appointment_type = 'consultation'
       AND a.doctor_id = ? AND a.status != 'cancelled'
       GROUP BY status`,
      [today, doctor_id]
    );
    const [recent_appointments] = await db.query(
      `SELECT a.*, u.name as patient_name
       FROM appointments a
       LEFT JOIN users u ON a.patient_id = u.id
       WHERE a.appointment_type = 'consultation' AND a.doctor_id = ?
       ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 10`,
      [doctor_id]
    );
    const [room_occupancy] = await db.query(
      `SELECT tr.id, tr.name, tr.test_type, tr.max_capacity,
        COUNT(CASE WHEN q.status = 'waiting' THEN 1 END) as waiting,
        COUNT(CASE WHEN pt.status = 'completed' THEN 1 END) as completed
       FROM test_rooms tr
       LEFT JOIN queue q ON q.room_id = tr.id AND q.status = 'waiting'
       LEFT JOIN patient_tests pt ON pt.room_id = tr.id
       WHERE tr.status = 'active'
       GROUP BY tr.id, tr.name, tr.test_type, tr.max_capacity`
    );

    res.json({ stats: { total_patients, today_appointments, in_hospital, completed_today }, status_distribution, recent_appointments, room_occupancy });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getPackages = async (req, res) => {
  try {
    const [packages] = await db.query(
      `SELECT id, name, category, description, price, duration_hours,
              room_number, pre_requirements, is_active
       FROM test_packages WHERE is_active = 1
       ORDER BY FIELD(category,'premium','advanced','normal','consultation'), name ASC`
    );
    res.json(packages);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const getDoctors = async (req, res) => {
  const { specialization } = req.query;
  try {
    let query = `
      SELECT u.id, u.name, u.email, u.phone,
        d.specialization, d.qualification, d.room_number,
        d.available_from, d.available_to, d.consultation_fee
      FROM users u JOIN doctors d ON u.id = d.user_id
      WHERE u.role = 'doctor' AND u.approval_status = 'approved'`;
    const params = [];
    if (specialization) { query += ' AND d.specialization = ?'; params.push(specialization); }
    query += ' ORDER BY u.name ASC';
    const [doctors] = await db.query(query, params);
    res.json(doctors);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const getNotifications = async (req, res) => {
  try {
    const [notifications] = await db.query(
      `SELECT id, title, message, type, is_read, created_at
       FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    const [[{ unread }]] = await db.query(
      `SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0`,
      [req.user.id]
    );
    res.json({ notifications, unread });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const markNotificationRead = async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const markAllRead = async (req, res) => {
  try {
    await db.query(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const getPatients = async (req, res) => {
  const doctor_id = req.user.id;
  try {
    // ONLY patients who have (or had) an appointment directly with THIS doctor.
    // This covers:
    //   1. Consultation appointments where doctor_id = this doctor
    //   2. Test appointments where doctor_id = this doctor (if doctor was explicitly assigned)
    // It does NOT include all hospital test patients — those are not "this doctor's patients".
    const [patients] = await db.query(
      `SELECT DISTINCT
         u.id, u.name, u.email, u.phone,
         p.age, p.gender, p.blood_group, p.address,
         COUNT(a.id)                              AS total_appointments,
         MAX(a.appointment_date)                  AS last_visit,
         SUM(CASE WHEN a.status != 'cancelled' AND a.status != 'booked' THEN 1 ELSE 0 END) AS visited_count,
         GROUP_CONCAT(
           DISTINCT COALESCE(tp.name, CONCAT('Consultation – ', COALESCE(a.specialization,'')))
           ORDER BY a.appointment_date DESC
           SEPARATOR ', '
         )                                        AS services
       FROM appointments a
       JOIN users u   ON a.patient_id  = u.id
       LEFT JOIN patients p  ON a.patient_id  = p.user_id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       WHERE a.doctor_id = ?
         AND a.status != 'cancelled'
       GROUP BY u.id, u.name, u.email, u.phone, p.age, p.gender, p.blood_group, p.address
       ORDER BY last_visit DESC`,
      [doctor_id]
    );
    res.json(patients);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

module.exports = {
  getPatientStats,      // Patient dashboard  →  GET /dashboard/stats
  getStats,             // Doctor dashboard   →  GET /dashboard/doctor-stats
  getPackages,
  getDoctors,
  getNotifications,
  markNotificationRead,
  markAllRead,
  getPatients,
};