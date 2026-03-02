const db = require('../config/db');
const { sendReminderEmail } = require('./mailer');

// Tracks which appointments already got a reminder (resets on server restart)
const remindersSent = new Set();

const checkAndSendReminders = async () => {
  try {
    const now = new Date();

    // Target window: appointments happening between 89 and 91 minutes from now
    const targetStart = new Date(now.getTime() + 89 * 60 * 1000);
    const targetEnd   = new Date(now.getTime() + 91 * 60 * 1000);

    const startTime = `${String(targetStart.getHours()).padStart(2,'0')}:${String(targetStart.getMinutes()).padStart(2,'0')}:00`;
    const endTime   = `${String(targetEnd.getHours()).padStart(2,'0')}:${String(targetEnd.getMinutes()).padStart(2,'0')}:00`;
    const todayDate = now.toISOString().split('T')[0];

    // Find appointments in the 89–91 min window for today
    const [appointments] = await db.query(
      `SELECT a.*,
        u.name as patient_name, u.email as patient_email,
        tp.name as package_name, tp.pre_requirements, tp.room_number as pkg_room,
        doc.name as doctor_name, d.room_number as doctor_room
       FROM appointments a
       LEFT JOIN users u ON a.patient_id = u.id
       LEFT JOIN test_packages tp ON a.test_package_id = tp.id
       LEFT JOIN users doc ON a.doctor_id = doc.id
       LEFT JOIN doctors d ON a.doctor_id = d.user_id
       WHERE a.appointment_date = ?
         AND a.appointment_time >= ?
         AND a.appointment_time <= ?
         AND a.status IN ('booked','checked_in')`,
      [todayDate, startTime, endTime]
    );

    for (const appt of appointments) {
      if (remindersSent.has(appt.id)) continue;
      remindersSent.add(appt.id);

      try {
        const packageInfo = appt.package_name ? {
          name: appt.package_name,
          pre_requirements: appt.pre_requirements,
          room_number: appt.pkg_room,
        } : null;

        const doctorInfo = appt.doctor_name ? {
          name: appt.doctor_name,
          room_number: appt.doctor_room,
        } : null;

        await sendReminderEmail(
          { name: appt.patient_name, email: appt.patient_email },
          appt,
          packageInfo,
          doctorInfo
        );

        // Also add in-app notification
        await db.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [appt.patient_id, '⏰ Appointment Reminder', `Your appointment is in 1.5 hours at ${appt.appointment_time.slice(0,5)}. Token: ${appt.token_number}. Please get ready!`, 'appointment']
        );

        console.log(`⏰ Reminder sent for appointment ${appt.token_number} to ${appt.patient_email}`);
      } catch (err) {
        console.error(`❌ Reminder failed for ${appt.token_number}:`, err.message);
        remindersSent.delete(appt.id); // allow retry
      }
    }
  } catch (err) {
    console.error('❌ Reminder scheduler error:', err.message);
  }
};

const startReminderScheduler = () => {
  console.log('⏰ Reminder scheduler started — checking every minute');
  // Run immediately once, then every 60 seconds
  checkAndSendReminders();
  setInterval(checkAndSendReminders, 60 * 1000);
};

module.exports = { startReminderScheduler };
