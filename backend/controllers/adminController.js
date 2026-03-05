const db = require('../config/db');

// Dashboard stats
const getStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [[{ total_doctors }]]   = await db.query(`SELECT COUNT(*) as total_doctors FROM users WHERE role='doctor' AND approval_status='approved'`);
    const [[{ total_patients }]]  = await db.query(`SELECT COUNT(*) as total_patients FROM users WHERE role='patient'`);
    const [[{ pending_doctors }]] = await db.query(`SELECT COUNT(*) as pending_doctors FROM users WHERE role='doctor' AND approval_status='pending'`);
    const [[{ today_appts }]]     = await db.query(`SELECT COUNT(*) as today_appts FROM appointments WHERE appointment_date=? AND status!='cancelled'`, [today]);
    const [[{ total_revenue }]]   = await db.query(`SELECT COALESCE(SUM(payment_amount),0) as total_revenue FROM appointments WHERE payment_confirmed=1`);
    res.json({ total_doctors, total_patients, pending_doctors, today_appts, total_revenue });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// Get pending doctor registrations
const getPendingDoctors = async (req, res) => {
  try {
    const [doctors] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at,
        d.specialization, d.qualification, d.room_number
       FROM users u
       LEFT JOIN doctors d ON u.id = d.user_id
       WHERE u.role = 'doctor' AND u.approval_status = 'pending'
       ORDER BY u.created_at DESC`
    );
    res.json(doctors);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// Get all doctors
const getAllDoctors = async (req, res) => {
  try {
    const [doctors] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at, u.approval_status,
        d.specialization, d.qualification, d.room_number,
        COUNT(a.id) as total_appointments
       FROM users u
       LEFT JOIN doctors d ON u.id = d.user_id
       LEFT JOIN appointments a ON u.id = a.doctor_id
       WHERE u.role = 'doctor'
       GROUP BY u.id, u.name, u.email, u.phone, u.created_at, u.approval_status, d.specialization, d.qualification, d.room_number
       ORDER BY u.approval_status ASC, u.name ASC`
    );
    res.json(doctors);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// Approve or reject doctor
const reviewDoctor = async (req, res) => {
  const { doctor_id, action, reason } = req.body;
  try {
    const approval_status = action === 'approve' ? 'approved' : 'rejected';
    const is_approved = action === 'approve' ? 1 : 0;
    await db.query('UPDATE users SET approval_status=?, is_approved=? WHERE id=? AND role=?', [approval_status, is_approved, doctor_id, 'doctor']);

    const [users] = await db.query('SELECT * FROM users WHERE id=?', [doctor_id]);
    if (users.length > 0) {
      const msg = action === 'approve'
        ? 'Your doctor account has been approved! You can now login to MediCare.'
        : `Your registration was reviewed. ${reason ? 'Reason: ' + reason : 'Please contact the hospital for more information.'}`;
      await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [doctor_id, action === 'approve' ? '✅ Account Approved!' : '❌ Registration Reviewed', msg, 'appointment']);
    }

    res.json({ message: `Doctor ${action === 'approve' ? 'approved' : 'rejected'} successfully` });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// Get all patients
const getAllPatients = async (req, res) => {
  try {
    const [patients] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at,
        p.age, p.gender, p.blood_group, p.address,
        COUNT(a.id) as total_appointments
       FROM users u
       LEFT JOIN patients p ON u.id = p.user_id
       LEFT JOIN appointments a ON u.id = a.patient_id
       WHERE u.role = 'patient'
       GROUP BY u.id, u.name, u.email, u.phone, u.created_at, p.age, p.gender, p.blood_group, p.address
       ORDER BY u.created_at DESC`
    );
    res.json(patients);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// Get all appointments (admin overview)
const getAllAppointments = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [appointments] = await db.query(
      `SELECT a.*, u.name as patient_name, tp.name as package_name, doc.name as doctor_name
       FROM appointments a
       LEFT JOIN users u ON a.patient_id = u.id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       LEFT JOIN users doc ON a.doctor_id = doc.id
       WHERE a.appointment_date = ?
       ORDER BY a.appointment_time ASC`, [today]
    );
    res.json(appointments);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// Manage test packages
const getPackages = async (req, res) => {
  try {
    const [packages] = await db.query('SELECT * FROM test_packages ORDER BY name ASC');
    res.json(packages);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

const updatePackage = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, duration_hours, pre_requirements, room_number, category } = req.body;
  try {
    await db.query(
      'UPDATE test_packages SET name=?, description=?, price=?, duration_hours=?, pre_requirements=?, room_number=?, category=? WHERE id=?',
      [name, description, price, duration_hours, pre_requirements, room_number, category, id]
    );
    res.json({ message: 'Package updated' });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// ─── ANALYTICS ENDPOINTS ──────────────────────────────────────────────────────

// 1. Booking & Demand Analytics
const getBookingAnalytics = async (req, res) => {
  const { period = '30' } = req.query; // days
  try {
    // Total bookings per day for last N days
    const [dailyBookings] = await db.query(
      `SELECT appointment_date, COUNT(*) as total,
        SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM appointments
       WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY appointment_date ORDER BY appointment_date ASC`,
      [parseInt(period)]
    );

    // Package-wise booking trends
    const [packageTrends] = await db.query(
      `SELECT tp.name as package_name, COUNT(a.id) as total_bookings,
        SUM(CASE WHEN a.status='cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM appointments a
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       WHERE a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY tp.id, tp.name ORDER BY total_bookings DESC`,
      [parseInt(period)]
    );

    // Peak booking days (day of week)
    const [peakDays] = await db.query(
      `SELECT DAYNAME(appointment_date) as day_name,
        DAYOFWEEK(appointment_date) as day_num,
        COUNT(*) as total
       FROM appointments
       WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         AND status != 'cancelled'
       GROUP BY day_name, day_num ORDER BY day_num`,
      [parseInt(period)]
    );

    // Cancellation rate
    const [[{ total_appts, total_cancelled }]] = await db.query(
      `SELECT COUNT(*) as total_appts,
        SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as total_cancelled
       FROM appointments
       WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      [parseInt(period)]
    );

    // Monthly comparison
    const [monthlyBookings] = await db.query(
      `SELECT DATE_FORMAT(appointment_date, '%Y-%m') as month,
        COUNT(*) as total
       FROM appointments
       WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
         AND status != 'cancelled'
       GROUP BY month ORDER BY month ASC`
    );

    res.json({
      daily_bookings: dailyBookings,
      package_trends: packageTrends,
      peak_days: peakDays,
      cancellation_rate: total_appts > 0 ? ((total_cancelled / total_appts) * 100).toFixed(1) : 0,
      total_appts,
      total_cancelled,
      monthly_bookings: monthlyBookings
    });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// 2. Package Performance Analysis
const getPackageAnalytics = async (req, res) => {
  try {
    const [packagePerf] = await db.query(
      `SELECT tp.id, tp.name, tp.price, tp.category,
        COUNT(a.id) as total_bookings,
        SUM(CASE WHEN a.payment_confirmed=1 THEN a.payment_amount ELSE 0 END) as revenue,
        SUM(CASE WHEN a.status='completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN a.status='cancelled' THEN 1 ELSE 0 END) as cancelled,
        AVG(CASE WHEN a.status='completed' THEN TIMESTAMPDIFF(MINUTE, a.payment_confirmed_at, a.updated_at) END) as avg_completion_minutes
       FROM test_packages tp
       LEFT JOIN appointments a ON tp.id = a.test_package_id
       GROUP BY tp.id, tp.name, tp.price, tp.category
       ORDER BY revenue DESC`
    );
    res.json(packagePerf);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// 3. Test / Department Load Analysis
const getDepartmentLoad = async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  try {
    // Room-wise queue load
    const [roomLoad] = await db.query(
      `SELECT tr.name as room_name, tr.test_type,
        COUNT(pt.id) as total_tests,
        SUM(CASE WHEN pt.status='completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN pt.status='in_queue' THEN 1 ELSE 0 END) as in_queue,
        SUM(CASE WHEN pt.status='in_progress' THEN 1 ELSE 0 END) as in_progress,
        AVG(CASE WHEN pt.status='completed' THEN TIMESTAMPDIFF(MINUTE, pt.created_at, pt.completed_at) END) as avg_wait_minutes
       FROM test_rooms tr
       LEFT JOIN patient_tests pt ON tr.id = pt.room_id
       LEFT JOIN appointments a ON pt.appointment_id = a.id AND a.appointment_date = ?
       GROUP BY tr.id, tr.name, tr.test_type
       ORDER BY total_tests DESC`,
      [targetDate]
    );

    // Package-wise volume breakdown
    const [testVolume] = await db.query(
      `SELECT tp.name as package_name, tp.room_number,
        COUNT(a.id) as volume
       FROM appointments a
       JOIN test_packages tp ON a.test_package_id = tp.id
       WHERE a.appointment_date = ? AND a.status != 'cancelled'
       GROUP BY tp.id, tp.name, tp.room_number
       ORDER BY volume DESC`,
      [targetDate]
    );

    res.json({ room_load: roomLoad, test_volume: testVolume, date: targetDate });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// 4. Patient Demographic Analysis
const getDemographicAnalytics = async (req, res) => {
  try {
    // Age group distribution
    const [ageGroups] = await db.query(
      `SELECT
        CASE
          WHEN p.age < 18 THEN 'Under 18'
          WHEN p.age BETWEEN 18 AND 30 THEN '18-30'
          WHEN p.age BETWEEN 31 AND 45 THEN '31-45'
          WHEN p.age BETWEEN 46 AND 60 THEN '46-60'
          ELSE '60+'
        END as age_group,
        COUNT(*) as count
       FROM patients p
       WHERE p.age IS NOT NULL
       GROUP BY age_group ORDER BY MIN(p.age)`
    );

    // Gender-wise bookings
    const [genderStats] = await db.query(
      `SELECT p.gender, COUNT(a.id) as total_bookings,
        COUNT(DISTINCT a.patient_id) as unique_patients
       FROM appointments a
       JOIN patients p ON a.patient_id = p.user_id
       WHERE a.status != 'cancelled' AND p.gender IS NOT NULL
       GROUP BY p.gender`
    );

    // Blood group distribution
    const [bloodGroups] = await db.query(
      `SELECT blood_group, COUNT(*) as count
       FROM patients WHERE blood_group IS NOT NULL
       GROUP BY blood_group ORDER BY count DESC`
    );

    // Gender-based package trends
    const [genderPackageTrends] = await db.query(
      `SELECT p.gender, tp.name as package_name, COUNT(*) as count
       FROM appointments a
       JOIN patients p ON a.patient_id = p.user_id
       JOIN test_packages tp ON a.test_package_id = tp.id
       WHERE a.status != 'cancelled' AND p.gender IS NOT NULL
       GROUP BY p.gender, tp.id, tp.name
       ORDER BY p.gender, count DESC`
    );

    // Age group vs package
    const [agePackageTrends] = await db.query(
      `SELECT
        CASE
          WHEN p.age < 18 THEN 'Under 18'
          WHEN p.age BETWEEN 18 AND 30 THEN '18-30'
          WHEN p.age BETWEEN 31 AND 45 THEN '31-45'
          WHEN p.age BETWEEN 46 AND 60 THEN '46-60'
          ELSE '60+'
        END as age_group,
        tp.name as package_name, COUNT(*) as count
       FROM appointments a
       JOIN patients p ON a.patient_id = p.user_id
       JOIN test_packages tp ON a.test_package_id = tp.id
       WHERE a.status != 'cancelled' AND p.age IS NOT NULL
       GROUP BY age_group, tp.id, tp.name
       ORDER BY age_group, count DESC`
    );

    res.json({ age_groups: ageGroups, gender_stats: genderStats, blood_groups: bloodGroups, gender_package_trends: genderPackageTrends, age_package_trends: agePackageTrends });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// 5. Revenue & Financial Analysis
const getRevenueAnalytics = async (req, res) => {
  const { period = '30' } = req.query;
  try {
    // Daily revenue
    const [dailyRevenue] = await db.query(
      `SELECT appointment_date,
        SUM(payment_amount) as revenue,
        COUNT(*) as transactions
       FROM appointments
       WHERE payment_confirmed = 1
         AND appointment_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY appointment_date ORDER BY appointment_date ASC`,
      [parseInt(period)]
    );

    // Monthly revenue
    const [monthlyRevenue] = await db.query(
      `SELECT DATE_FORMAT(appointment_date, '%Y-%m') as month,
        SUM(payment_amount) as revenue,
        COUNT(*) as transactions
       FROM appointments
       WHERE payment_confirmed = 1
         AND appointment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY month ORDER BY month ASC`
    );

    // Package-wise revenue contribution
    const [packageRevenue] = await db.query(
      `SELECT COALESCE(tp.name, 'Consultation') as name,
        SUM(a.payment_amount) as revenue,
        COUNT(*) as count
       FROM appointments a
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       WHERE a.payment_confirmed = 1
       GROUP BY tp.id, tp.name ORDER BY revenue DESC`
    );

    // Payment mode breakdown
    const [paymentModes] = await db.query(
      `SELECT COALESCE(payment_mode, 'cash') as mode,
        COUNT(*) as count,
        SUM(payment_amount) as total_amount
       FROM appointments
       WHERE payment_confirmed = 1
       GROUP BY mode`
    );

    // Total summary
    const [[summary]] = await db.query(
      `SELECT
        SUM(payment_amount) as total_revenue,
        COUNT(*) as total_transactions,
        AVG(payment_amount) as avg_transaction
       FROM appointments WHERE payment_confirmed = 1`
    );

    res.json({ daily_revenue: dailyRevenue, monthly_revenue: monthlyRevenue, package_revenue: packageRevenue, payment_modes: paymentModes, summary });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// 6. Patient Experience / Feedback Analytics
const getFeedbackAnalytics = async (req, res) => {
  try {
    // Average rating overall
    const [[{ avg_rating, total_feedback }]] = await db.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total_feedback FROM feedback'
    );

    // Rating distribution
    const [ratingDist] = await db.query(
      'SELECT rating, COUNT(*) as count FROM feedback GROUP BY rating ORDER BY rating DESC'
    );

    // Package-wise avg rating
    const [packageRatings] = await db.query(
      `SELECT COALESCE(tp.name, 'Consultation') as package_name,
        AVG(f.rating) as avg_rating,
        COUNT(f.id) as feedback_count
       FROM feedback f
       JOIN appointments a ON f.appointment_id = a.id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       GROUP BY tp.id, tp.name ORDER BY avg_rating DESC`
    );

    // Recent feedback
    const [recentFeedback] = await db.query(
      `SELECT f.*, u.name as patient_name, tp.name as package_name, a.token_number, a.appointment_date
       FROM feedback f
       JOIN appointments a ON f.appointment_id = a.id
       JOIN users u ON f.patient_id = u.id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       ORDER BY f.created_at DESC LIMIT 20`
    );

    // Monthly trend of ratings
    const [monthlyRatings] = await db.query(
      `SELECT DATE_FORMAT(f.created_at, '%Y-%m') as month,
        AVG(f.rating) as avg_rating,
        COUNT(*) as count
       FROM feedback f
       WHERE f.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY month ORDER BY month ASC`
    );

    res.json({ avg_rating, total_feedback, rating_distribution: ratingDist, package_ratings: packageRatings, recent_feedback: recentFeedback, monthly_ratings: monthlyRatings });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

// 7. Real-Time Operations Dashboard
const getRealtimeOps = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [[{ checked_in_today }]] = await db.query(
      `SELECT COUNT(*) as checked_in_today FROM appointments WHERE appointment_date=? AND status IN ('checked_in','in_progress')`, [today]
    );
    const [[{ completed_today }]] = await db.query(
      `SELECT COUNT(*) as completed_today FROM appointments WHERE appointment_date=? AND status='completed'`, [today]
    );
    const [[{ pending_today }]] = await db.query(
      `SELECT COUNT(*) as pending_today FROM appointments WHERE appointment_date=? AND status='booked'`, [today]
    );
    const [[{ revenue_today }]] = await db.query(
      `SELECT COALESCE(SUM(payment_amount),0) as revenue_today FROM appointments WHERE appointment_date=? AND payment_confirmed=1`, [today]
    );

    // Room-by-room queue status
    const [roomStatus] = await db.query(
      `SELECT tr.name, tr.test_type,
        COUNT(CASE WHEN q.status='waiting' THEN 1 END) as waiting,
        COUNT(CASE WHEN pt.status='completed' THEN 1 END) as done_today
       FROM test_rooms tr
       LEFT JOIN queue q ON q.room_id = tr.id AND q.status = 'waiting'
       LEFT JOIN patient_tests pt ON pt.room_id = tr.id
       WHERE tr.status = 'active'
       GROUP BY tr.id, tr.name, tr.test_type`
    );

    res.json({ checked_in_today, completed_today, pending_today, revenue_today, room_status: roomStatus });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
};

module.exports = {
  getStats, getPendingDoctors, getAllDoctors, reviewDoctor, getAllPatients,
  getAllAppointments, getPackages, updatePackage,
  getBookingAnalytics, getPackageAnalytics, getDepartmentLoad,
  getDemographicAnalytics, getRevenueAnalytics, getFeedbackAnalytics, getRealtimeOps
};
