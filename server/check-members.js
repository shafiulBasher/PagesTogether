const mongoose = require('mongoose');
require('dotenv').config();

const groupSchema = new mongoose.Schema({
  name: String,
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }]
});

const Group = mongoose.model('Group', groupSchema);

async function checkGroup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const group = await Group.findById('68a6cef175010f00017f593f');
    console.log('Group found:', !!group);
    console.log('Members count:', group.members.length);
    console.log('Members structure:');
    group.members.forEach((member, index) => {
      console.log(`Member ${index}:`, {
        user: member.user,
        userId: member.user.toString(),
        joinedAt: member.joinedAt
      });
    });
    
    // Check for duplicates
    const userIds = group.members.map(m => m.user.toString());
    const uniqueUserIds = [...new Set(userIds)];
    console.log('Total members:', userIds.length);
    console.log('Unique members:', uniqueUserIds.length);
    console.log('Has duplicates:', userIds.length !== uniqueUserIds.length);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkGroup();
