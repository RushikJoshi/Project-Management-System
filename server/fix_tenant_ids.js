import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function fixTenantIds() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project-management';
  const tenantDbName = 'GT_PMS_gitakshmi_technologies_org_0001';
  
  try {
    await mongoose.connect(uri);
    const centralDb = mongoose.connection.db;
    
    // 1. Get the CORRECT Company ID
    const company = await centralDb.collection('companies').findOne({ name: /Gitakshmi Technologies/i });
    if (!company) {
        console.error('Company not found!');
        return;
    }
    const correctTenantId = company._id;
    console.log(`Correct Tenant ID: ${correctTenantId}`);

    // 2. Update AuthLookups
    const authResult = await centralDb.collection('authlookups').updateMany(
        { email: /@gitakshmi/i },
        { $set: { tenantId: correctTenantId } }
    );
    const authResult2 = await centralDb.collection('authlookups').updateMany(
        { email: /@gitakshmitechnologies/i },
        { $set: { tenantId: correctTenantId } }
    );
    console.log(`Updated AuthLookups: ${authResult.modifiedCount + authResult2.modifiedCount}`);

    // 3. Update Tenant DB records
    const tenantConn = mongoose.connection.useDb(tenantDbName);
    
    // Update Users
    const userResult = await tenantConn.collection('users').updateMany(
        {},
        { $set: { tenantId: correctTenantId } }
    );
    console.log(`Updated Users: ${userResult.modifiedCount}`);

    // Update Memberships
    const memResult = await tenantConn.collection('memberships').updateMany(
        {},
        { $set: { tenantId: correctTenantId } }
    );
    console.log(`Updated Memberships: ${memResult.modifiedCount}`);

    // Update Projects
    const projResult = await tenantConn.collection('projects').updateMany(
        {},
        { $set: { tenantId: correctTenantId } }
    );
    console.log(`Updated Projects: ${projResult.modifiedCount}`);

    await mongoose.disconnect();
    console.log('\nFix applied successfully!');
  } catch (err) {
    console.error(err);
  }
}
fixTenantIds();
