import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from './src/models/Company.js';
import { getTenantModels } from './src/config/tenantDb.js';

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const companies = await Company.find({});
  for (const company of companies) {
    const { Client, User } = await getTenantModels(company._id);
    const clientCount = await Client.countDocuments({});
    const userCount = await User.countDocuments({});
    const clientUsers = await User.countDocuments({ userType: 'client' });
    
    console.log(`Company: ${company.companyName} (${company._id})`);
    console.log(` - Clients: ${clientCount}`);
    console.log(` - Users: ${userCount} (${clientUsers} are clients)`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
