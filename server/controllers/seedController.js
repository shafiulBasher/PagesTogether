const Group = require('../models/Group');
const GroupPost = require('../models/GroupPost');
const User = require('../models/User');

// Seed sample groups for testing
const seedGroups = async (req, res) => {
  try {
    // Check if groups already exist
    const existingGroups = await Group.countDocuments();
    if (existingGroups > 0) {
      return res.json({
        success: true,
        message: `Groups already exist (${existingGroups} groups found). Skipping seed.`
      });
    }

    // Get the first user as creator
    const users = await User.find().limit(5);
    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users found. Please create a user account first.'
      });
    }

    const creator = users[0];

    // Sample groups data
    const sampleGroups = [
      {
        name: 'Classic Literature Enthusiasts',
        description: 'A passionate community of readers who love diving deep into timeless literary masterpieces. Join us for weekly discussions, book recommendations, and thought-provoking conversations about the works that have shaped literature.',
        category: 'bookclub',
        tags: ['classic', 'literature', 'discussion'],
        creator: creator._id,
        admins: [creator._id],
        members: [{ user: creator._id }],
        memberCount: 2847,
        lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        name: 'Fantasy Realm Readers',
        description: 'Dive into magical worlds, epic quests, and fantastical creatures. From high fantasy to urban fantasy, we discuss all sub-genres and share our favorite magical reads.',
        category: 'fantasy',
        tags: ['fantasy', 'magic', 'adventure'],
        creator: creator._id,
        admins: [creator._id],
        members: [{ user: creator._id }],
        memberCount: 1893,
        lastActivity: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
      },
      {
        name: 'Romance Book Haven',
        description: 'For lovers of love stories! Contemporary romance, historical romance, paranormal romance - we love them all. Share your favorites and discover new swoony reads.',
        category: 'romance',
        tags: ['romance', 'love-stories', 'contemporary'],
        creator: creator._id,
        admins: [creator._id],
        members: [{ user: creator._id }],
        memberCount: 3421,
        lastActivity: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      },
      {
        name: 'Sci-Fi Future Seekers',
        description: 'Explore the future through science fiction! From space operas to dystopian futures, from hard sci-fi to space fantasy. Let\'s discuss what tomorrow might bring.',
        category: 'science-fiction',
        tags: ['sci-fi', 'future', 'technology'],
        creator: creator._id,
        admins: [creator._id],
        members: [{ user: creator._id }],
        memberCount: 1567,
        lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        name: 'Mystery & Thriller Addicts',
        description: 'Can\'t put down a good mystery? Love the thrill of a psychological thriller? Join us to discuss plot twists, share recommendations, and solve mysteries together.',
        category: 'mystery',
        tags: ['mystery', 'thriller', 'suspense'],
        creator: creator._id,
        admins: [creator._id],
        members: [{ user: creator._id }],
        memberCount: 2156,
        lastActivity: new Date(Date.now() - 8 * 60 * 60 * 1000) // 8 hours ago
      },
      {
        name: 'Young Adult Universe',
        description: 'YA books for readers of all ages! From coming-of-age stories to YA fantasy, contemporary to dystopian. Discover your next favorite YA read with us.',
        category: 'young-adult',
        tags: ['ya', 'teen', 'coming-of-age'],
        creator: creator._id,
        admins: [creator._id],
        members: [{ user: creator._id }],
        memberCount: 4231,
        lastActivity: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      }
    ];

    // Add other users as members to some groups
    if (users.length > 1) {
      sampleGroups.forEach((group, index) => {
        // Add 2-4 additional users to each group
        const additionalUsers = users.slice(1, Math.min(users.length, 5));
        additionalUsers.forEach(user => {
          group.members.push({ user: user._id });
        });
        group.memberCount = Math.max(group.memberCount, group.members.length);
      });
    }

    // Create the groups
    const createdGroups = await Group.insertMany(sampleGroups);

    // Create some sample posts for the first group
    const firstGroup = createdGroups[0];
    const samplePosts = [
      {
        title: 'Weekly Book Discussion: Pride and Prejudice',
        content: 'This week we\'re diving into Jane Austen\'s beloved classic. What are your thoughts on Elizabeth Bennet\'s character development throughout the novel?',
        author: creator._id,
        group: firstGroup._id,
        type: 'announcement',
        isPinned: true
      },
      {
        title: 'Reading Challenge 2024',
        content: 'Join our annual reading challenge! We\'re aiming to read 12 classic novels this year. Sign up in the comments below!',
        author: creator._id,
        group: firstGroup._id,
        type: 'announcement',
        isPinned: true
      },
      {
        title: 'Book Recommendation Archive',
        content: 'Share your favorite classic literature recommendations here. Please include the title, author, and why you recommend it!',
        author: creator._id,
        group: firstGroup._id,
        type: 'megathread',
        isPinned: true
      }
    ];

    await GroupPost.insertMany(samplePosts);

    res.json({
      success: true,
      message: `Successfully created ${createdGroups.length} sample groups and ${samplePosts.length} sample posts`,
      groups: createdGroups.length
    });

  } catch (error) {
    console.error('Seed groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed groups',
      error: error.message
    });
  }
};

module.exports = {
  seedGroups
};
