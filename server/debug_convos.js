import mongoose from 'mongoose';
import AdminConversation from './src/models/admin/AdminConversation.model.js';

async function run() {
    const MONGO_URI = 'mongodb://127.0.0.1:27017/gt_pms';
    await mongoose.connect(MONGO_URI);
    const convos = await AdminConversation.find({}).lean();
    convos.forEach(c => {
        console.log(`Convo ID: ${c._id}, Type: ${c.isGroup ? 'Group' : 'Direct'}, Name: ${c.groupName || 'N/A'}, Participants Range: ${c.participants.length}`);
        console.log('Participants:', c.participants);
    });
    await mongoose.disconnect();
}

run().catch(console.error);
