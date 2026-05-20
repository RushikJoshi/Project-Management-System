import express from 'express';
import { requireAuth, requireInternalUser, requireRole } from '../../../middleware/auth.middleware.js';
import * as MonitoringController from '../../../controllers/monitoring.controller.js';

const router = express.Router();

router.use(requireAuth, requireInternalUser);

// All monitoring routes require Admin, Manager, or Team Leader roles
router.use(requireRole(['super_admin', 'admin', 'manager', 'team_leader']));

router.get('/pending', MonitoringController.getPendingTasks);
router.get('/extensions', MonitoringController.getExtensions);
router.get('/completion-remarks', MonitoringController.getCompletionRemarks);
router.get('/daily-logs', MonitoringController.getDailyLogs);
router.get('/productivity', MonitoringController.getProductivity);
router.get('/timeline/:employeeId', MonitoringController.getTimeline);

export default router;
