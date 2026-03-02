// In-memory OTP store: { email: { otp, expiresAt, userData } }
const otpStore = new Map();

const setOTP = (email, otp, userData) => {
  otpStore.set(email.toLowerCase(), {
    otp: String(otp),
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    userData,
  });
};

const getOTP = (email) => {
  return otpStore.get(email.toLowerCase()) || null;
};

const deleteOTP = (email) => {
  otpStore.delete(email.toLowerCase());
};

const isExpired = (entry) => {
  return Date.now() > entry.expiresAt;
};

module.exports = { setOTP, getOTP, deleteOTP, isExpired };
