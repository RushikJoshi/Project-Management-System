import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkTenantData() {
  const uri = 'mongodb://127.0.0.1:27017/GT_PMS_gitakshmi_technologies_org_0001';
  console.log('Connecting to:', uri);
  try {
    await mongoose.connect(uri);
    console.log('Connected.');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('\nCollections in tenant DB:');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(` - ${col.name} (${count} docs)`);
      if (col.name === 'users') {
          const users = await db.collection(col.name).find().toArray();
          users.forEach(u => console.log(`   * User: ${u.name} (${u.email})`));
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkTenantData();
