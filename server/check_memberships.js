import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkMemberships() {
  const centralUri = 'mongodb://127.0.0.1:27017/project-management';
  const tenantDbName = 'GT_PMS_gitakshmi_technologies_org_0001';
  
  try {
    await mongoose.connect(centralUri);
    const centralDb = mongoose.connection.db;
    
    const email = 'jayesh.panchal@gitakshmi.com';
    const lookup = await centralDb.collection('authlookups').findOne({ email });
    console.log('AuthLookup:', JSON.stringify(lookup, null, 2));

    const tenantConn = mongoose.connection.useDb(tenantDbName);
    const user = await tenantConn.collection('users').findOne({ email });
    console.log('User in Tenant:', JSON.stringify(user, null, 2));

    const memberships = await tenantConn.collection('memberships').find({ userId: user._id }).toArray();
    console.log('Memberships:', JSON.stringify(memberships, null, 2));

    const workspaces = await tenantConn.collection('workspaces').find({}).toArray();
    console.log('Available Workspaces:', JSON.stringify(workspaces, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkMemberships();
