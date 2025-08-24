const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'friend_request',
      'friend_request_accepted',
  'new_follower',
  // Group invitations
  'group_invite',
  'group_invite_accepted',
  'group_invite_declined',
  // Group post interactions
  'post_like',
  'post_comment',
  'comment_like',
  'comment_reply',
  'reply_like'
    ]
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    // This could reference a friend request, user, etc.
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
