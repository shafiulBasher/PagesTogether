const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getGroupPosts,
  getPinnedPosts,
  createPost,
  addComment,
  toggleLike,
  toggleCommentLike,
  addReply,
  pinPost,
  unpinPost
} = require('../controllers/groupPostController');

// Get posts for a specific group
router.get('/:groupId/posts', authenticate, getGroupPosts);

// Get pinned posts (community highlights)
router.get('/:groupId/pinned', authenticate, getPinnedPosts);

// Create new post in a group
router.post('/:groupId/posts', authenticate, createPost);

// Add comment to post
router.post('/posts/:postId/comments', authenticate, addComment);

// Like/unlike post
router.post('/posts/:postId/like', authenticate, toggleLike);

// Like/unlike comment
router.post('/posts/:postId/comments/:commentId/like', authenticate, toggleCommentLike);

// Add reply to comment
router.post('/posts/:postId/comments/:commentId/replies', authenticate, addReply);

// Like/unlike reply
router.post('/posts/:postId/comments/:commentId/replies/:replyId/like', authenticate, require('../controllers/groupPostController').toggleReplyLike);

// Delete post (moderator/creator/admin)
router.delete('/posts/:postId', authenticate, require('../controllers/groupPostController').deletePost);

// Delete comment (owner or moderator/creator/admin)
router.delete('/posts/:postId/comments/:commentId', authenticate, require('../controllers/groupPostController').deleteComment);

// Delete reply (owner or moderator/creator/admin)
router.delete('/posts/:postId/comments/:commentId/replies/:replyId', authenticate, require('../controllers/groupPostController').deleteReply);

// Pin/unpin post (moderator-only)
router.post('/posts/:postId/pin', authenticate, pinPost);
router.post('/posts/:postId/unpin', authenticate, unpinPost);

module.exports = router;
