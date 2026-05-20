import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function cleanUsers() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project-management';
  const tenantDbName = 'GT_PMS_gitakshmi_technologies_org_0001';
  
  try {
    await mongoose.connect(uri);
    const tenantConn = mongoose.connection.useDb(tenantDbName);
    
    // Find all users
    const users = await tenantConn.collection('users').find({}).toArray();
    console.log(`Total users: ${users.length}`);

    // Group by email
    const byEmail = {};
    users.forEach(u => {
        if (!byEmail[u.email]) byEmail[u.email] = [];
        byEmail[u.email].push(u);
    });

    for (const [email, list] of Object.entries(byEmail)) {
        if (list.length > 1) {
            console.log(`Duplicate found for ${email}`);
            // Keep the one that was updated recently or has more data
            // For now, let's keep the one that matches our intended tenantId if possible
            // But wait, we want to update all to the same tenantId anyway.
            
            // Just delete all except the first one for each email
            const toDelete = list.slice(1).map(u => u._id);
            await tenantConn.collection('users').deleteMany({ _id: { $in: toDelete } });
            console.log(` - Deleted ${toDelete.length} duplicates.`);
        }
    }

    await mongoose.disconnect();
    console.log('\nCleanup done!');
  } catch (err) {
    console.error(err);
  }
}
cleanUsers();
