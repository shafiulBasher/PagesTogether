const mongoose = require('mongoose');

// Reusable like subdocument
const likeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

// Reply schema with recursive nesting
const replySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, required: true, maxlength: 500 },
  likes: [likeSchema],
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

// Add recursive children (replies of replies)
replySchema.add({ replies: [replySchema] });

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, required: true, maxlength: 500 },
  likes: [likeSchema],
  replies: [replySchema],
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const groupPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  type: {
    type: String,
    enum: ['announcement', 'discussion', 'recommendation', 'megathread'],
    default: 'discussion'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  likes: [likeSchema],
  comments: [commentSchema],
  likesCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Update counts when likes/comments change
groupPostSchema.pre('save', function(next) {
  this.likesCount = this.likes.length;
  this.commentsCount = this.comments.length;
  next();
});

// Index for search and sorting
groupPostSchema.index({ group: 1, createdAt: -1 });
groupPostSchema.index({ group: 1, isPinned: -1, createdAt: -1 });
groupPostSchema.index({ author: 1 });

module.exports = mongoose.model('GroupPost', groupPostSchema);
