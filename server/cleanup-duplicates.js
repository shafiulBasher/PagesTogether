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
  }],
  memberCount: Number
}, { timestamps: true });

const Group = mongoose.model('Group', groupSchema);

async function removeDuplicateMembers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const groups = await Group.find({});
    console.log(`Found ${groups.length} groups to process`);
    
    for (const group of groups) {
      const originalMemberCount = group.members.length;
      
      // Create a Map to track unique users (keep the earliest join date)
      const uniqueMembers = new Map();
      
      for (const member of group.members) {
        const userIdString = member.user.toString();
        
        if (!uniqueMembers.has(userIdString)) {
          uniqueMembers.set(userIdString, member);
        } else {
          // Keep the member with the earlier join date
          const existingMember = uniqueMembers.get(userIdString);
          if (member.joinedAt < existingMember.joinedAt) {
            uniqueMembers.set(userIdString, member);
          }
        }
      }
      
      // Convert map back to array
      const cleanedMembers = Array.from(uniqueMembers.values());
      const duplicatesRemoved = originalMemberCount - cleanedMembers.length;
      
      if (duplicatesRemoved > 0) {
        console.log(`Group "${group.name}" (${group._id}): Removing ${duplicatesRemoved} duplicate members (${originalMemberCount} -> ${cleanedMembers.length})`);
        
        group.members = cleanedMembers;
        group.memberCount = cleanedMembers.length;
        await group.save();
      }
    }
    
    console.log('✅ Duplicate member cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

removeDuplicateMembers();
