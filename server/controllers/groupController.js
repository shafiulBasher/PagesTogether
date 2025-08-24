const Group = require('../models/Group');
const GroupPost = require('../models/GroupPost');
const User = require('../models/User');
const { createNotification } = require('../routes/notificationRoutes');
const path = require('path');
const mongoose = require('mongoose');

// Get all groups with search and filter options
const getGroups = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 12, sort = 'popular' } = req.query;
    
    let query = {};
    
    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Only show active groups
    query.isActive = true;
    
    // Sort options
    let sortOptions = {};
    switch (sort) {
      case 'popular':
        sortOptions = { memberCount: -1, lastActivity: -1 };
        break;
      case 'recent':
        sortOptions = { createdAt: -1 };
        break;
      case 'active':
        sortOptions = { lastActivity: -1 };
        break;
      default:
        sortOptions = { memberCount: -1 };
    }
    
    const skip = (page - 1) * limit;
    
    const groups = await Group.find(query)
  .populate('creator', 'username profilePicture')
  .populate('members.user', 'username profilePicture')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalGroups = await Group.countDocuments(query);
    const totalPages = Math.ceil(totalGroups / limit);
    
    res.json({
      success: true,
      groups,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalGroups,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch groups'
    });
  }
};

// Get featured groups (groups with high member count and recent activity)
const getFeaturedGroups = async (req, res) => {
  try {
  const groups = await Group.find({ 
      isActive: true,
      memberCount: { $gte: 50 } // Groups with at least 50 members
    })
  .populate('creator', 'username profilePicture')
      .sort({ memberCount: -1, lastActivity: -1 })
      .limit(3);
    
    res.json({
      success: true,
      groups
    });
  } catch (error) {
    console.error('Get featured groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured groups'
    });
  }
};

// Get popular groups
const getPopularGroups = async (req, res) => {
  try {
  const groups = await Group.find({ isActive: true })
  .populate('creator', 'username profilePicture')
      .sort({ memberCount: -1, lastActivity: -1 })
      .limit(6);
    
    res.json({
      success: true,
      groups
    });
  } catch (error) {
    console.error('Get popular groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular groups'
    });
  }
};

// Get single group by ID
const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const group = await Group.findById(id)
  .populate('creator', 'username profilePicture')
  .populate('admins', 'username profilePicture')
  .populate('moderators', 'username profilePicture')
  .populate('members.user', 'username profilePicture');
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Ensure absolute URLs for group images when returning
    const makeAbsoluteUrl = (val, req) => {
      if (!val) return val;
      if (/^https?:\/\//i.test(val)) return val;
      const p = val.startsWith('/') ? val : `/${val}`;
      return `${req.protocol}://${req.get('host')}${p}`;
    };

    if (group.image) group.image = makeAbsoluteUrl(group.image, req);
    if (group.coverImage) group.coverImage = makeAbsoluteUrl(group.coverImage, req);

    res.json({
      success: true,
      group
    });
  } catch (error) {
    console.error('Get group by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group'
    });
  }
};

// Create new group
const createGroup = async (req, res) => {
  try {
    const { name, description, category, tags = [] } = req.body;
    const userId = req.user.id;
    
    // Check if group name already exists
    const existingGroup = await Group.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: 'A group with this name already exists'
      });
    }
    
    const group = new Group({
      name,
      description,
      category,
      tags,
      creator: userId,
      admins: [userId],
      moderators: [userId],
      members: [{ user: userId }]
    });
    
    await group.save();
    await group.populate('creator', 'username profileImage');
    
    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create group'
    });
  }
};

