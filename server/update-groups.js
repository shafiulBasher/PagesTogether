const mongoose = require('mongoose');
require('dotenv').config();

const Group = require('./models/Group');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateExistingGroups() {
  try {
    console.log('🔄 Updating existing groups to add creators as moderators...');
    
    // Find all groups where creator is not in moderators array
    const groups = await Group.find({
      $expr: {
        $not: {
          $in: ['$creator', '$moderators']
        }
      }
    });

    console.log(`📋 Found ${groups.length} groups that need updating`);

    let updatedCount = 0;
    for (const group of groups) {
      // Add creator to moderators if not already there
      if (!group.moderators.includes(group.creator)) {
        group.moderators.push(group.creator);
        await group.save();
        updatedCount++;
        console.log(`✅ Updated group: ${group.name}`);
      }
    }

    console.log(`🎉 Successfully updated ${updatedCount} groups`);
    console.log('✅ All existing groups now have creators as moderators');
    
  } catch (error) {
    console.error('❌ Error updating groups:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

updateExistingGroups();
