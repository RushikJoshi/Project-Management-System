import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AuthLookup from './src/models/AuthLookup.js';
import { getTenantModels } from './src/config/tenantDb.js';

dotenv.config();

async function moveUser() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const email = 'dhruvraval@gmail.com';
  const sourceTenantId = '6a041180b381931d1ac76852';
  const targetTenantId = '6a0412ceb381931d1ac76a4e';

  // 1. Get user data from source
  const source = await getTenantModels(sourceTenantId);
  const sourceUser = await source.User.findOne({ email });
  
  if (!sourceUser) {
    console.log('User not found in source tenant');
  } else {
    // Delete from source
    await source.User.deleteOne({ email });
    await source.Membership.deleteOne({ userId: sourceUser._id });
    console.log('Deleted user from source tenant');
  }

  // 2. Create in target
  const target = await getTenantModels(targetTenantId);
  const client = await target.Client.findOne({}); // Get the first client in target
  const workspace = await target.Workspace.findOne({});

  if (!client || !workspace) {
    console.log('No Client or Workspace found in target tenant');
    return;
  }

  const user = new target.User({
    tenantId: targetTenantId,
    name: 'Dhruv Raval',
    email,
    passwordHash: sourceUser?.passwordHash || '$2b$12$R.S2H3o0FvY7k4q7U3W1e.R.S2H3o0FvY7k4q7U3W1e.R.S2H3o0Fv', // dummy if not found
    role: 'CLIENT_ADMIN',
    userType: 'client',
    clientId: client._id,
    isActive: true,
  });
  await user.save();
  console.log('Created user in target tenant');

  await target.Membership.updateOne(
    { userId: user._id, workspaceId: workspace._id },
    { $set: { tenantId: targetTenantId, role: 'CLIENT_ADMIN', status: 'active' } },
    { upsert: true }
  );
  console.log('Created membership in target tenant');

  // 3. Update AuthLookup
  await AuthLookup.updateOne(
    { email },
    { $set: { email, tenantId: targetTenantId } },
    { upsert: true }
  );
  console.log('AuthLookup updated to target tenant');

  // 4. Update all projects in target to be visible
  const updateResult = await target.Project.updateMany(
    {},
    { $set: { clientId: client._id, visibleToClient: true } }
  );
  console.log('Updated projects in target:', updateResult);

  await mongoose.disconnect();
  console.log('\nMOVE COMPLETE! Refresh Dhruv\'s dashboard.');
}

moveUser().catch(console.error);
