const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Test connection on startup
transporter.verify((err, success) => {
  if (err) console.error('❌ Mail transporter error:', err.message);
  else console.log('✅ Mail server connected and ready');
});

// ── Welcome Email ─────────────────────────────────────────────────
const sendWelcomeEmail = async (user) => {
  const roleLabel = user.role === 'doctor' ? 'Doctor' : 'Patient';
  const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0a6e6e,#064444);padding:40px 32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:8px;">🏥</div>
        <h1 style="color:white;margin:0;font-size:26px;">Welcome to MediCare!</h1>
        <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;">Your account has been created successfully</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#1a202c;font-size:16px;">Hello <strong>${user.name}</strong>,</p>
        <p style="color:#4a5568;line-height:1.7;">Your <strong>${roleLabel}</strong> account at MediCare Government Hospital has been created. Here are your account details:</p>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#718096;font-size:14px;">Name</td><td style="padding:8px 0;font-weight:600;color:#1a202c;">${user.name}</td></tr>
            <tr><td style="padding:8px 0;color:#718096;font-size:14px;">Email</td><td style="padding:8px 0;font-weight:600;color:#1a202c;">${user.email}</td></tr>
            <tr><td style="padding:8px 0;color:#718096;font-size:14px;">Role</td><td style="padding:8px 0;font-weight:600;color:#0a6e6e;text-transform:capitalize;">${roleLabel}</td></tr>
            <tr><td style="padding:8px 0;color:#718096;font-size:14px;">Phone</td><td style="padding:8px 0;font-weight:600;color:#1a202c;">${user.phone || 'Not provided'}</td></tr>
          </table>
        </div>
        ${user.role === 'patient' ? `
        <div style="background:#f0fafa;border:1.5px solid #0a6e6e;border-radius:10px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;color:#0a6e6e;font-size:14px;">✅ You can now book appointments, track your queue and receive digital reports online!</p>
        </div>` : `
        <div style="background:#f0fafa;border:1.5px solid #0a6e6e;border-radius:10px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;color:#0a6e6e;font-size:14px;">✅ You can now manage patient appointments, create reports and monitor the hospital queue.</p>
        </div>`}
        <a href="http://localhost:5173/login" style="display:inline-block;background:linear-gradient(135deg,#0a6e6e,#0d8c8c);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Login to MediCare →</a>
      </div>
      <div style="padding:20px 32px;background:#f1f5f9;text-align:center;color:#94a3b8;font-size:12px;">
        MediCare Government Hospital • This is an automated message, please do not reply.
      </div>
    </div>
  `;
  await transporter.sendMail({
    from: `"MediCare Hospital" <${process.env.MAIL_USER}>`,
    to: user.email,
    subject: `Welcome to MediCare, ${user.name}! 🏥`,
    html,
  });
  console.log(`📧 Welcome email sent to ${user.email}`);
};

// ── Appointment Confirmation Email ────────────────────────────────
const sendAppointmentEmail = async (user, appointment, packageInfo, doctorInfo) => {
  const isConsultation = appointment.appointment_type === 'consultation';
  const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0a6e6e,#064444);padding:40px 32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:8px;">${isConsultation ? '👨‍⚕️' : '🧪'}</div>
        <h1 style="color:white;margin:0;font-size:26px;">Appointment Confirmed!</h1>
        <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;">${isConsultation ? 'Doctor Consultation' : 'Diagnostic Test'} Booking</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#1a202c;font-size:16px;">Hello <strong>${user.name}</strong>,</p>
        <p style="color:#4a5568;line-height:1.7;">Your appointment has been confirmed. Please find the details below:</p>
        <div style="background:linear-gradient(135deg,#0a6e6e,#0d8c8c);border-radius:14px;padding:24px;text-align:center;margin:20px 0;">
          <p style="color:rgba(255,255,255,0.75);margin:0 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Your Token Number</p>
          <p style="color:white;font-size:40px;font-weight:700;letter-spacing:6px;margin:0;">${appointment.token_number}</p>
          <p style="color:rgba(255,255,255,0.6);margin:8px 0 0;font-size:12px;">Show this token at hospital check-in</p>
        </div>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:10px 0;color:#718096;font-size:14px;border-bottom:1px solid #f0f4f8;">Type</td><td style="padding:10px 0;font-weight:600;color:#1a202c;border-bottom:1px solid #f0f4f8;">${isConsultation ? '👨‍⚕️ Doctor Consultation' : '🧪 Diagnostic Test'}</td></tr>
            ${isConsultation
              ? `<tr><td style="padding:10px 0;color:#718096;font-size:14px;border-bottom:1px solid #f0f4f8;">Doctor</td><td style="padding:10px 0;font-weight:600;color:#1a202c;border-bottom:1px solid #f0f4f8;">Dr. ${doctorInfo?.name || 'N/A'}</td></tr>
                 <tr><td style="padding:10px 0;color:#718096;font-size:14px;border-bottom:1px solid #f0f4f8;">Specialization</td><td style="padding:10px 0;font-weight:600;color:#1a202c;border-bottom:1px solid #f0f4f8;">${appointment.specialization || 'N/A'}</td></tr>
                 <tr><td style="padding:10px 0;color:#718096;font-size:14px;border-bottom:1px solid #f0f4f8;">Room</td><td style="padding:10px 0;font-weight:600;color:#1a202c;border-bottom:1px solid #f0f4f8;">${doctorInfo?.room_number || 'TBD'}</td></tr>`
              : `<tr><td style="padding:10px 0;color:#718096;font-size:14px;border-bottom:1px solid #f0f4f8;">Package</td><td style="padding:10px 0;font-weight:600;color:#1a202c;border-bottom:1px solid #f0f4f8;">${packageInfo?.name || 'N/A'}</td></tr>
                 <tr><td style="padding:10px 0;color:#718096;font-size:14px;border-bottom:1px solid #f0f4f8;">Report To</td><td style="padding:10px 0;font-weight:600;color:#0a6e6e;border-bottom:1px solid #f0f4f8;">${packageInfo?.room_number || 'Room 1'}</td></tr>`}
            <tr><td style="padding:10px 0;color:#718096;font-size:14px;border-bottom:1px solid #f0f4f8;">Date</td><td style="padding:10px 0;font-weight:600;color:#1a202c;border-bottom:1px solid #f0f4f8;">${new Date(appointment.appointment_date).toDateString()}</td></tr>
            <tr><td style="padding:10px 0;color:#718096;font-size:14px;">Time</td><td style="padding:10px 0;font-weight:600;color:#1a202c;">${String(appointment.appointment_time).slice(0,5)}</td></tr>
          </table>
        </div>
        ${packageInfo?.pre_requirements ? `
        <div style="background:#fffbf0;border:2px solid #f0a500;border-radius:12px;padding:20px;margin:20px 0;">
          <p style="margin:0 0 8px;font-weight:700;color:#856404;font-size:15px;">⚠️ Pre-Test Requirements</p>
          <p style="margin:0;color:#856404;font-size:14px;line-height:1.7;">${packageInfo.pre_requirements}</p>
        </div>` : ''}
        <a href="http://localhost:5173/patient/appointments" style="display:inline-block;background:linear-gradient(135deg,#0a6e6e,#0d8c8c);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View My Appointments →</a>
      </div>
      <div style="padding:20px 32px;background:#f1f5f9;text-align:center;color:#94a3b8;font-size:12px;">
        MediCare Government Hospital • Please arrive 10 minutes before your scheduled time.
      </div>
    </div>
  `;
  await transporter.sendMail({
    from: `"MediCare Hospital" <${process.env.MAIL_USER}>`,
    to: user.email,
    subject: `Appointment Confirmed — Token ${appointment.token_number} | MediCare 🏥`,
    html,
  });
  console.log(`📧 Appointment email sent to ${user.email}`);
};

