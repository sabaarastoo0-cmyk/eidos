const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'لطفاً وارد شوید' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'eidos_secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'کاربر یافت نشد' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'توکن نامعتبر است' });
  }
};

const adminAuth = async (req, res, next) => {
  await auth(req, res, () => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'دسترسی ندارید' });
    next();
  });
};

module.exports = { auth, adminAuth };
