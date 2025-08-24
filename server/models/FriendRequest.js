const mongoose = require('mongoose');

const FriendRequestSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  message: {
    type: String,
    maxlength: 200
  }
}, { 
  timestamps: true 
});

// Prevent duplicate friend requests between same users
FriendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

// Index for performance
FriendRequestSchema.index({ to: 1, status: 1 });
FriendRequestSchema.index({ from: 1, status: 1 });

module.exports = mongoose.model('FriendRequest', FriendRequestSchema);
