const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'همه فیلدها الزامی است' });
    if (password.length < 8)
      return res.status(400).json({ error: 'رمز عبور باید حداقل ۸ کاراکتر باشد' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ error: 'ایمیل یا نام کاربری قبلاً ثبت شده' });

    const user = new User({ username, email, password });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'eidos_secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, isAdmin: user.isAdmin } });
  } catch (err) {
    res.status(500).json({ error: 'خطا در ثبت‌نام' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user) return res.status(400).json({ error: 'کاربر یافت نشد' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ error: 'رمز عبور اشتباه است' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'eidos_secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, isAdmin: user.isAdmin } });
  } catch (err) {
    res.status(500).json({ error: 'خطا در ورود' });
  }
});

module.exports = router;
