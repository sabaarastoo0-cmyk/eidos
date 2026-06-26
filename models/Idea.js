const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: String,
  text: { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now }
});

const ideaSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorUsername: String,

  // Section 1
  title: { type: String, required: true, trim: true },
  domain: String,
  similarIdea: String,

  // Section 2
  description: { type: String, required: true },
  problemSolved: String,
  importance: String,
  consequences: String,

  // Section 3
  solution: String,
  differentiator: String,
  prototype: String,

  // Section 4
  executionSteps: String,
  phases: String,
  duration: String,
  resources: String,
  budget: String,

  // Section 5
  audience: String,
  value: String,
  competitors: String,

  // Section 6
  challenges: String,
  riskManagement: String,
  futureVision: String,

  // Section 7
  pdfFile: String,
  imageFile: String,
  demoLink: String,

  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  pinned: { type: Boolean, default: false },
  pinnedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Idea', ideaSchema);
