import { getTenantModels } from '../../config/tenantDb.js';
import mongoose from 'mongoose';

const getCurrentUser = (req) => ({
    id: req.auth?.id || req.auth?.sub || req.user?.id,
    companyId: req.auth?.companyId || req.user?.companyId,
    name: req.auth?.name || req.user?.name || 'User',
    role: req.auth?.role || req.user?.role,
});

const isParticipant = (conversation, userId) =>
    Array.isArray(conversation?.participants) &&
    conversation.participants.some((participant) => {
        const pId = typeof participant === 'string' ? participant : (participant._id || participant.id);
        return String(pId) === String(userId);
    });

const findDirectConversation = async (AdminConversation, senderId, participantId) =>
    AdminConversation.findOne({
        isGroup: false,
        participants: { $all: [senderId, participantId] },
        'participants.0': { $exists: true },
        'participants.1': { $exists: true },
        'participants.2': { $exists: false },
    });

// Get list of conversations for current user
export const getConversations = async (req, res) => {
    try {
        const { id: userId, companyId } = getCurrentUser(req);
        const { AdminConversation, AdminMessage } = await getTenantModels(companyId);

        const conversations = await AdminConversation.find({
            participants: userId
        })
        .populate('participants', 'name email avatar role')
        .sort({ updatedAt: -1 });
        
        const results = await Promise.all(conversations.map(async (convo) => {
            const unreadCount = await AdminMessage.countDocuments({
                conversationId: convo._id,
                senderId: { $ne: userId },
                isRead: false
            });
            const json = convo.toJSON();
            json.unreadCount = unreadCount;
            // Ensure participants length is accurate for the frontend
            if (convo.participants) {
                json.participants = convo.participants;
            }
            return json;
        }));
        
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mark as read
export const markAsRead = async (req, res) => {
    try {
        const { id: userId, companyId } = getCurrentUser(req);
        const { AdminMessage } = await getTenantModels(companyId);
        const { conversationId } = req.params;

        await AdminMessage.updateMany(
            { conversationId, senderId: { $ne: userId }, isRead: false },
            { $set: { isRead: true } }
        );
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get messages for a specific conversation
export const getMessages = async (req, res) => {
    try {
        const { id: userId, companyId } = getCurrentUser(req);
        const { AdminConversation, AdminMessage } = await getTenantModels(companyId);
        const { conversationId } = req.params;

        const conversation = await AdminConversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
        if (!isParticipant(conversation, userId)) {
            return res.status(403).json({ message: 'You are not a participant in this conversation.' });
        }

        const messages = await AdminMessage.find({ conversationId })
            .sort({ createdAt: 1 })
            .populate('senderId', 'name avatar');
        
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Send a message
export const sendMessage = async (req, res) => {
    try {
        const { conversationId, text, attachments } = req.body;
        const { id: senderId, companyId, name: senderName } = getCurrentUser(req);
        const { AdminConversation, AdminMessage } = await getTenantModels(companyId);

        // If conversationId is provided, use it, else create new conversation
        let conversation;
        if (conversationId) {
            conversation = await AdminConversation.findById(conversationId);
        } else {
            const { participantId } = req.body;
            if (!participantId || String(participantId) === String(senderId)) {
                return res.status(400).json({ message: 'A valid participant is required.' });
            }
            // Check if conversation already exists between these users
            conversation = await findDirectConversation(AdminConversation, senderId, participantId);

            if (!conversation) {
                conversation = new AdminConversation({
                    participants: [senderId, participantId]
                });
                await conversation.save();
            }
        }

        if (!conversation) return res.status(404).json({ message: "Conversation not found." });
        if (!isParticipant(conversation, senderId)) {
            return res.status(403).json({ message: 'You are not a participant in this conversation.' });
        }
        if (!String(text || '').trim()) {
            return res.status(400).json({ message: 'Message text is required.' });
        }

        const newMessage = new AdminMessage({
            conversationId: conversation._id,
            senderId,
            senderName,
            text: String(text).trim(),
            attachments: attachments || []
        });

        await newMessage.save();

        // Update last message in conversation
        conversation.lastMessage = {
            text: text,
            senderId: senderId,
            createdAt: new Date()
        };
        await conversation.save();

        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a group conversation
export const createGroup = async (req, res) => {
    try {
        const { groupName, participantIds, projectId, groupType, department } = req.body;
        const { id: senderId, companyId } = getCurrentUser(req);
        const { AdminConversation, Project } = await getTenantModels(companyId);

        if (!groupName || !participantIds) {
            return res.status(400).json({ message: "Group name and participants are required" });
        }

        const allParticipants = [...new Set([...participantIds, senderId])];

        if (projectId) {
            const project = await Project.findById(projectId).select('members ownerId');
            if (!project) {
                return res.status(404).json({ message: 'Project not found.' });
            }

            const allowedIds = new Set([
                ...((project.members || []).map((memberId) => String(memberId))),
                String(project.ownerId),
            ]);
            const hasUnauthorizedMember = allParticipants.some((participantId) => !allowedIds.has(String(participantId)));
            if (hasUnauthorizedMember) {
                return res.status(400).json({ message: 'Project chat participants must belong to the project.' });
            }
        }

        const conversation = new AdminConversation({
            participants: allParticipants,
            isGroup: true,
            groupName: groupName,
            projectId: projectId,
            groupType: groupType || 'manual',
            department: department || 'General'
        });

        await conversation.save();
        
        // Populate participants info
        await AdminConversation.populate(conversation, {
            path: 'participants',
            select: 'name email avatar role'
        });

        res.status(201).json(conversation);
    } catch (error) {
        console.error('SERVER ERROR in createGroup:', error);
        res.status(500).json({ message: error.message });
    }
};

// Create or find a direct conversation
export const startConversation = async (req, res) => {
    try {
        const { participantId } = req.body;
        const { id: senderId, companyId } = getCurrentUser(req);
        const { AdminConversation, User } = await getTenantModels(companyId);

        if (!participantId || String(participantId) === String(senderId)) {
            return res.status(400).json({ message: 'A valid participant is required.' });
        }

        const otherUser = await User.findById(participantId).select('_id');
        if (!otherUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        let conversation = await findDirectConversation(AdminConversation, senderId, participantId);
        
        if (conversation) {
            await AdminConversation.populate(conversation, { path: 'participants', select: 'name email avatar role' });
        } else {
            conversation = new AdminConversation({
                participants: [senderId, participantId]
            });
            await conversation.save();
            await AdminConversation.populate(conversation, { path: 'participants', select: 'name email avatar role' });
        }

        res.status(200).json(conversation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
