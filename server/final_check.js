import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function finalCheck() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project-management';
  console.log('URI:', uri);
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const comps = await db.collection('companies').find({}).toArray();
    console.log('\nCompanies:');
    comps.forEach(c => console.log(` - ID: ${c._id}, Name: ${c.name}`));

    const looks = await db.collection('authlookups').find({}).toArray();
    console.log('\nAuthLookups:');
    looks.forEach(l => console.log(` - Email: ${l.email}, tenantId: ${l.tenantId}`));

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}
finalCheck();
