const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getGroups,
  getFeaturedGroups,
  getPopularGroups,
  getGroupById,
  createGroup,
  joinGroup,
  leaveGroup,
  getCategories,
  promoteToModerator,
  demoteModerator,
  removeMember,
  uploadGroupImage,
  uploadGroupCover,
  inviteMembers,
  acceptInvitation,
  declineInvitation
} = require('../controllers/groupController');

// Public routes (no authentication required)
router.get('/', optionalAuth, getGroups);
router.get('/featured', optionalAuth, getFeaturedGroups);
router.get('/popular', optionalAuth, getPopularGroups);
router.get('/categories', getCategories);
router.get('/:id', optionalAuth, getGroupById);

// Protected routes (authentication required)
router.post('/', authenticate, createGroup);
router.post('/:id/join', authenticate, joinGroup);
router.post('/:id/leave', authenticate, leaveGroup);

// Moderator/admin management routes (protected)
router.post('/:id/moderators', authenticate, promoteToModerator); // body: { userId }
router.delete('/:id/moderators/:userId', authenticate, demoteModerator);
router.delete('/:id/members/:userId', authenticate, removeMember);

// Image upload routes (protected)
router.post('/:id/image', authenticate, (req, res, next) => { req.forGroupUpload = true; next(); }, upload.single('image'), uploadGroupImage);
router.post('/:id/cover', authenticate, (req, res, next) => { req.forGroupUpload = true; next(); }, upload.single('cover'), uploadGroupCover);

// Group invitations
router.post('/:id/invite', authenticate, inviteMembers); // body: { recipients: [userId, ...] }
router.post('/:id/invitations/accept', authenticate, acceptInvitation); // body: { notificationId }
router.post('/:id/invitations/decline', authenticate, declineInvitation); // body: { notificationId }

module.exports = router;
