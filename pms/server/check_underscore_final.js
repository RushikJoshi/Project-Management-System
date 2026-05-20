import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkUnderscore() {
  const uri = 'mongodb://127.0.0.1:27017/project_management';
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const comps = await db.collection('companies').find({}).toArray();
    console.log('\nCompanies in project_management (underscore):');
    comps.forEach(c => console.log(` - ID: ${c._id}, Name: ${c.name}`));

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}
checkUnderscore();
