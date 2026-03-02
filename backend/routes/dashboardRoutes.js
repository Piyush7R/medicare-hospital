const express = require('express');
const router = express.Router();
const { getStats, getPackages, getDoctors, getNotifications, markNotificationRead, getPatients } = require('../controllers/dashboardController');
const { protect, doctorOnly } = require('../middleware/authMiddleware');

router.get('/stats',                    protect, doctorOnly, getStats);
router.get('/packages',                 protect, getPackages);
router.get('/doctors',                  protect, getDoctors);
router.get('/notifications',            protect, getNotifications);
router.put('/notifications/:id/read',   protect, markNotificationRead);
router.get('/patients',                 protect, doctorOnly, getPatients);

module.exports = router;
