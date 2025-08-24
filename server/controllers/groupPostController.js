const GroupPost = require('../models/GroupPost');
const Group = require('../models/Group');
const { createNotification } = require('../routes/notificationRoutes');

// Get posts for a specific group
const getGroupPosts = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 10, type } = req.query;
    
    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    const userIdStr = req.user.id.toString();
    const isCreator = group.creator.toString() === userIdStr;
    const isAdmin = group.admins.some(adminId => adminId.toString() === userIdStr);
    const isModerator = group.moderators.some(modId => modId.toString() === userIdStr);
    const isMember = group.members.some(member => {
      if (!member || !member.user) return false;
      const mid = member.user._id ? member.user._id.toString() : member.user.toString();
      return mid === userIdStr;
    });

    if (!isCreator && !isAdmin && !isModerator && !isMember) {
      console.warn('getGroupPosts forbidden:', {
        groupId,
        userId: userIdStr,
        isCreator,
        isAdmin,
        isModerator,
        isMember
      });
      return res.status(403).json({
        success: false,
        message: 'You must be a member to view group posts'
      });
    }
    
    let query = { group: groupId };
    if (type) {
      query.type = type;
    }
    
    const skip = (page - 1) * limit;
    
    const posts = await GroupPost.find(query)
      .populate('author', 'username profilePicture')
      .populate('comments.user', 'username profilePicture')
      .populate('comments.replies.user', 'username profilePicture')
      .populate('comments.replies.replies.user', 'username profilePicture')
      .populate('comments.replies.replies.replies.user', 'username profilePicture')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Normalize image URLs
    const makeAbsoluteUrl = (val, req) => {
      if (!val) return val;
      if (/^https?:\/\//i.test(val)) return val;
      const p = val.startsWith('/') ? val : `/${val}`;
      return `${req.protocol}://${req.get('host')}${p}`;
    };
    const normalizePost = (post) => {
      const p = post.toObject ? post.toObject() : post;
      if (p.author && p.author.profilePicture) {
        p.author.profilePicture = makeAbsoluteUrl(p.author.profilePicture, req);
      }
      (p.comments || []).forEach(c => {
        if (c.user && c.user.profilePicture) {
          c.user.profilePicture = makeAbsoluteUrl(c.user.profilePicture, req);
        }
        (c.replies || []).forEach(r => {
          if (r.user && r.user.profilePicture) {
            r.user.profilePicture = makeAbsoluteUrl(r.user.profilePicture, req);
          }
          (r.replies || []).forEach(r2 => {
            if (r2.user && r2.user.profilePicture) {
              r2.user.profilePicture = makeAbsoluteUrl(r2.user.profilePicture, req);
            }
            (r2.replies || []).forEach(r3 => {
              if (r3.user && r3.user.profilePicture) {
                r3.user.profilePicture = makeAbsoluteUrl(r3.user.profilePicture, req);
              }
            });
          });
        });
      });
      return p;
    };
    const normalizedPosts = posts.map(normalizePost);
    
    const totalPosts = await GroupPost.countDocuments(query);
    const totalPages = Math.ceil(totalPosts / limit);
    
    res.json({
      success: true,
      posts: normalizedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPosts,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get group posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group posts'
    });
  }
};

// Get pinned posts (community highlights)
const getPinnedPosts = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    const userIdStr = req.user.id.toString();
    const isMember = group.members.some(member => {
                       if (!member || !member.user) return false;
                       const mid = member.user._id ? member.user._id.toString() : member.user.toString();
                       return mid === userIdStr;
                     }) ||
           group.creator.toString() === userIdStr ||
           group.admins.some(admin => admin.toString() === userIdStr) ||
           group.moderators.some(mod => mod.toString() === userIdStr);
    
    // Only return posts if user is a member
    if (!isMember) {
      console.info('getPinnedPosts: non-member access, returning empty', {
        groupId,
        userId: userIdStr
      });
      return res.json({
        success: true,
        posts: [] // Empty array for non-members
      });
    }
    
    const pinnedPosts = await GroupPost.find({ 
      group: groupId, 
      isPinned: true 
    })
      .populate('author', 'username profilePicture')
      .sort({ createdAt: -1 })
      .limit(6);
    // Normalize URLs
    const makeAbsoluteUrl = (val, req) => {
      if (!val) return val;
      if (/^https?:\/\//i.test(val)) return val;
      const p = val.startsWith('/') ? val : `/${val}`;
      return `${req.protocol}://${req.get('host')}${p}`;
    };
    const normalized = pinnedPosts.map(p => {
      const o = p.toObject ? p.toObject() : p;
      if (o.author && o.author.profilePicture) {
        o.author.profilePicture = makeAbsoluteUrl(o.author.profilePicture, req);
      }
      return o;
    });

    res.json({
      success: true,
      posts: normalized
    });
  } catch (error) {
    console.error('Get pinned posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pinned posts'
    });
  }
};

