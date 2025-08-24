const express = require('express');
const router = express.Router();
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('./notificationRoutes');

// ==================== FRIEND REQUESTS ====================

// Send friend request
router.post('/friend-request', authenticate, async (req, res) => {
  try {
    const { userId, message } = req.body;
    const fromUserId = req.user.id;

    // Validation
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    if (userId === fromUserId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot send friend request to yourself' 
      });
    }

    // Check if users exist
    const [fromUser, toUser] = await Promise.all([
      User.findById(fromUserId),
      User.findById(userId)
    ]);

    if (!toUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if already friends
    if (fromUser.friends.includes(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Already friends with this user' 
      });
    }

    // Check if friend request already exists
    let existingRequest = await FriendRequest.findOne({
      $or: [
        { from: fromUserId, to: userId },
        { from: userId, to: fromUserId }
      ]
    });

    if (existingRequest) {
      // If there's a pending request, don't allow another one
      if (existingRequest.status === 'pending') {
        console.log('Found existing pending friend request:', existingRequest);
        return res.status(400).json({ 
          success: false, 
          message: 'Friend request already exists and is pending' 
        });
      }
      
      // If the previous request was declined or accepted, update it to pending
      if (existingRequest.status === 'declined' || existingRequest.status === 'accepted') {
        // Only allow the person who didn't send the original request to send a new one
        // OR allow the same person to resend after declined
        if (existingRequest.status === 'accepted') {
          return res.status(400).json({ 
            success: false, 
            message: 'You are already friends with this user' 
          });
        }
        
        // Update existing declined request to pending
        existingRequest.from = fromUserId;
        existingRequest.to = userId;
        existingRequest.status = 'pending';
        existingRequest.message = message || '';
        await existingRequest.save();
        
        console.log('Updated existing friend request to pending:', existingRequest);
      }
    } else {
      // Create new friend request
      existingRequest = new FriendRequest({
        from: fromUserId,
        to: userId,
        message: message || ''
      });

      await existingRequest.save();
      console.log('Created new friend request:', existingRequest);
    }

    // Create notification for recipient
    try {
      await createNotification(
        userId,
        fromUserId,
        'friend_request',
        `${fromUser.username} sent you a friend request`,
        existingRequest._id
      );
    } catch (notificationError) {
      console.error('Failed to create friend request notification:', notificationError);
      // Don't fail the request if notification creation fails
    }

    res.status(201).json({
      success: true,
      message: 'Friend request sent successfully',
      data: existingRequest
    });

  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send friend request'
    });
  }
});

// Get friend requests (received)
router.get('/friend-requests', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const friendRequests = await FriendRequest.find({
      to: userId,
      status: 'pending'
    })
    .populate('from', 'username email profilePicture bio')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: friendRequests
    });

  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch friend requests'
    });
  }
});

// Respond to friend request
router.post('/friend-request/:requestId/respond', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' or 'decline'
    const userId = req.user.id;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "accept" or "decline"'
      });
    }

    const friendRequest = await FriendRequest.findOne({
      _id: requestId,
      to: userId,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    if (action === 'accept') {
      // Add to friends list for both users
      await Promise.all([
        User.findByIdAndUpdate(
          friendRequest.from,
          { 
            $addToSet: { friends: userId },
            $inc: { friendsCount: 1 }
          }
        ),
        User.findByIdAndUpdate(
          userId,
          { 
            $addToSet: { friends: friendRequest.from },
            $inc: { friendsCount: 1 }
          }
        )
      ]);

      friendRequest.status = 'accepted';

      // Create notification for the person who sent the friend request
      try {
        const currentUser = await User.findById(userId).select('username');
        await createNotification(
          friendRequest.from,
          userId,
          'friend_request_accepted',
          `${currentUser.username} accepted your friend request`,
          friendRequest._id
        );
      } catch (notificationError) {
        console.error('Failed to create friend request accepted notification:', notificationError);
      }
    } else {
      friendRequest.status = 'declined';
    }

    await friendRequest.save();

    res.json({
      success: true,
      message: `Friend request ${action}ed successfully`,
      data: friendRequest
    });

  } catch (error) {
    console.error('Respond to friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to friend request'
    });
  }
});

// ==================== FRIENDS ====================

// Get user's friends
router.get('/friends/:userId?', authenticate, async (req, res) => {
  try {
    const targetUserId = req.params.userId || req.user.id;

    const user = await User.findById(targetUserId)
      .populate('friends', 'username email profilePicture bio friendsCount')
      .select('friends');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.friends
    });

  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch friends'
    });
  }
});

