const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token, unauthorized' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

const doctorOnly = (req, res, next) => {
  if (!['doctor', 'admin'].includes(req.user.role))
    return res.status(403).json({ message: 'Doctor access only' });
  next();
};

const patientOnly = (req, res, next) => {
  if (req.user.role !== 'patient')
    return res.status(403).json({ message: 'Patient access only' });
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Admin access only' });
  next();
};

const receptionOnly = (req, res, next) => {
  if (!['reception', 'admin'].includes(req.user.role))
    return res.status(403).json({ message: 'Reception access only' });
  next();
};

module.exports = { protect, doctorOnly, patientOnly, adminOnly, receptionOnly };