// Create new post
const createPost = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { title, content, type = 'discussion' } = req.body;
  const userId = req.user.id;

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Permissions: allow creator/admin/moderator/members
    const userIdStr = userId.toString();
    const isCreator = group.creator.toString() === userIdStr;
    const isAdmin = group.admins.some(adminId => adminId.toString() === userIdStr);
    const isModerator = group.moderators.some(modId => modId.toString() === userIdStr);
    const isMember = group.members.some(member => {
      if (!member || !member.user) return false;
      const mid = member.user._id ? member.user._id.toString() : member.user.toString();
      return mid === userIdStr;
    });

    if (!isCreator && !isAdmin && !isModerator && !isMember) {
      console.warn('createPost forbidden:', {
        groupId,
        userId: userIdStr,
        isCreator,
        isAdmin,
        isModerator,
        isMember
      });
      return res.status(403).json({
        success: false,
        message: 'You must be a member to create posts'
      });
    }
    
    const post = new GroupPost({
      title,
      content,
      author: userId,
      group: groupId,
      type
    });
    
    await post.save();
  await post.populate('author', 'username profilePicture');
    const makeAbsoluteUrl = (val, req) => {
      if (!val) return val;
      if (/^https?:\/\//i.test(val)) return val;
      const p = val.startsWith('/') ? val : `/${val}`;
      return `${req.protocol}://${req.get('host')}${p}`;
    };
    const postObj = post.toObject();
    if (postObj.author && postObj.author.profilePicture) {
      postObj.author.profilePicture = makeAbsoluteUrl(postObj.author.profilePicture, req);
    }
    
  // Update group's last activity
  group.lastActivity = new Date();
  await group.save();
    
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: postObj
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create post'
    });
  }
};

// Add comment to post
const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
  const userId = req.user.id;
    
  const post = await GroupPost.findById(postId).populate('group');
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Verify user is a member of the group
    const group = await Group.findById(post.group._id);
    const userIdStr = userId.toString();
    const isCreator = group.creator.toString() === userIdStr;
    const isAdmin = group.admins.some(adminId => adminId.toString() === userIdStr);
    const isModerator = group.moderators.some(modId => modId.toString() === userIdStr);
    const isMember = group.members.some(member => {
      if (!member || !member.user) return false;
      const mid = member.user._id ? member.user._id.toString() : member.user.toString();
      return mid === userIdStr;
    });

    if (!isCreator && !isAdmin && !isModerator && !isMember) {
      console.warn('addComment forbidden:', {
        postId,
        groupId: post.group._id.toString(),
        userId: userIdStr,
        isCreator,
        isAdmin,
        isModerator,
        isMember
      });
      return res.status(403).json({
        success: false,
        message: 'You must be a member to comment'
      });
    }
    
    post.comments.push({
      user: userId,
      content
    });
    
    await post.save();
  await post.populate('comments.user', 'username profilePicture');
  await post.populate('comments.replies.user', 'username profilePicture');
    // Update group's last activity
    try {
      group.lastActivity = new Date();
      await group.save();
    } catch (e) {
      console.warn('Failed to update group lastActivity after comment:', e?.message);
    }

    // Notify post author about new comment (if not self)
    try {
      const postAuthorId = (post.author && post.author._id) ? post.author._id.toString() : post.author.toString();
      if (postAuthorId !== userIdStr) {
        const titleSnippet = (post.title || '').slice(0, 80);
        await createNotification(
          postAuthorId,
          userId,
          'post_comment',
          `${req.user.username} commented on your post: "${titleSnippet}"`,
          post.group?._id || post.group
        );
      }
    } catch (e) {
      console.error('Create notification (post_comment) failed:', e);
    }
    const makeAbsoluteUrl = (val, req) => {
      if (!val) return val;
      if (/^https?:\/\//i.test(val)) return val;
      const p = val.startsWith('/') ? val : `/${val}`;
      return `${req.protocol}://${req.get('host')}${p}`;
    };
    const comment = post.comments[post.comments.length - 1];
    const commentObj = comment.toObject ? comment.toObject() : comment;
    if (commentObj.user && commentObj.user.profilePicture) {
      commentObj.user.profilePicture = makeAbsoluteUrl(commentObj.user.profilePicture, req);
    }
    (commentObj.replies || []).forEach(r => {
      if (r.user && r.user.profilePicture) {
        r.user.profilePicture = makeAbsoluteUrl(r.user.profilePicture, req);
      }
    });

    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: commentObj
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
};

