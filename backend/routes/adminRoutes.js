const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Existing routes
router.get('/stats',              protect, adminOnly, ctrl.getStats);
router.get('/doctors/pending',    protect, adminOnly, ctrl.getPendingDoctors);
router.get('/doctors',            protect, adminOnly, ctrl.getAllDoctors);
router.post('/doctors/review',    protect, adminOnly, ctrl.reviewDoctor);
router.get('/patients',           protect, adminOnly, ctrl.getAllPatients);
router.get('/appointments/today', protect, adminOnly, ctrl.getAllAppointments);
router.get('/packages',           protect, adminOnly, ctrl.getPackages);
router.put('/packages/:id',       protect, adminOnly, ctrl.updatePackage);

// Analytics routes
router.get('/analytics/bookings',     protect, adminOnly, ctrl.getBookingAnalytics);
router.get('/analytics/packages',     protect, adminOnly, ctrl.getPackageAnalytics);
router.get('/analytics/departments',  protect, adminOnly, ctrl.getDepartmentLoad);
router.get('/analytics/demographics', protect, adminOnly, ctrl.getDemographicAnalytics);
router.get('/analytics/revenue',      protect, adminOnly, ctrl.getRevenueAnalytics);
router.get('/analytics/feedback',     protect, adminOnly, ctrl.getFeedbackAnalytics);
router.get('/analytics/realtime',     protect, adminOnly, ctrl.getRealtimeOps);

module.exports = router;
