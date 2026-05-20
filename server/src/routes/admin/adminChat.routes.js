import express from 'express';
import { getConversations, getMessages, sendMessage, startConversation, createGroup, markAsRead } from '../../controllers/admin/adminChat.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { heartbeat, getOnlineUserIds } from '../../services/presence.service.js';

const router = express.Router();

console.log('--- Registering Admin Chat Routes ---');

router.use(requireAuth);

router.get('/conversations', getConversations);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/messages', sendMessage);
router.post('/conversations/start', startConversation);
router.post('/conversations/group', createGroup);
router.post('/conversations/:conversationId/read', markAsRead);

// Presence
router.post('/heartbeat', (req, res) => {
  const userId = req.auth?.sub;
  if (userId) heartbeat(userId);
  res.json({ ok: true });
});

router.get('/online-users', (req, res) => {
  res.json({ onlineUserIds: getOnlineUserIds() });
});

export default router;