// Join group
const joinGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log(`Join request: User ${userId} trying to join group ${id}`);
    
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user is the creator
    if (group.creator.toString() === userId) {
      console.log(`User ${userId} is creator of group ${id} - rejecting join`);
      return res.status(400).json({
        success: false,
        message: 'You are the creator of this group'
      });
    }
    
    // Check if user is a moderator
    const isModerator = group.moderators.some(mod => mod.toString() === userId);
    if (isModerator) {
      console.log(`User ${userId} is moderator of group ${id} - rejecting join`);
      return res.status(400).json({
        success: false,
        message: 'You are a moderator of this group'
      });
    }
    
    // Check if user is already a member
    console.log(`Join request: User ${userId} trying to join group ${id}`);
    
    // Ensure userId is a string for comparison
    const userIdString = userId.toString();
    
    const isMember = group.members.some(member => {
      const memberUserString = member.user.toString();
      return memberUserString === userIdString;
    });
    
    console.log(`Checking membership: ${userIdString} already member? ${isMember}`);
    
    if (isMember) {
      console.log(`User ${userIdString} is already member of group ${id} - rejecting join`);
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this group'
      });
    }
    
    // Add user to members
    group.members.push({ user: userId });
    group.lastActivity = new Date();
    await group.save();
    
    res.json({
      success: true,
      message: 'Successfully joined the group'
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join group'
    });
  }
};

// Helper to coerce any value to string id
const idToStr = (v) => String(v && (v._id || v));

// Leave group (normalize then remove like Facebook/Reddit)
const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userIdStr = idToStr(req.user.id);

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    // Creator cannot leave
    if (idToStr(group.creator) === userIdStr) {
      return res.status(400).json({ success: false, message: 'Group creator cannot leave the group' });
    }

    // Normalize members to the canonical shape: [{ user: ObjectId, joinedAt }]
  const beforeLen = (group.members || []).length;
  const normalizedMembers = [];
    for (const m of group.members || []) {
      let uid = null;
      if (m && typeof m === 'object' && 'user' in m) {
        uid = m.user && (m.user._id || m.user);
      } else {
        uid = m && (m._id || m);
      }
      if (!uid) continue;
      const uStr = idToStr(uid);
      if (uStr === userIdStr) continue; // this is the leave remove
      normalizedMembers.push({ user: uid, joinedAt: (m && m.joinedAt) ? m.joinedAt : new Date() });
    }
    group.members = normalizedMembers;

    // Remove from admins/moderators too
    group.admins = (group.admins || []).filter(a => idToStr(a) !== userIdStr);
    group.moderators = (group.moderators || []).filter(m => idToStr(m) !== userIdStr);

    // Update stats
    group.memberCount = group.members.length;
    group.lastActivity = new Date();

  await group.save();
  const afterLen = (group.members || []).length;
  console.log('[leaveGroup] user', userIdStr, 'group', id, 'members before:', beforeLen, 'after:', afterLen);

    // Return fresh populated group for the client to trust
    const populated = await Group.findById(id)
      .populate('creator', 'username profilePicture')
      .populate('admins', 'username profilePicture')
      .populate('moderators', 'username profilePicture')
      .populate('members.user', 'username profilePicture');

    return res.json({ success: true, message: 'Successfully left the group', group: populated });
  } catch (error) {
    console.error('Leave group error:', error);
    return res.status(500).json({ success: false, message: 'Failed to leave group' });
  }
};

