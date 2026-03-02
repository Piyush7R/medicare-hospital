const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail, sendOTPEmail } = require('../utils/mailer');
const { setOTP, getOTP, deleteOTP, isExpired } = require('../utils/otpStore');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// Step 1: Send OTP to email
const sendOTP = async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name)
    return res.status(400).json({ message: 'Email and name are required' });

  try {
    // Check if email already registered
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(400).json({ message: 'Email already registered. Please login.' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Store OTP with user data temporarily
    setOTP(email, otp, { name, email });

    // Send email
    await sendOTPEmail(email, otp, name);

    res.json({ message: 'OTP sent to your email. Valid for 10 minutes.' });
  } catch (err) {
    console.error('OTP send error:', err.message);
    res.status(500).json({ message: 'Failed to send OTP. Check your email address.', error: err.message });
  }
};

// Step 2: Verify OTP
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ message: 'Email and OTP are required' });

  const entry = getOTP(email);

  if (!entry)
    return res.status(400).json({ message: 'OTP not found. Please request a new one.' });

  if (isExpired(entry))  {
    deleteOTP(email);
    return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
  }

  if (entry.otp !== String(otp).trim())
    return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });

  // OTP verified — don't delete yet, keep for register step
  res.json({ message: 'OTP verified successfully!', verified: true });
};

// Step 3: Complete Registration (only after OTP verified)
const register = async (req, res) => {
  const { name, email, password, role, phone, specialization, qualification, room_number, age, gender, blood_group, address, otp } = req.body;

  if (!name || !email || !password || !role || !otp)
    return res.status(400).json({ message: 'All fields including OTP are required' });

  // Re-verify OTP before completing registration
  const entry = getOTP(email);
  if (!entry)
    return res.status(400).json({ message: 'OTP session expired. Please start registration again.' });
  if (isExpired(entry)) {
    deleteOTP(email);
    return res.status(400).json({ message: 'OTP expired. Please start registration again.' });
  }
  if (entry.otp !== String(otp).trim())
    return res.status(400).json({ message: 'Invalid OTP. Please verify your email first.' });

  if (!['patient', 'doctor'].includes(role))
    return res.status(400).json({ message: 'Role must be patient or doctor' });

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(400).json({ message: 'Email already registered.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, phone || null]
    );
    const userId = result.insertId;

    if (role === 'doctor') {
      await db.query(
        'INSERT INTO doctors (user_id, specialization, qualification, room_number) VALUES (?, ?, ?, ?)',
        [userId, specialization || 'General', qualification || '', room_number || '']
      );
    } else {
      await db.query(
        'INSERT INTO patients (user_id, age, gender, blood_group, address) VALUES (?, ?, ?, ?, ?)',
        [userId, age || null, gender || null, blood_group || null, address || null]
      );
    }

    // OTP used — delete it
    deleteOTP(email);

    // Send welcome email
    try {
      await sendWelcomeEmail({ name, email, role, phone });
    } catch (mailErr) {
      console.error('Welcome email failed:', mailErr.message);
    }

    res.status(201).json({ message: 'Registration successful! Please login.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0)
      return res.status(400).json({ message: 'Invalid email or password' });
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: 'Invalid email or password' });
    const token = generateToken(user);
    let profile = null;
    if (user.role === 'doctor') {
      const [docs] = await db.query('SELECT * FROM doctors WHERE user_id = ?', [user.id]);
      profile = docs[0] || null;
    } else if (user.role === 'patient') {
      const [pats] = await db.query('SELECT * FROM patients WHERE user_id = ?', [user.id]);
      profile = pats[0] || null;
    }
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, profile } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = users[0];
    let profile = null;
    if (user.role === 'doctor') {
      const [docs] = await db.query('SELECT * FROM doctors WHERE user_id = ?', [user.id]);
      profile = docs[0] || null;
    } else if (user.role === 'patient') {
      const [pats] = await db.query('SELECT * FROM patients WHERE user_id = ?', [user.id]);
      profile = pats[0] || null;
    }
    res.json({ ...user, profile });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { sendOTP, verifyOTP, register, login, getProfile };
