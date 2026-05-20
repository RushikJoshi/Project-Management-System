import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkBug() {
  const uri = process.env.MONGO_URI;
  try {
    await mongoose.connect(uri);
    const tenantDb = mongoose.connection.useDb('GT_PMS_infomax_org_0002');
    
    // Find all clients with email and contactPerson
    const clients = await tenantDb.collection('clients').find({}).toArray();
    console.log('\nClients in Infomax:');
    clients.forEach(c => console.log(` - ${c.companyName} (${c._id}) -> Email: ${c.email}, Contact: ${c.contactPerson}`));

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkBug();
