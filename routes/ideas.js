const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Idea = require('../models/Idea');
const { auth, adminAuth } = require('../middleware/auth');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Get all ideas (Latest or Trending) — pinned ideas always appear first
router.get('/', async (req, res) => {
  try {
    const { sort = 'latest', page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const searchFilter = search
      ? { $or: [
          { title: { $regex: search, $options: 'i' } },
          { authorUsername: { $regex: search, $options: 'i' } },
          { domain: { $regex: search, $options: 'i' } }
        ] }
      : {};

    let ideas;
    if (sort === 'trending') {
      ideas = await Idea.aggregate([
        { $match: searchFilter },
        { $addFields: { likeCount: { $size: '$likes' } } },
        { $sort: { pinned: -1, pinnedAt: -1, likeCount: -1, createdAt: -1 } },
        { $skip: skip }, { $limit: parseInt(limit) }
      ]);
    } else {
      ideas = await Idea.find(searchFilter)
        .sort({ pinned: -1, pinnedAt: -1, createdAt: -1 })
        .skip(skip).limit(parseInt(limit)).lean();
    }
    const total = await Idea.countDocuments(searchFilter);
    res.json({ ideas, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'خطا در دریافت ایده‌ها' });
  }
});

// Get single idea
router.get('/:id', async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ error: 'ایده یافت نشد' });
    res.json(idea);
  } catch {
    res.status(500).json({ error: 'خطا' });
  }
});

// Create idea
router.post('/', auth, upload.fields([{ name: 'pdfFile' }, { name: 'imageFile' }]), async (req, res) => {
  try {
    const data = req.body;
    if (!data.title || !data.description)
      return res.status(400).json({ error: 'عنوان و شرح ایده الزامی است' });

    const idea = new Idea({
      ...data,
      author: req.user._id,
      authorUsername: req.user.username,
      pdfFile: req.files?.pdfFile?.[0]?.filename,
      imageFile: req.files?.imageFile?.[0]?.filename
    });
    await idea.save();
    res.status(201).json(idea);
  } catch (err) {
    res.status(500).json({ error: 'خطا در ثبت ایده' });
  }
});

// Like/Unlike idea
router.post('/:id/like', auth, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ error: 'ایده یافت نشد' });
    const userId = req.user._id;
    const liked = idea.likes.includes(userId);
    if (liked) {
      idea.likes = idea.likes.filter(id => !id.equals(userId));
    } else {
      idea.likes.push(userId);
    }
    await idea.save();
    res.json({ likes: idea.likes.length, liked: !liked });
  } catch {
    res.status(500).json({ error: 'خطا' });
  }
});

// Add comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'متن کامنت الزامی است' });
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ error: 'ایده یافت نشد' });
    idea.comments.push({ user: req.user._id, username: req.user.username, text });
    await idea.save();
    res.json(idea.comments[idea.comments.length - 1]);
  } catch {
    res.status(500).json({ error: 'خطا در ثبت نظر' });
  }
});

// Delete idea (admin or owner)
router.delete('/:id', auth, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ error: 'ایده یافت نشد' });
    if (!req.user.isAdmin && !idea.author.equals(req.user._id))
      return res.status(403).json({ error: 'دسترسی ندارید' });
    await idea.deleteOne();
    res.json({ message: 'ایده حذف شد' });
  } catch {
    res.status(500).json({ error: 'خطا در حذف' });
  }
});

// Pin/Unpin idea (admin only)
router.post('/:id/pin', adminAuth, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ error: 'ایده یافت نشد' });
    idea.pinned = !idea.pinned;
    idea.pinnedAt = idea.pinned ? new Date() : null;
    await idea.save();
    res.json({ pinned: idea.pinned });
  } catch {
    res.status(500).json({ error: 'خطا در پین کردن' });
  }
});

module.exports = router;
