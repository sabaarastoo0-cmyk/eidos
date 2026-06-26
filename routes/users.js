const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Idea = require('../models/Idea');
const { auth } = require('../middleware/auth');

// Get user profile + their ideas
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
    const ideas = await Idea.find({ author: user._id }).sort({ createdAt: -1 });
    res.json({ user, ideas });
  } catch {
    res.status(500).json({ error: 'خطا' });
  }
});

module.exports = router;
