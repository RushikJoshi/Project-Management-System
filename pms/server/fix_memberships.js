import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function fixMemberships() {
  const centralUri = 'mongodb://127.0.0.1:27017/project-management';
  const tenantDbName = 'GT_PMS_gitakshmi_technologies_org_0001';
  
  try {
    await mongoose.connect(centralUri);
    const tenantConn = mongoose.connection.useDb(tenantDbName);

    // Get all workspaces in this tenant DB
    const workspaces = await tenantConn.collection('workspaces').find({}).toArray();
    console.log(`Found ${workspaces.length} workspaces in tenant DB.`);

    for (const ws of workspaces) {
        console.log(`Processing Workspace: ${ws.name} (Tenant: ${ws.tenantId}, ID: ${ws._id})`);
        
        // Find all memberships that SHOULD belong to this workspace (same tenantId)
        // and update them to point to this workspaceId
        const result = await tenantConn.collection('memberships').updateMany(
            { tenantId: ws.tenantId },
            { $set: { workspaceId: ws._id } }
        );
        console.log(` - Updated ${result.modifiedCount} memberships.`);
    }

    console.log('\nFix completed!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

fixMemberships();
