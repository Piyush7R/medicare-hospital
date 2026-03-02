const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getAppointmentByToken, createReport, getMyReports, getAllReports } = require('../controllers/reportController');
const { protect, doctorOnly, patientOnly } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `report_${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.get('/token/:token', protect, doctorOnly, getAppointmentByToken);
router.post('/', protect, doctorOnly, upload.single('pdf_file'), createReport);
router.get('/my', protect, patientOnly, getMyReports);
router.get('/all', protect, doctorOnly, getAllReports);

module.exports = router;
