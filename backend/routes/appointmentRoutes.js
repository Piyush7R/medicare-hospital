const express = require('express');
const router = express.Router();
const {
  getAvailableSlots, bookAppointment, uploadImage,
  getMyAppointments, getAllAppointments, getByToken,
  updateStatus, cancelAppointment
} = require('../controllers/appointmentController');
const { protect, doctorOnly, patientOnly } = require('../middleware/authMiddleware');

router.get('/slots', protect, getAvailableSlots);
router.post('/book', protect, patientOnly, bookAppointment);
router.post('/:appointment_id/upload-image', protect, patientOnly, uploadImage);
router.get('/my', protect, patientOnly, getMyAppointments);
router.get('/all', protect, doctorOnly, getAllAppointments);
router.get('/token/:token', protect, getByToken);
router.put('/:id/status', protect, doctorOnly, updateStatus);
router.put('/:id/cancel', protect, patientOnly, cancelAppointment);

module.exports = router;
