const mongoose = require('mongoose');
require('dotenv').config();

const FriendRequest = require('./models/FriendRequest');
const User = require('./models/User');

async function debugDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pagestogether');
    console.log('Connected to MongoDB');

    // Get all users
    const users = await User.find({}, 'username email');
    console.log('Users:', users);

    // Get all friend requests
    const friendRequests = await FriendRequest.find({})
      .populate('from', 'username')
      .populate('to', 'username');
    console.log('Friend Requests:', friendRequests);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

debugDatabase();
