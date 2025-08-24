const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const GroupPost = require('../models/GroupPost');
const User = require('../models/User');

// Seed sample groups and posts
router.post('/seed-groups', async (req, res) => {
  try {
    // Check if groups already exist
    const existingGroups = await Group.find();
    if (existingGroups.length > 0) {
      return res.json({ message: 'Sample data already exists' });
    }

    // Get the first user to be the creator
    const users = await User.find().limit(5);
    if (users.length === 0) {
      return res.status(400).json({ message: 'No users found. Please register users first.' });
    }

    const sampleGroups = [
      {
        name: 'Classic Literature Enthusiasts',
        description: 'A passionate community of readers who love diving deep into timeless literary masterpieces. Join us for weekly discussions, book recommendations, and thought-provoking conversations about the works that have shaped literature.',
        category: 'fiction',
        tags: ['classics', 'literature', 'discussion'],
        creator: users[0]._id,
        admins: [users[0]._id],
        members: users.map(user => ({ user: user._id })),
        memberCount: users.length,
        lastActivity: new Date()
      },
      {
        name: 'Read With Jenna (Official)',
        description: 'When anyone on the TODAY team is looking for a book recommendation, there is only one person to turn to: Jenna Bush Hager. Jenna will select a book and as you read along, we\'ll be posting updates...',
        category: 'bookclub',
        tags: ['book-club', 'today-show', 'jenna-bush'],
        creator: users[1]._id,
        admins: [users[1]._id],
        members: users.slice(0, 4).map(user => ({ user: user._id })),
        memberCount: 4,
        lastActivity: new Date(Date.now() - 86400000) // 1 day ago
      },
      {
        name: 'Goodreads Librarians Group',
        description: 'Goodreads Librarians are volunteers who help ensure the accuracy of information about books and authors in the Goodreads\' catalog. The Goodreads Librarians Group is the official group for requestin...',
        category: 'books',
        tags: ['librarians', 'catalog', 'book-data'],
        creator: users[2]._id,
        admins: [users[2]._id],
        members: users.slice(0, 3).map(user => ({ user: user._id })),
        memberCount: 3,
        lastActivity: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        name: 'BookTok 📚',
        description: 'A place for booktokers to interact with each other and share the love',
        category: 'young-adult',
        tags: ['booktok', 'tiktok', 'ya', 'social'],
        creator: users[3]._id,
        admins: [users[3]._id],
        members: users.slice(0, 5).map(user => ({ user: user._id })),
        memberCount: 5,
        lastActivity: new Date(Date.now() - 1800000) // 30 minutes ago
      },
      {
        name: 'Fantasy Book Club',
        description: 'Discover new worlds and magical adventures with fellow fantasy lovers. We discuss everything from epic fantasy series to urban fantasy novels.',
        category: 'fantasy',
        tags: ['fantasy', 'magic', 'dragons', 'adventure'],
        creator: users[4]._id,
        admins: [users[4]._id],
        members: users.slice(0, 3).map(user => ({ user: user._id })),
        memberCount: 3,
        lastActivity: new Date()
      },
      {
        name: 'Science Fiction Society',
        description: 'Exploring the future through literature. Join us for discussions about space operas, cyberpunk, dystopian futures, and hard science fiction.',
        category: 'science-fiction',
        tags: ['sci-fi', 'space', 'future', 'technology'],
        creator: users[0]._id,
        admins: [users[0]._id],
        members: users.slice(0, 4).map(user => ({ user: user._id })),
        memberCount: 4,
        lastActivity: new Date(Date.now() - 7200000) // 2 hours ago
      }
    ];

    // Create groups
    const createdGroups = await Group.insertMany(sampleGroups);

    // Create some sample posts for the first group
    const samplePosts = [
      {
        title: 'Weekly Book Discussion: Pride and Prejudice',
        content: 'Let\'s discuss Jane Austen\'s masterpiece! What are your thoughts on Elizabeth Bennet\'s character development?',
        author: users[0]._id,
        group: createdGroups[0]._id,
        type: 'announcement',
        isPinned: true
      },
      {
        title: 'Reading Challenge 2024',
        content: 'Our annual reading challenge is here! This year we\'re focusing on classic literature from different time periods.',
        author: users[1]._id,
        group: createdGroups[0]._id,
        type: 'announcement',
        isPinned: true
      },
      {
        title: 'Book Recommendation Archive',
        content: 'A collection of all our favorite classic literature recommendations from members.',
        author: users[0]._id,
        group: createdGroups[0]._id,
        type: 'megathread',
        isPinned: true
      }
    ];

    await GroupPost.insertMany(samplePosts);

    res.json({ 
      message: 'Sample groups and posts created successfully!',
      groupsCreated: createdGroups.length,
      postsCreated: samplePosts.length
    });

  } catch (error) {
    console.error('Error seeding groups:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to seed sample data',
      error: error.message 
    });
  }
});

// Clear all groups and posts (for testing)
router.delete('/clear-groups', async (req, res) => {
  try {
    await GroupPost.deleteMany({});
    await Group.deleteMany({});
    res.json({ message: 'All groups and posts cleared successfully!' });
  } catch (error) {
    console.error('Error clearing groups:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to clear data',
      error: error.message 
    });
  }
});

module.exports = router;