// ── Report Ready Email ────────────────────────────────────────────
const sendReportEmail = async (user, report, appointment, pdfBuffer, pdfFilename) => {
  const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0a6e6e,#064444);padding:40px 32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:8px;">📋</div>
        <h1 style="color:white;margin:0;font-size:26px;">Your Report is Ready!</h1>
        <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;">Diagnostic Report Available</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#1a202c;font-size:16px;">Hello <strong>${user.name}</strong>,</p>
        <p style="color:#4a5568;line-height:1.7;">Your diagnostic report is now ready and attached to this email.</p>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:10px 0;color:#718096;font-size:14px;border-bottom:1px solid #f0f4f8;">Report</td><td style="padding:10px 0;font-weight:600;color:#1a202c;border-bottom:1px solid #f0f4f8;">${report.report_title}</td></tr>
            <tr><td style="padding:10px 0;color:#718096;font-size:14px;border-bottom:1px solid #f0f4f8;">Token</td><td style="padding:10px 0;font-weight:600;color:#0a6e6e;border-bottom:1px solid #f0f4f8;">${appointment?.token_number || 'N/A'}</td></tr>
            <tr><td style="padding:10px 0;color:#718096;font-size:14px;">Date</td><td style="padding:10px 0;font-weight:600;color:#1a202c;">${new Date(appointment?.appointment_date || Date.now()).toDateString()}</td></tr>
          </table>
        </div>
        <div style="background:#eaf7ef;border:1.5px solid #2a9d8f;border-radius:10px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;color:#1a6e3c;font-size:14px;">📎 Your report is attached to this email. You can also view it anytime from your patient portal.</p>
        </div>
        <a href="http://localhost:5173/patient/reports" style="display:inline-block;background:linear-gradient(135deg,#0a6e6e,#0d8c8c);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View Report Online →</a>
      </div>
      <div style="padding:20px 32px;background:#f1f5f9;text-align:center;color:#94a3b8;font-size:12px;">
        MediCare Government Hospital • Keep this report for your medical records.
      </div>
    </div>
  `;
  await transporter.sendMail({
    from: `"MediCare Hospital" <${process.env.MAIL_USER}>`,
    to: user.email,
    subject: `Your Report is Ready — ${report.report_title} | MediCare 🏥`,
    html,
    attachments: pdfBuffer ? [{ filename: pdfFilename || 'MediCare_Report.pdf', content: pdfBuffer, contentType: 'application/pdf' }] : [],
  });
  console.log(`📧 Report email sent to ${user.email}`);
};

module.exports = { sendWelcomeEmail, sendAppointmentEmail, sendReportEmail };

// ── OTP Verification Email ────────────────────────────────────────
const sendOTPEmail = async (email, otp, name) => {
  const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0a6e6e,#064444);padding:40px 32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:8px;">🔐</div>
        <h1 style="color:white;margin:0;font-size:26px;">Verify Your Email</h1>
        <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;">MediCare Hospital — Account Registration</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#1a202c;font-size:16px;">Hello <strong>${name}</strong>,</p>
        <p style="color:#4a5568;line-height:1.7;">Use the OTP below to verify your email and complete your registration. This OTP is valid for <strong>10 minutes</strong>.</p>

        <div style="text-align:center;margin:32px 0;">
          <div style="display:inline-block;background:linear-gradient(135deg,#0a6e6e,#0d8c8c);border-radius:16px;padding:28px 48px;">
            <p style="color:rgba(255,255,255,0.7);margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:2px;">Your OTP</p>
            <p style="color:white;font-size:48px;font-weight:700;letter-spacing:12px;margin:0;font-family:monospace;">${otp}</p>
          </div>
        </div>

        <div style="background:#fff8e8;border:2px solid #f0a500;border-radius:10px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;color:#856404;font-size:13px;">⚠️ Do not share this OTP with anyone. MediCare staff will never ask for your OTP. This code expires in <strong>10 minutes</strong>.</p>
        </div>
        <p style="color:#718096;font-size:13px;">If you did not request this, please ignore this email.</p>
      </div>
      <div style="padding:20px 32px;background:#f1f5f9;text-align:center;color:#94a3b8;font-size:12px;">
        MediCare Government Hospital • This is an automated message, please do not reply.
      </div>
    </div>
  `;
  await transporter.sendMail({
    from: `"MediCare Hospital" <${process.env.MAIL_USER}>`,
    to: email,
    subject: `${otp} — Your MediCare Verification Code 🔐`,
    html,
  });
  console.log(`📧 OTP email sent to ${email}`);
};

