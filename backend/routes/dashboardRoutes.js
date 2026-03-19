const express = require('express');
const router  = express.Router();
const {
  getPatientStats,
  getStats,
  getPackages,
  getDoctors,
  getNotifications,
  markNotificationRead,
  markAllRead,
  getPatients,
} = require('../controllers/dashboardController');
const { protect, doctorOnly, patientOnly } = require('../middleware/authMiddleware');

router.get('/stats',                        protect, patientOnly, getPatientStats);  // PatientDashboard
router.get('/doctor-stats',                 protect, doctorOnly,  getStats);         // DoctorDashboard
router.get('/packages',                     protect, getPackages);
router.get('/doctors',                      protect, getDoctors);
router.get('/notifications',                protect, getNotifications);
router.get('/patients',                     protect, doctorOnly,  getPatients);
router.patch('/notifications/read-all',     protect, markAllRead);
router.patch('/notifications/:id/read',     protect, markNotificationRead);

module.exports = router;