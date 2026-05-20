import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkData() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_management';
  console.log('Connecting to:', uri);
  try {
    await mongoose.connect(uri);
    console.log('Connected.');

    const dbs = await mongoose.connection.db.admin().listDatabases();
    console.log('\nAll Databases:');
    dbs.databases.forEach(db => console.log(` - ${db.name}`));

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('\nCollections in current DB:');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(` - ${col.name} (${count} docs)`);
      if (col.name === 'companies') {
          const comps = await db.collection(col.name).find().toArray();
          comps.forEach(c => console.log(`   * Company: ${c.name} (${c._id})`));
      }
      if (col.name === 'authlookups') {
          const looks = await db.collection(col.name).find().toArray();
          looks.forEach(l => console.log(`   * Auth: ${l.email} -> ${l.tenantId}`));
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkData();
