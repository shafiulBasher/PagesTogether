const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Group = require('./models/Group');
const GroupPost = require('./models/GroupPost');
const User = require('./models/User');

const seedGroups = async () => {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pagestogether';
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully');

    // Check if groups already exist and clear them for reseeding
    const existingGroups = await Group.find();
    if (existingGroups.length > 0) {
      console.log('Clearing existing sample data...');
      await GroupPost.deleteMany({});
      await Group.deleteMany({});
      console.log('Existing data cleared');
    }

    // Get the first user to be the creator
    const users = await User.find().limit(5);
    if (users.length === 0) {
      console.log('No users found. Please register users first.');
      process.exit(1);
    }

    console.log(`Found ${users.length} users to use as group creators`);

    const sampleGroups = [
      {
        name: 'Classic Literature Enthusiasts',
        description: 'A passionate community of readers who love diving deep into timeless literary masterpieces. Join us for weekly discussions, book recommendations, and thought-provoking conversations about the works that have shaped literature.',
        category: 'Classic fiction',
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
        category: 'Romance',
        tags: ['book-club', 'today-show', 'jenna-bush'],
        creator: users[1] ? users[1]._id : users[0]._id,
        admins: [users[1] ? users[1]._id : users[0]._id],
        members: users.slice(0, Math.min(4, users.length)).map(user => ({ user: user._id })),
        memberCount: Math.min(4, users.length),
        lastActivity: new Date(Date.now() - 86400000) // 1 day ago
      },
      {
        name: 'Goodreads Librarians Group',
        description: 'Goodreads Librarians are volunteers who help ensure the accuracy of information about books and authors in the Goodreads\' catalog. The Goodreads Librarians Group is the official group for requestin...',
        category: 'Non-fiction',
        tags: ['librarians', 'catalog', 'book-data'],
        creator: users[2] ? users[2]._id : users[0]._id,
        admins: [users[2] ? users[2]._id : users[0]._id],
        members: users.slice(0, Math.min(3, users.length)).map(user => ({ user: user._id })),
        memberCount: Math.min(3, users.length),
        lastActivity: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        name: 'BookTok 📚',
        description: 'A place for booktokers to interact with each other and share the love',
        category: 'Young-Adult',
        tags: ['booktok', 'tiktok', 'ya', 'social'],
        creator: users[3] ? users[3]._id : users[0]._id,
        admins: [users[3] ? users[3]._id : users[0]._id],
        members: users.slice(0, Math.min(5, users.length)).map(user => ({ user: user._id })),
        memberCount: Math.min(5, users.length),
        lastActivity: new Date(Date.now() - 1800000) // 30 minutes ago
      },
      {
        name: 'Fantasy Book Club',
        description: 'Discover new worlds and magical adventures with fellow fantasy lovers. We discuss everything from epic fantasy series to urban fantasy novels.',
        category: 'Fantasy',
        tags: ['fantasy', 'magic', 'dragons', 'adventure'],
        creator: users[4] ? users[4]._id : users[0]._id,
        admins: [users[4] ? users[4]._id : users[0]._id],
        members: users.slice(0, Math.min(3, users.length)).map(user => ({ user: user._id })),
        memberCount: Math.min(3, users.length),
        lastActivity: new Date()
      },
      {
        name: 'Science Fiction Society',
        description: 'Exploring the future through literature. Join us for discussions about space operas, cyberpunk, dystopian futures, and hard science fiction.',
        category: 'Science Fiction',
        tags: ['sci-fi', 'space', 'future', 'technology'],
        creator: users[0]._id,
        admins: [users[0]._id],
        members: users.slice(0, Math.min(4, users.length)).map(user => ({ user: user._id })),
        memberCount: Math.min(4, users.length),
        lastActivity: new Date(Date.now() - 7200000) // 2 hours ago
      },
      {
        name: 'Mystery & Suspense Readers',
        description: 'For lovers of mystery novels, psychological thrillers, and suspenseful reads. Share your latest discoveries and discuss plot twists!',
        category: 'Mystery and suspense',
        tags: ['mystery', 'suspense', 'detective', 'thriller'],
        creator: users[1] ? users[1]._id : users[0]._id,
        admins: [users[1] ? users[1]._id : users[0]._id],
        members: users.slice(0, Math.min(3, users.length)).map(user => ({ user: user._id })),
        memberCount: Math.min(3, users.length),
        lastActivity: new Date(Date.now() - 5400000) // 1.5 hours ago
      },
      {
        name: 'Historical Fiction Enthusiasts',
        description: 'Journey through time with compelling historical fiction. From ancient civilizations to recent history, we explore it all through literature.',
        category: 'Historical Fiction',
        tags: ['historical', 'history', 'period-fiction'],
        creator: users[2] ? users[2]._id : users[0]._id,
        admins: [users[2] ? users[2]._id : users[0]._id],
        members: users.slice(0, Math.min(4, users.length)).map(user => ({ user: user._id })),
        memberCount: Math.min(4, users.length),
        lastActivity: new Date(Date.now() - 10800000) // 3 hours ago
      }
    ];

    // Create groups
    console.log('Creating sample groups...');
    const createdGroups = await Group.insertMany(sampleGroups);
    console.log(`Created ${createdGroups.length} groups`);

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
        author: users[1] ? users[1]._id : users[0]._id,
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

    console.log('Creating sample posts...');
    await GroupPost.insertMany(samplePosts);
    console.log(`Created ${samplePosts.length} posts`);

    console.log('Sample groups and posts created successfully!');
    console.log(`Groups created: ${createdGroups.length}`);
    console.log(`Posts created: ${samplePosts.length}`);
    
  } catch (error) {
    console.error('Error seeding groups:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

seedGroups();