module.exports.sendOTPEmail = sendOTPEmail;

// ── Appointment Reminder Email (1.5 hours before) ─────────────────
const sendReminderEmail = async (user, appointment, packageInfo, doctorInfo) => {
  const isConsultation = appointment.appointment_type === 'consultation';
  const getArriveBy = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m - 10;
    return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
  };
  const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#f0a500,#c47d00);padding:40px 32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:8px;">⏰</div>
        <h1 style="color:white;margin:0;font-size:26px;">Appointment Reminder!</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">Your appointment is in <strong>1.5 hours</strong></p>
      </div>
      <div style="padding:32px;">
        <p style="color:#1a202c;font-size:16px;">Hello <strong>${user.name}</strong>,</p>
        <p style="color:#4a5568;line-height:1.7;">This is a reminder that your appointment at MediCare Hospital is coming up in <strong>1 hour 30 minutes</strong>. Please start getting ready!</p>
        <div style="background:linear-gradient(135deg,#f0a500,#c47d00);border-radius:14px;padding:24px;text-align:center;margin:20px 0;">
          <p style="color:rgba(255,255,255,0.85);margin:0 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Token Number</p>
          <p style="color:white;font-size:40px;font-weight:700;letter-spacing:6px;margin:0;">${appointment.token_number}</p>
          <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:13px;">📅 ${new Date(appointment.appointment_date).toDateString()} at ${String(appointment.appointment_time).slice(0,5)}</p>
        </div>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">
          <table style="width:100%;border-collapse:collapse;">
            ${isConsultation
              ? `<tr><td style="padding:10px 0;color:#718096;font-size:14px;border-bottom:1px solid #f0f4f8;">Doctor</td><td style="padding:10px 0;font-weight:600;color:#1a202c;border-bottom:1px solid #f0f4f8;">Dr. ${doctorInfo?.name || 'N/A'}</td></tr>
                 <tr><td style="padding:10px 0;color:#718096;font-size:14px;border-bottom:1px solid #f0f4f8;">Room</td><td style="padding:10px 0;font-weight:600;color:#0a6e6e;border-bottom:1px solid #f0f4f8;">🚪 ${doctorInfo?.room_number || 'TBD'}</td></tr>`
              : `<tr><td style="padding:10px 0;color:#718096;font-size:14px;border-bottom:1px solid #f0f4f8;">Package</td><td style="padding:10px 0;font-weight:600;color:#1a202c;border-bottom:1px solid #f0f4f8;">${packageInfo?.name || 'N/A'}</td></tr>
                 <tr><td style="padding:10px 0;color:#718096;font-size:14px;border-bottom:1px solid #f0f4f8;">Go To</td><td style="padding:10px 0;font-weight:600;color:#0a6e6e;border-bottom:1px solid #f0f4f8;">🚪 ${packageInfo?.room_number || 'Room 1'}</td></tr>`}
            <tr><td style="padding:10px 0;color:#718096;font-size:14px;">Time</td><td style="padding:10px 0;font-weight:600;color:#e63946;">
              ${String(appointment.appointment_time).slice(0,5)} — Please arrive by ${getArriveBy(String(appointment.appointment_time))}
            </td></tr>
          </table>
        </div>
        ${packageInfo?.pre_requirements ? `
        <div style="background:#fffbf0;border:2px solid #f0a500;border-radius:12px;padding:20px;margin:20px 0;">
          <p style="margin:0 0 8px;font-weight:700;color:#856404;font-size:15px;">⚠️ Last Reminder — Pre-Test Requirements</p>
          <p style="margin:0;color:#856404;font-size:14px;line-height:1.7;">${packageInfo.pre_requirements}</p>
        </div>` : ''}
        <div style="background:#f0fafa;border:1.5px solid #0a6e6e;border-radius:10px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;color:#0a6e6e;font-size:14px;">📍 Please arrive <strong>10 minutes early</strong> and carry a valid photo ID. Show your token number at the reception.</p>
        </div>
        <a href="http://localhost:5173/patient/appointments" style="display:inline-block;background:linear-gradient(135deg,#f0a500,#c47d00);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View Appointment Details →</a>
      </div>
      <div style="padding:20px 32px;background:#f1f5f9;text-align:center;color:#94a3b8;font-size:12px;">
        MediCare Government Hospital • We look forward to seeing you soon!
      </div>
    </div>
  `;
  await transporter.sendMail({
    from: `"MediCare Hospital" <${process.env.MAIL_USER}>`,
    to: user.email,
    subject: `⏰ Reminder — Your appointment is in 1.5 hours | Token ${appointment.token_number}`,
    html,
  });
  console.log(`📧 Reminder email sent to ${user.email}`);
};

module.exports.sendReminderEmail = sendReminderEmail;
