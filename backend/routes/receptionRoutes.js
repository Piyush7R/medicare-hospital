const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/receptionController');
const { protect, receptionOnly } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `report_${Date.now()}_${file.originalname}`),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/token/:token',          protect, receptionOnly, ctrl.getAppointmentByToken);
router.post('/confirm-payment',      protect, receptionOnly, ctrl.confirmPaymentAndCheckIn);
router.get('/today',                 protect, receptionOnly, ctrl.getTodayAppointments);
router.post('/upload-report',        protect, receptionOnly, upload.single('pdf_file'), ctrl.uploadReport);
router.get('/reports',               protect, receptionOnly, ctrl.getReceptionReports);

module.exports = router;
