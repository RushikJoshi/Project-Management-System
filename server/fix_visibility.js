import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AuthLookup from './src/models/AuthLookup.js';
import { getTenantModels } from './src/config/tenantDb.js';

dotenv.config();

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const email = 'dhruvraval@gmail.com';
  const lookup = await AuthLookup.findOne({ email });
  
  if (!lookup) {
    console.log('No AuthLookup found');
    return;
  }

  const { User, Client, Project } = await getTenantModels(lookup.tenantId);
  const user = await User.findOne({ email });
  const client = await Client.findOne({}); // Get the first client

  if (!user || !client) {
    console.log('User or Client not found');
    return;
  }

  // Update user's clientId
  user.clientId = client._id;
  await user.save();
  console.log('Updated User clientId to:', client._id);

  // Update projects to be visible to this client
  const updateResult = await Project.updateMany(
    {}, // Update all projects for this demo, or we could be more specific
    { $set: { clientId: client._id, visibleToClient: true } }
  );
  console.log('Updated projects visibility:', updateResult);

  await mongoose.disconnect();
  console.log('\nFIX COMPLETE! Refresh the dashboard now.');
}

fix().catch(console.error);