// Like/unlike post
const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
  const userId = req.user.id;
  const currentUserIdStr = userId.toString();
    
    const post = await GroupPost.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    // Ensure the liker is a member of the group
  const group = await Group.findById(post.group);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    const isCreator = group.creator.toString() === currentUserIdStr;
    const isAdmin = group.admins.some(adminId => adminId.toString() === currentUserIdStr);
    const isModerator = group.moderators.some(modId => modId.toString() === currentUserIdStr);
    const isMember = group.members.some(m => {
      if (!m || !m.user) return false;
      const mid = m.user._id ? m.user._id.toString() : m.user.toString();
      return mid === currentUserIdStr;
    });
    if (!isCreator && !isAdmin && !isModerator && !isMember) {
      console.warn('toggleLike forbidden:', {
        postId,
        groupId: post.group.toString(),
  userId: currentUserIdStr,
        isCreator,
        isAdmin,
        isModerator,
        isMember
      });
      return res.status(403).json({ success: false, message: 'You must be a member to like posts' });
    }
    
    // Toggle like by current user (ensure strict string comparison)
    const alreadyLiked = post.likes.some(like => {
      if (!like || !like.user) return false;
      // like.user may be an ObjectId or a populated User document
      const id = like.user._id ? like.user._id.toString() : like.user.toString();
      return id === currentUserIdStr;
    });
    if (alreadyLiked) {
      // Remove all likes from this user to prevent duplicates lingering
      post.likes = post.likes.filter(like => {
        if (!like || !like.user) return true;
        const id = like.user._id ? like.user._id.toString() : like.user.toString();
        return id !== currentUserIdStr;
      });
    } else {
      post.likes.push({ user: userId });
    }
    
    await post.save();
    // Notify post author about like (only on like, not unlike, and not self-like)
    try {
      if (!alreadyLiked) {
        const postAuthorId = (post.author && post.author._id) ? post.author._id.toString() : post.author.toString();
        if (postAuthorId !== currentUserIdStr) {
          const titleSnippet = (post.title || '').slice(0, 80);
          await createNotification(
            postAuthorId,
            userId,
            'post_like',
            `${req.user.username} liked your post: "${titleSnippet}"`,
            post.group
          );
        }
      }
    } catch (e) {
      console.error('Create notification (post_like) failed:', e);
    }
    
    res.json({
      success: true,
      message: alreadyLiked ? 'Post unliked' : 'Post liked',
  likesCount: post.likes.length,
      isLiked: !alreadyLiked
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like'
    });
  }
};

