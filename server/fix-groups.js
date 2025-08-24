const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Group = require('./models/Group');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

const fixGroups = async () => {
  try {
    console.log('🔄 Fixing existing groups...');
    
    // Find all groups where creator is not in moderators array
    const groups = await Group.find({});
    
    for (let group of groups) {
      let updated = false;
      
      // Check if creator is in moderators array
      const creatorInModerators = group.moderators.some(mod => mod.toString() === group.creator.toString());
      if (!creatorInModerators) {
        group.moderators.push(group.creator);
        updated = true;
        console.log(`➕ Added creator to moderators for group: ${group.name}`);
      }
      
      // Check if creator is in members array
      const creatorInMembers = group.members.some(member => member.user.toString() === group.creator.toString());
      if (!creatorInMembers) {
        group.members.push({ user: group.creator });
        group.memberCount = group.members.length;
        updated = true;
        console.log(`➕ Added creator to members for group: ${group.name}`);
      }
      
      if (updated) {
        await group.save();
        console.log(`✅ Updated group: ${group.name}`);
      }
    }
    
    console.log('✅ Finished fixing groups');
    
  } catch (error) {
    console.error('❌ Error fixing groups:', error);
  } finally {
    console.log('🔌 Closing database connection...');
    await mongoose.connection.close();
  }
};

// Run the script
const run = async () => {
  await connectDB();
  await fixGroups();
  process.exit(0);
};

run();
