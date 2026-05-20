import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AuthLookup from './src/models/AuthLookup.js';
import Company from './src/models/Company.js';
import { getTenantModels } from './src/config/tenantDb.js';

dotenv.config();

async function debug() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const allLookups = await AuthLookup.find({});
  console.log('Total AuthLookups in DB:', allLookups.length);
  allLookups.forEach(l => console.log(` - ${l.email} -> ${l.tenantId}`));

  const allCompanies = await Company.find({});
  console.log('Total Companies in DB:', allCompanies.length);
  allCompanies.forEach(c => console.log(` - ${c.companyName} (${c._id})`));

  const email = 'dhruvraval@gmail.com';
  const lookup = await AuthLookup.findOne({ email });
  
  if (!lookup) {
    console.log('\nResult for', email, ': No AuthLookup found');
  } else {
    console.log('\nResult for', email, ': AuthLookup found:', {
      email: lookup.email,
      tenantId: lookup.tenantId
    });

    const company = await Company.findById(lookup.tenantId);
    console.log('Company found:', company?.companyName);

    const { User, Membership } = await getTenantModels(lookup.tenantId);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('User NOT found in tenant DB');
    } else {
      console.log('User found in tenant DB:', {
        id: user._id,
        email: user.email,
        role: user.role,
        userType: user.userType,
        hasPassword: !!user.passwordHash
      });

      const membership = await Membership.findOne({ userId: user._id });
      console.log('Membership found:', !!membership);
    }
  }

  await mongoose.disconnect();
}

debug().catch(console.error);