// Like/unlike comment
const toggleCommentLike = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
  const userId = req.user.id;
  const currentUserIdStr = userId.toString();
    
    const post = await GroupPost.findById(postId).populate('group');
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Verify user is a member of the group
    const group = await Group.findById(post.group._id);
    const isCreator = group.creator.toString() === currentUserIdStr;
    const isAdmin = group.admins.some(adminId => adminId.toString() === currentUserIdStr);
    const isModerator = group.moderators.some(modId => modId.toString() === currentUserIdStr);
    const isMember = group.members.some(member => {
      if (!member || !member.user) return false;
      const mid = member.user._id ? member.user._id.toString() : member.user.toString();
      return mid === currentUserIdStr;
    });

    if (!isCreator && !isAdmin && !isModerator && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to like comments'
      });
    }
    
  const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    // Toggle like (ensure no duplicates remain)
    const alreadyLiked = comment.likes.some(like => {
      if (!like || !like.user) return false;
      const id = like.user._id ? like.user._id.toString() : like.user.toString();
      return id === currentUserIdStr;
    });
    if (alreadyLiked) {
      comment.likes = comment.likes.filter(like => {
        if (!like || !like.user) return true;
        const id = like.user._id ? like.user._id.toString() : like.user.toString();
        return id !== currentUserIdStr;
      });
    } else {
      comment.likes.push({ user: userId });
    }
    
    await post.save();

    // Notify comment author on like (not on unlike, and not self)
    try {
      if (!alreadyLiked) {
        const commentAuthorId = (comment.user && comment.user._id) ? comment.user._id.toString() : comment.user.toString();
        if (commentAuthorId !== currentUserIdStr) {
          const titleSnippet = (post.title || '').slice(0, 80);
          await createNotification(
            commentAuthorId,
            userId,
            'comment_like',
            `${req.user.username} liked your comment on: "${titleSnippet}"`,
            post.group?._id || post.group
          );
        }
      }
    } catch (e) {
      console.error('Create notification (comment_like) failed:', e);
    }
    
    res.json({
      success: true,
      message: alreadyLiked ? 'Comment unliked' : 'Comment liked',
      likesCount: comment.likes.length,
      isLiked: !alreadyLiked
    });
  } catch (error) {
    console.error('Toggle comment like error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle comment like'
    });
  }
};

// Add reply to comment (or to an existing reply -> appended under the same parent comment)
const addReply = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
  const post = await GroupPost.findById(postId).populate('group');
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Verify user is a member of the group
    const group = await Group.findById(post.group._id);
    const userIdStr = userId.toString();
    const isCreator = group.creator.toString() === userIdStr;
    const isAdmin = group.admins.some(adminId => adminId.toString() === userIdStr);
    const isModerator = group.moderators.some(modId => modId.toString() === userIdStr);
    const isMember = group.members.some(member => {
      if (!member || !member.user) return false;
      const mid = member.user._id ? member.user._id.toString() : member.user.toString();
      return mid === userIdStr;
    });

    if (!isCreator && !isAdmin && !isModerator && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to reply to comments'
      });
    }
    
    // Resolve parent comment or nested reply using recursive search
    const findInReplies = (repliesArr, targetId) => {
      if (!repliesArr) return { reply: null, parent: null };
      for (const rep of repliesArr) {
        if (String(rep._id) === String(targetId)) {
          return { reply: rep, parent: null };
        }
        const sub = findInReplies(rep.replies || [], targetId);
        if (sub.reply) {
          return { reply: sub.reply, parent: rep };
        }
      }
      return { reply: null, parent: null };
    };

    let comment = post.comments.id(commentId);
    let repliedEntity = null; // the reply being replied to if commentId refers to a reply
    if (!comment) {
      for (const c of post.comments) {
        const { reply } = findInReplies(c.replies || [], commentId);
        if (reply) {
          comment = c; // top-level parent comment containing this reply
          repliedEntity = reply;
          break;
        }
      }
    }
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    
  // Determine the target container for the new reply: replying to a reply -> push into that reply's replies; else into comment.replies
    if (repliedEntity) {
      repliedEntity.replies.push({ user: userId, content });
    } else {
      comment.replies.push({ user: userId, content });
    }
    
    await post.save();
  await post.populate('comments.replies.user', 'username profilePicture');
  await post.populate('comments.replies.replies.user', 'username profilePicture');
  await post.populate('comments.replies.replies.replies.user', 'username profilePicture');
    // Update group's last activity
    try {
      group.lastActivity = new Date();
      await group.save();
    } catch (e) {
      console.warn('Failed to update group lastActivity after reply:', e?.message);
    }

    // Notify the correct target: if replying to a reply, notify that reply's author; else the comment's author
    try {
      const targetUser = repliedEntity ? repliedEntity.user : comment.user;
      const targetUserId = (targetUser && targetUser._id) ? targetUser._id.toString() : targetUser.toString();
      const currentUserIdStr = userId.toString();
      if (targetUserId !== currentUserIdStr) {
        const titleSnippet = (post.title || '').slice(0, 80);
        const segment = repliedEntity ? 'reply' : 'comment';
        await createNotification(
          targetUserId,
          userId,
          'comment_reply',
          `${req.user.username} replied to your ${segment} on: "${titleSnippet}"`,
          post.group?._id || post.group
        );
      }
    } catch (e) {
      console.error('Create notification (comment_reply) failed:', e);
    }
    const makeAbsoluteUrl = (val, req) => {
      if (!val) return val;
      if (/^https?:\/\//i.test(val)) return val;
      const p = val.startsWith('/') ? val : `/${val}`;
      return `${req.protocol}://${req.get('host')}${p}`;
    };
  const newReply = repliedEntity
      ? repliedEntity.replies[repliedEntity.replies.length - 1]
      : comment.replies[comment.replies.length - 1];
    const replyObj = newReply.toObject ? newReply.toObject() : newReply;
    if (replyObj.user && replyObj.user.profilePicture) {
      replyObj.user.profilePicture = makeAbsoluteUrl(replyObj.user.profilePicture, req);
    }

    res.json({
      success: true,
      message: 'Reply added successfully',
      reply: replyObj
    });
  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reply'
    });
  }
};