// Get available categories/tags
const getCategories = async (req, res) => {
  try {
    const categories = [
    'Romance', 'Science fiction', 'Short stories', 'Thrillers', 'Science Fiction', 'Fantasy', 'Historical Fiction', 'Young-Adult', 'Autobiography',
    'Self-Help/Personal Development', 'Cooking', 'Business', 'Health & Fitness', 'Mystery and suspense', 'Political thriller', 'Poetry', 'Plays',
    'Action/Adventure', 'Classic fiction', 'Non-fiction'
];
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

module.exports = {
  getGroups,
  getFeaturedGroups,
  getPopularGroups,
  getGroupById,
  createGroup,
  joinGroup,
  leaveGroup,
  getCategories
};

// New moderator/admin utilities and actions
// Helper: check if user has moderator privileges (creator or in moderators)
const hasModPrivileges = (group, userId) => {
  if (!group || !userId) return false;
  const userIdStr = String(userId);
  if (String(group.creator) === userIdStr) return true;
  return (group.moderators || []).some(m => String(m) === userIdStr);
};

// Promote member to moderator (creator or moderator can do this per user's rule that admin==moderator; creators and moderators manage)
const promoteToModerator = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { userId } = req.body;
    const actorId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (!hasModPrivileges(group, actorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Ensure target is a member
  const isMember = group.members.some(m => String(m.user && (m.user._id || m.user)) === String(userId));
    if (!isMember) return res.status(400).json({ success: false, message: 'User must be a member' });

    // Add to moderators if not present
    if (!group.moderators.some(m => String(m) === String(userId))) {
      group.moderators.push(userId);
    }
    // Also add to admins to keep parity with existing schema usage where admins exist
    if (!group.admins.some(a => String(a) === String(userId))) {
      group.admins.push(userId);
    }
    await group.save();
  await group.populate('moderators', 'username profilePicture');
    res.json({ success: true, message: 'User promoted to moderator', moderators: group.moderators });
  } catch (error) {
    console.error('Promote moderator error:', error);
    res.status(500).json({ success: false, message: 'Failed to promote moderator' });
  }
};

// Demote moderator to regular member (only creator or other moderators per rule; allow creator and moderators)
const demoteModerator = async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;
    const actorId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (!hasModPrivileges(group, actorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Prevent demoting creator
    if (String(group.creator) === String(userId)) {
      return res.status(400).json({ success: false, message: 'Cannot demote group creator' });
    }

    group.moderators = group.moderators.filter(m => String(m) !== String(userId));
    group.admins = group.admins.filter(a => String(a) !== String(userId));
    await group.save();
  await group.populate('moderators', 'username profilePicture');
    res.json({ success: true, message: 'User demoted from moderator', moderators: group.moderators });
  } catch (error) {
    console.error('Demote moderator error:', error);
    res.status(500).json({ success: false, message: 'Failed to demote moderator' });
  }
};

// Remove member (creators and moderators only). Rejoin is allowed later per user answer.
const removeMember = async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;
    const actorId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    
    if (!hasModPrivileges(group, actorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Cannot remove creator
    if (String(group.creator) === String(userId)) {
      return res.status(400).json({ success: false, message: 'Cannot remove group creator' });
    }

  const before = group.members.length;
  group.members = group.members.filter(m => String(m.user && (m.user._id || m.user)) !== String(userId));
    group.admins = group.admins.filter(a => String(a) !== String(userId));
    group.moderators = group.moderators.filter(m => String(m) !== String(userId));
    if (group.members.length === before) {
      return res.status(404).json({ success: false, message: 'User not a member' });
    }

    await group.save();
    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove member' });
  }
};

// Upload group profile image
const uploadGroupImage = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const actorId = req.user.id;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (!hasModPrivileges(group, actorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const url = `${baseUrl}/uploads/groups/${req.file.filename}`;
    group.image = url;
    await group.save();
    res.json({ success: true, message: 'Group image updated', image: url });
  } catch (error) {
    console.error('Upload group image error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload group image' });
  }
};

// Upload group cover image
const uploadGroupCover = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const actorId = req.user.id;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (!hasModPrivileges(group, actorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const url = `${baseUrl}/uploads/groups/${req.file.filename}`;
    group.coverImage = url;
    await group.save();
    res.json({ success: true, message: 'Group cover updated', coverImage: url });
  } catch (error) {
    console.error('Upload group cover error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload group cover' });
  }
};

module.exports.promoteToModerator = promoteToModerator;
module.exports.demoteModerator = demoteModerator;
module.exports.removeMember = removeMember;
module.exports.uploadGroupImage = uploadGroupImage;
module.exports.uploadGroupCover = uploadGroupCover;

// =========================
// Group Invitations Feature
// =========================

