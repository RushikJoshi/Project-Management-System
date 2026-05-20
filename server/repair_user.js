import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AuthLookup from './src/models/AuthLookup.js';
import Company from './src/models/Company.js';
import { getTenantModels } from './src/config/tenantDb.js';
import { hashPassword } from './src/utils/password.js';
import crypto from 'crypto';

dotenv.config();

async function repair() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const email = 'dhruvraval@gmail.com';
  const password = 'dhruv@123';
  const passwordHash = await hashPassword(password);

  // Find the company (assuming it's the first one or we find it by client)
  const companies = await Company.find({});
  if (companies.length === 0) {
    console.log('No companies found');
    return;
  }
  
  const companyId = companies[0]._id;
  const { User, Workspace, Membership, Client } = await getTenantModels(companyId);
  
  console.log('Repairing user for company ID:', companyId);

  // 1. Create User
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({
      tenantId: companyId,
      name: 'Dhruv Raval',
      email,
      passwordHash,
      role: 'CLIENT_ADMIN',
      userType: 'client',
      clientId: null,
      isActive: true,
    });
    await user.save();
    console.log('User created in tenant DB');
  } else {
    user.passwordHash = passwordHash;
    await user.save();
    console.log('User password updated in tenant DB');
  }

  // 2. Create AuthLookup
  await AuthLookup.updateOne(
    { email },
    { $set: { email, tenantId: companyId } },
    { upsert: true }
  );
  console.log('AuthLookup created for', email);

  // 3. Create Workspace & Membership
  let workspace = await Workspace.findOne({});
  if (!workspace) {
    workspace = await Workspace.create({
      tenantId: companyId,
      name: 'Main Workspace',
      slug: 'main-' + crypto.randomBytes(3).toString('hex'),
    });
    console.log('Workspace created');
  }

  await Membership.updateOne(
    { userId: user._id, workspaceId: workspace._id },
    { $set: { tenantId: companyId, role: 'CLIENT_ADMIN', status: 'active' } },
    { upsert: true }
  );
  console.log('Membership created');

  await mongoose.disconnect();
  console.log('\nREPAIR COMPLETE! You can now login with dhruvraval@gmail.com / dhruv@123');
}

repair().catch(console.error);
