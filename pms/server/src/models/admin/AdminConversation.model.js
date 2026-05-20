import mongoose from 'mongoose';

const adminConversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    lastMessage: {
        text: String,
        senderId: mongoose.Schema.Types.ObjectId,
        createdAt: { type: Date, default: Date.now }
    },
    isGroup: { type: Boolean, default: false },
    groupName: String,
    groupAvatar: String,
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    groupType: {
        type: String,
        enum: ['project', 'team', 'manual'],
        default: 'manual'
    },
    department: String
}, { timestamps: true });

export function getAdminConversationModel(conn) {
    return conn.models.AdminConversation || conn.model('AdminConversation', adminConversationSchema);
}

export default adminConversationSchema;
