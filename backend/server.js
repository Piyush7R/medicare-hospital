const express = require('express');
const path = require('path');
require('dotenv').config();

const authRoutes        = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const reportRoutes      = require('./routes/reportRoutes');
const dashboardRoutes   = require('./routes/dashboardRoutes');
const queueRoutes       = require('./routes/queueRoutes');
const receptionRoutes   = require('./routes/receptionRoutes');
const adminRoutes       = require('./routes/adminRoutes');
const { startReminderScheduler } = require('./utils/reminderScheduler');

const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth',         authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reports',      reportRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/queue',        queueRoutes);
app.use('/api/reception',    receptionRoutes);
app.use('/api/admin',        adminRoutes);
app.get('/', (req, res) => res.json({ message: '🏥 Hospital API running' }));
app.use((req, res) => res.status(404).json({ message: `Cannot ${req.method} ${req.url}` }));
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => { console.log(`✅ Server running on port ${PORT}`); startReminderScheduler(); });