// Remove friend
router.delete('/friend/:friendId', authenticate, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    // Remove from both users' friends lists
    await Promise.all([
      User.findByIdAndUpdate(
        userId,
        { 
          $pull: { friends: friendId },
          $inc: { friendsCount: -1 }
        }
      ),
      User.findByIdAndUpdate(
        friendId,
        { 
          $pull: { friends: userId },
          $inc: { friendsCount: -1 }
        }
      ),
      // Delete ALL friend request records (regardless of status) between these users
      FriendRequest.deleteMany({
        $or: [
          { from: userId, to: friendId },
          { from: friendId, to: userId }
        ]
      })
    ]);

    res.json({
      success: true,
      message: 'Friend removed successfully'
    });

  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove friend'
    });
  }
});

// ==================== FOLLOWING ====================

// Follow user
router.post('/follow/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already following
    const currentUser = await User.findById(currentUserId);
    if (currentUser.following.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Already following this user'
      });
    }

    // Add to following list and update counts
    await Promise.all([
      User.findByIdAndUpdate(
        currentUserId,
        {
          $addToSet: { following: userId },
          $inc: { followingCount: 1 }
        }
      ),
      User.findByIdAndUpdate(
        userId,
        {
          $addToSet: { followers: currentUserId },
          $inc: { followersCount: 1 }
        }
      )
    ]);

    // Create notification for the user being followed
    try {
      await createNotification(
        userId,
        currentUserId,
        'new_follower',
        `${currentUser.username} started following you`,
        null
      );
    } catch (notificationError) {
      console.error('Failed to create new follower notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'User followed successfully'
    });

  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to follow user'
    });
  }
});

// Unfollow user
router.post('/unfollow/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Remove from following list and update counts
    await Promise.all([
      User.findByIdAndUpdate(
        currentUserId,
        {
          $pull: { following: userId },
          $inc: { followingCount: -1 }
        }
      ),
      User.findByIdAndUpdate(
        userId,
        {
          $pull: { followers: currentUserId },
          $inc: { followersCount: -1 }
        }
      )
    ]);

    res.json({
      success: true,
      message: 'User unfollowed successfully'
    });

  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unfollow user'
    });
  }
});

// Get following list
router.get('/following/:userId?', authenticate, async (req, res) => {
  try {
    const targetUserId = req.params.userId || req.user.id;

    const user = await User.findById(targetUserId)
      .populate('following', 'username email profilePicture bio followersCount')
      .select('following');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.following
    });

  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch following list'
    });
  }
});

// Get followers list
router.get('/followers/:userId?', authenticate, async (req, res) => {
  try {
    const targetUserId = req.params.userId || req.user.id;

    const user = await User.findById(targetUserId)
      .populate('followers', 'username email profilePicture bio followersCount')
      .select('followers');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.followers
    });

  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch followers list'
    });
  }
});

// ==================== SEARCH & DISCOVERY ====================

// Search users
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.id;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const users = await User.find({
      _id: { $ne: currentUserId }, // Exclude current user
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
    .select('username email profilePicture bio friendsCount followersCount')
    .limit(20);

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users'
    });
  }
});

// Helper to ensure absolute URL for images
const makeAbsoluteUrl = (value, req) => {
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.startsWith('/') ? value : `/${value}`;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}${path}`;
};

// Get user profile (public)
router.get('/profile/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const user = await User.findById(userId)
      .populate('bookshelf', 'title author coverImage')
      .populate('currentlyReading', 'title author coverImage')
      .select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check relationship status
    const currentUser = await User.findById(currentUserId);
    const relationshipStatus = {
      isFriend: currentUser.friends.includes(userId),
      isFollowing: currentUser.following.includes(userId),
      isFollower: currentUser.followers.includes(userId)
    };

    // Check if there's a pending friend request
    const pendingRequest = await FriendRequest.findOne({
      $or: [
        { from: currentUserId, to: userId, status: 'pending' },
        { from: userId, to: currentUserId, status: 'pending' }
      ]
    });

  // Ensure absolute URL for profile picture
  const userObj = user.toObject();
  userObj.profilePicture = makeAbsoluteUrl(userObj.profilePicture, req);

  res.json({
      success: true,
      data: {
    user: userObj,
        relationshipStatus,
        pendingFriendRequest: pendingRequest
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

module.exports = router;
