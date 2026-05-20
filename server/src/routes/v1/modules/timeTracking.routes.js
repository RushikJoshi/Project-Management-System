import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validateBody } from '../../../middleware/validate.middleware.js';
import * as TimeTrackingController from '../../../controllers/timeTracking.controller.js';

const router = express.Router();
router.use(requireAuth);

const startTimerSchema = z.object({
  taskId: z.string().min(1)
});

const manualTimeSchema = z.object({
  taskId: z.string().min(1),
  durationMinutes: z.number().min(1),
  notes: z.string().optional()
});

router.get('/active', TimeTrackingController.getActiveTimer);
router.get('/task/:taskId', TimeTrackingController.getTaskTimeLogs);
router.post('/start', validateBody(startTimerSchema), TimeTrackingController.startTimer);
router.post('/stop', validateBody(startTimerSchema), TimeTrackingController.stopTimer);
router.post('/manual', validateBody(manualTimeSchema), TimeTrackingController.addManualTime);

export default router;