// Invite friends (must be a current member of the group)
const inviteMembers = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const inviterId = req.user.id;
    const { recipients } = req.body; // array of userIds

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'Recipients list is required' });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    // Check inviter is a member (creator, moderator, or member)
    const inviterIdStr = String(inviterId);
    const isCreator = String(group.creator) === inviterIdStr;
    const isMod = (group.moderators || []).some(m => String(m) === inviterIdStr);
    const isMember = (group.members || []).some(m => String(m.user && (m.user._id || m.user)) === inviterIdStr);
    if (!(isCreator || isMod || isMember)) {
      return res.status(403).json({ success: false, message: 'Only group members can send invites' });
    }

    // Load inviter to check friends list
    const inviter = await User.findById(inviterId).select('username friends');
    const friendSet = new Set((inviter.friends || []).map(f => String(f)));

    const results = [];
    for (const rid of recipients) {
      const recipientId = String(rid);
      // Must be a friend
      if (!friendSet.has(recipientId)) {
        results.push({ userId: recipientId, status: 'skipped', reason: 'not_friend' });
        continue;
      }
      // Skip if already a member/mod/creator
      const alreadyMember = (
        String(group.creator) === recipientId ||
        (group.moderators || []).some(m => String(m) === recipientId) ||
        (group.members || []).some(m => String(m.user && (m.user._id || m.user)) === recipientId)
      );
      if (alreadyMember) {
        results.push({ userId: recipientId, status: 'skipped', reason: 'already_member' });
        continue;
      }

      // Avoid duplicate pending invite notifications for same group
      const Notification = require('../models/Notification');
      const existingInvite = await Notification.findOne({
        recipient: recipientId,
        sender: inviterId,
        type: 'group_invite',
        relatedId: groupId,
        isRead: false
      });
      if (existingInvite) {
        results.push({ userId: recipientId, status: 'skipped', reason: 'already_invited' });
        continue;
      }

      // Create invite notification
      const message = `${inviter.username} invited you to join the group "${group.name}"`;
      try {
        await createNotification(recipientId, inviterId, 'group_invite', message, groupId);
        results.push({ userId: recipientId, status: 'invited' });
      } catch (e) {
        console.error('Create invite notification failed:', e);
        results.push({ userId: recipientId, status: 'error', reason: 'notification_failed' });
      }
    }

    return res.json({ success: true, message: 'Invites processed', results });
  } catch (error) {
    console.error('Invite members error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send invites' });
  }
};

// Accept invitation (recipient joins the group)
const acceptInvitation = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user.id;
    const { notificationId } = req.body;

    if (!notificationId) return res.status(400).json({ success: false, message: 'notificationId required' });

    const Notification = require('../models/Notification');
    const notification = await Notification.findOne({ _id: notificationId, recipient: userId, type: 'group_invite', relatedId: groupId });
    if (!notification) return res.status(404).json({ success: false, message: 'Invitation not found' });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    // Add if not already a member
    const isAlready = (
      String(group.creator) === String(userId) ||
      (group.moderators || []).some(m => String(m) === String(userId)) ||
      (group.members || []).some(m => String(m.user && (m.user._id || m.user)) === String(userId))
    );

    if (!isAlready) {
      group.members.push({ user: userId });
      group.lastActivity = new Date();
      await group.save();
    }

    // Update notification to accepted and mark read
    notification.type = 'group_invite_accepted';
    notification.isRead = true;
    await notification.save();

    // Notify inviter
    try {
      const user = await User.findById(userId).select('username');
      await createNotification(notification.sender, userId, 'group_invite_accepted', `${user.username} accepted your invite to join "${group.name}"`, groupId);
    } catch (e) {
      console.error('Failed to notify inviter on acceptance:', e);
    }

    return res.json({ success: true, message: 'Joined group successfully' });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to accept invitation' });
  }
};

// Decline invitation
const declineInvitation = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user.id;
    const { notificationId } = req.body;

    if (!notificationId) return res.status(400).json({ success: false, message: 'notificationId required' });

    const Notification = require('../models/Notification');
    const notification = await Notification.findOne({ _id: notificationId, recipient: userId, type: 'group_invite', relatedId: groupId });
    if (!notification) return res.status(404).json({ success: false, message: 'Invitation not found' });

    notification.type = 'group_invite_declined';
    notification.isRead = true;
    await notification.save();

    return res.json({ success: true, message: 'Invitation declined' });
  } catch (error) {
    console.error('Decline invitation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to decline invitation' });
  }
};

module.exports.inviteMembers = inviteMembers;
module.exports.acceptInvitation = acceptInvitation;
module.exports.declineInvitation = declineInvitation;