// Pin a post (moderators/admins/creator only)
const pinPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id.toString();

    const post = await GroupPost.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const group = await Group.findById(post.group);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isCreator = group.creator.toString() === userId;
    const isAdmin = group.admins.some(a => a.toString() === userId);
    const isModerator = group.moderators.some(m => m.toString() === userId);
    if (!isCreator && !isAdmin && !isModerator) {
      return res.status(403).json({ success: false, message: 'Only moderators can pin posts' });
    }

    if (!post.isPinned) {
      post.isPinned = true;
      await post.save();
      group.lastActivity = new Date();
      await group.save();
    }

    return res.json({ success: true, message: 'Post pinned', post });
  } catch (error) {
    console.error('Pin post error:', error);
    return res.status(500).json({ success: false, message: 'Failed to pin post' });
  }
};

// Unpin a post (moderators/admins/creator only)
const unpinPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id.toString();

    const post = await GroupPost.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const group = await Group.findById(post.group);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isCreator = group.creator.toString() === userId;
    const isAdmin = group.admins.some(a => a.toString() === userId);
    const isModerator = group.moderators.some(m => m.toString() === userId);
    if (!isCreator && !isAdmin && !isModerator) {
      return res.status(403).json({ success: false, message: 'Only moderators can unpin posts' });
    }

    if (post.isPinned) {
      post.isPinned = false;
      await post.save();
      group.lastActivity = new Date();
      await group.save();
    }

    return res.json({ success: true, message: 'Post unpinned', post });
  } catch (error) {
    console.error('Unpin post error:', error);
    return res.status(500).json({ success: false, message: 'Failed to unpin post' });
  }
};

module.exports = {
  getGroupPosts,
  getPinnedPosts,
  createPost,
  addComment,
  toggleLike,
  toggleCommentLike,
  addReply,
  pinPost,
  unpinPost
};

// Like/unlike a reply
const toggleReplyLike = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const userId = req.user.id;
    const currentUserIdStr = userId.toString();

    const post = await GroupPost.findById(postId).populate('group');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Verify user is a member of the group
    const group = await Group.findById(post.group._id);
    const isCreator = group.creator.toString() === currentUserIdStr;
    const isAdmin = group.admins.some(adminId => adminId.toString() === currentUserIdStr);
    const isModerator = group.moderators.some(modId => modId.toString() === currentUserIdStr);
    const isMember = group.members.some(member => {
      if (!member || !member.user) return false;
      const mid = member.user._id ? member.user._id.toString() : member.user.toString();
      return mid === currentUserIdStr;
    });
    if (!isCreator && !isAdmin && !isModerator && !isMember) {
      return res.status(403).json({ success: false, message: 'You must be a member to like replies' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    // Find reply recursively
    const findReplyDeep = (repliesArr, targetId) => {
      if (!repliesArr) return null;
      for (const rep of repliesArr) {
        if (String(rep._id) === String(targetId)) return rep;
        const found = findReplyDeep(rep.replies || [], targetId);
        if (found) return found;
      }
      return null;
    };
    const reply = findReplyDeep(comment.replies || [], replyId);
    if (!reply) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    // Toggle like
    const alreadyLiked = (reply.likes || []).some(like => {
      if (!like || !like.user) return false;
      const id = like.user._id ? like.user._id.toString() : like.user.toString();
      return id === currentUserIdStr;
    });

    if (alreadyLiked) {
      reply.likes = reply.likes.filter(like => {
        if (!like || !like.user) return true;
        const id = like.user._id ? like.user._id.toString() : like.user.toString();
        return id !== currentUserIdStr;
      });
    } else {
      reply.likes.push({ user: userId });
    }

    await post.save();

    // Notify reply author on like (only on like, not unlike, and not self)
    try {
      if (!alreadyLiked) {
        const replyAuthorId = (reply.user && reply.user._id) ? reply.user._id.toString() : reply.user.toString();
        if (replyAuthorId !== currentUserIdStr) {
          const titleSnippet = (post.title || '').slice(0, 80);
          await createNotification(
            replyAuthorId,
            userId,
            'reply_like',
            `${req.user.username} liked your reply on: "${titleSnippet}"`,
            post.group?._id || post.group
          );
        }
      }
    } catch (e) {
      console.error('Create notification (reply_like) failed:', e);
    }

    return res.json({
      success: true,
      message: alreadyLiked ? 'Reply unliked' : 'Reply liked',
      likesCount: (reply.likes || []).length,
      isLiked: !alreadyLiked
    });
  } catch (error) {
    console.error('Toggle reply like error:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle reply like' });
  }
};

