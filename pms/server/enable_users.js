import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function enableAllUsers() {
  const centralUri = 'mongodb://127.0.0.1:27017/project-management';
  const tenantDbName = 'GT_PMS_gitakshmi_technologies_org_0001';
  
  try {
    await mongoose.connect(centralUri);
    const tenantConn = mongoose.connection.useDb(tenantDbName);

    console.log('Enabling all users in tenant DB...');
    const result = await tenantConn.collection('users').updateMany(
        {},
        { $set: { isActive: true } }
    );
    console.log(`Successfully enabled ${result.modifiedCount} users.`);

    console.log('\nCleanup completed!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

enableAllUsers();
