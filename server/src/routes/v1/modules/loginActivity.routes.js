import express from 'express';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import * as LoginActivityController from '../../../controllers/loginActivity.controller.js';

const router = express.Router();

router.get('/', requireAuth, LoginActivityController.getActivityLogs);
router.get('/analytics', requireAuth, LoginActivityController.getLoginActivityAnalytics);
router.get('/my-activity', requireAuth, LoginActivityController.getMyActivityLogs);
router.get('/:id', requireAuth, LoginActivityController.getActivityLogById);
router.get('/user/:userId', requireAuth, LoginActivityController.getUserActivityLogs);
router.post('/force-logout/:sessionId', requireAuth, LoginActivityController.forceLogout);

export default router;
