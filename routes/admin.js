const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Idea = require('../models/Idea');
const { adminAuth } = require('../middleware/auth');

// GET /api/admin/stats — site-wide statistics (admin only)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalIdeas = await Idea.countDocuments();
    const pinnedCount = await Idea.countDocuments({ pinned: true });

    const ideas = await Idea.find().select('likes comments domain createdAt authorUsername title').lean();

    const totalLikes = ideas.reduce((sum, i) => sum + (i.likes?.length || 0), 0);
    const totalComments = ideas.reduce((sum, i) => sum + (i.comments?.length || 0), 0);

    // Top domains
    const domainCounts = {};
    ideas.forEach(i => {
      const d = i.domain?.trim() || 'نامشخص';
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    });
    const topDomains = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, count }));

    // Most liked idea
    const mostLiked = ideas.length
      ? ideas.reduce((max, i) => (i.likes.length > (max?.likes.length || -1) ? i : max), null)
      : null;

    // Recent signups (last 5)
    const recentUsers = await User.find().select('username email createdAt').sort({ createdAt: -1 }).limit(5).lean();

    // Ideas per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentIdeas = ideas.filter(i => new Date(i.createdAt) >= sevenDaysAgo);

    res.json({
      totalUsers,
      totalIdeas,
      totalLikes,
      totalComments,
      pinnedCount,
      topDomains,
      mostLiked: mostLiked ? { title: mostLiked.title, likes: mostLiked.likes.length, author: mostLiked.authorUsername } : null,
      recentUsers,
      ideasLast7Days: recentIdeas.length
    });
  } catch (err) {
    res.status(500).json({ error: 'خطا در دریافت آمار' });
  }
});

module.exports = router;
