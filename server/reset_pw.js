import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AuthLookup from './src/models/AuthLookup.js';
import { getTenantModels } from './src/config/tenantDb.js';
import { hashPassword } from './src/utils/password.js';

dotenv.config();

async function resetPassword() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const email = 'dhruvraval@gmail.com';
  const password = 'dhruv@123';
  const tenantId = '6a0412ceb381931d1ac76a4e';

  const { User } = await getTenantModels(tenantId);
  const user = await User.findOne({ email });

  if (!user) {
    console.log('User not found in tenant', tenantId);
    return;
  }

  const passwordHash = await hashPassword(password);
  user.passwordHash = passwordHash;
  await user.save();

  console.log('Successfully reset password for', email, 'in tenant', tenantId);
  console.log('New hash starts with:', passwordHash.substring(0, 10));

  await mongoose.disconnect();
}

resetPassword().catch(console.error);