// Re-export including the newly added handler
module.exports.toggleReplyLike = toggleReplyLike;

// Delete a post (creator/admin/moderator only)
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userIdStr = req.user.id.toString();

    const post = await GroupPost.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const group = await Group.findById(post.group);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const isCreator = group.creator.toString() === userIdStr;
    const isAdmin = group.admins.some(a => a.toString() === userIdStr);
    const isModerator = group.moderators.some(m => m.toString() === userIdStr);
    if (!isCreator && !isAdmin && !isModerator) {
      return res.status(403).json({ success: false, message: 'Only moderators can delete posts' });
    }

    await GroupPost.deleteOne({ _id: postId });
    group.lastActivity = new Date();
    await group.save();

    return res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete post' });
  }
};

// Delete a top-level comment (comment owner or creator/admin/moderator)
const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userIdStr = req.user.id.toString();

    const post = await GroupPost.findById(postId).populate('group');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    const group = await Group.findById(post.group._id);

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const isOwner = String(comment.user?._id || comment.user) === userIdStr;
    const isCreator = group.creator.toString() === userIdStr;
    const isAdmin = group.admins.some(a => a.toString() === userIdStr);
    const isModerator = group.moderators.some(m => m.toString() === userIdStr);
    if (!isOwner && !isCreator && !isAdmin && !isModerator) {
      return res.status(403).json({ success: false, message: 'Not allowed to delete this comment' });
    }

    comment.deleteOne();
    await post.save();
    try { group.lastActivity = new Date(); await group.save(); } catch {}

    return res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
};

// Delete a nested reply (reply owner or creator/admin/moderator)
const deleteReply = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const userIdStr = req.user.id.toString();

    const post = await GroupPost.findById(postId).populate('group');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    const group = await Group.findById(post.group._id);

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    // Find reply and its parent container recursively
    const findReplyParent = (repliesArr, targetId) => {
      if (!repliesArr) return { parent: null, index: -1 };
      for (let i = 0; i < repliesArr.length; i++) {
        const rep = repliesArr[i];
        if (String(rep._id) === String(targetId)) return { parent: repliesArr, index: i };
        const sub = findReplyParent(rep.replies || [], targetId);
        if (sub.parent) return sub;
      }
      return { parent: null, index: -1 };
    };

    const { parent, index } = findReplyParent(comment.replies || [], replyId);
    if (!parent || index < 0) return res.status(404).json({ success: false, message: 'Reply not found' });

    const replyDoc = parent[index];
    const isOwner = String(replyDoc.user?._id || replyDoc.user) === userIdStr;
    const isCreator = group.creator.toString() === userIdStr;
    const isAdmin = group.admins.some(a => a.toString() === userIdStr);
    const isModerator = group.moderators.some(m => m.toString() === userIdStr);
    if (!isOwner && !isCreator && !isAdmin && !isModerator) {
      return res.status(403).json({ success: false, message: 'Not allowed to delete this reply' });
    }

    parent.splice(index, 1);
    await post.save();
    try { group.lastActivity = new Date(); await group.save(); } catch {}

    return res.json({ success: true, message: 'Reply deleted' });
  } catch (error) {
    console.error('Delete reply error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete reply' });
  }
};

module.exports.deletePost = deletePost;
module.exports.deleteComment = deleteComment;
module.exports.deleteReply = deleteReply;
