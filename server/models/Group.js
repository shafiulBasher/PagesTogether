const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Romance',
      'Science fiction',
      'Short stories',
      'Thrillers',
      'Science Fiction',
      'Fantasy',
      'Historical Fiction',
      'Young-Adult',
      'Autobiography',
      'Self-Help/Personal Development',
      'Cooking',
      'Business',
      'Health & Fitness',
      'Mystery and suspense',
      'Political thriller',
      'Poetry',
      'Plays',
      'Action/Adventure',
      'Classic fiction',
      'Non-fiction'
    ]
  },
  tags: [{
    type: String,
    lowercase: true
  }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  memberCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  image: {
    type: String,
    default: null
  },
  // Cover image/banner for the group page
  coverImage: {
    type: String,
    default: null
  },
  rules: {
    type: String,
    default: 'Please follow our community guidelines to maintain a respectful and engaging environment for all members.'
  },
  isPrivate: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Update memberCount when members array changes
groupSchema.pre('save', function(next) {
  this.memberCount = this.members.length;
  next();
});

// Index for search functionality
groupSchema.index({ name: 'text', description: 'text' });
groupSchema.index({ category: 1 });
groupSchema.index({ tags: 1 });
groupSchema.index({ memberCount: -1 });
groupSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('Group', groupSchema);
