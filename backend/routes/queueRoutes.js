const express = require('express');
const router = express.Router();
const { getPatientQueue, checkInPatient, completeTest, getRoomQueue, getAllRoomsQueue, getLiveStats } = require('../controllers/queueController');
const { protect, doctorOnly, patientOnly } = require('../middleware/authMiddleware');

router.get('/my', protect, patientOnly, getPatientQueue);
router.post('/checkin', protect, doctorOnly, checkInPatient);
router.post('/complete-test', protect, doctorOnly, completeTest);
router.get('/room/:room_id', protect, doctorOnly, getRoomQueue);
router.get('/rooms', protect, doctorOnly, getAllRoomsQueue);
router.get('/live-stats', protect, doctorOnly, getLiveStats);

module.exports = router;
