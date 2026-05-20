import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { requireAuth, requireInternalUser, requireRole } from '../../../middleware/auth.middleware.js';
import { validateBody } from '../../../middleware/validate.middleware.js';
import * as WorkSessionsController from '../../../controllers/workSessions.controller.js';

const router = express.Router();

const logoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.sub || req.ip,
  handler: (_req, res) => res.status(429).json({
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many logout attempts. Please wait a minute.' },
  }),
});

const activitySchema = z.object({
  sessionId: z.string().min(1),
  activityType: z.enum(['task_open', 'task_update', 'status_change', 'comment_add', 'file_upload', 'idle_start', 'idle_end']),
  taskId: z.string().optional(),
  description: z.string().max(5000).optional(),
});

const pendingEntrySchema = z.object({
  taskId: z.string().min(1),
  reason: z.string().trim().min(20).max(10000),
  blockerType: z.enum(['Client', 'Technical', 'Dependency', 'Other']),
  expectedCompletion: z.string().datetime(),
});

const logoutSchema = z.object({
  sessionId: z.string().min(1),
  option: z.enum(['direct', 'submit_reason', 'request_extension']),
  data: z.object({
    tasks: z.array(pendingEntrySchema).optional(),
  }).optional(),
});

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  comment: z.string().trim().max(5000).optional(),
}).refine((value) => value.action === 'approve' || Boolean(value.comment?.trim()), {
  message: 'Comment is required when rejecting an extension request',
  path: ['comment'],
});

router.use(requireAuth, requireInternalUser);

router.get('/me', WorkSessionsController.mySummary);
router.post('/activity', validateBody(activitySchema), WorkSessionsController.activity);
router.get('/pending-tasks', WorkSessionsController.checkPending);
router.post('/logout', logoutLimiter, validateBody(logoutSchema), WorkSessionsController.logout);

router.get('/manager/pending-logout', requireRole(['super_admin', 'admin', 'manager', 'team_leader']), WorkSessionsController.pendingReports);
router.get('/manager/productivity', requireRole(['super_admin', 'admin', 'manager', 'team_leader']), WorkSessionsController.productivity);
router.patch('/manager/extensions/:id', requireRole(['super_admin', 'admin', 'manager', 'team_leader']), validateBody(reviewSchema), WorkSessionsController.reviewExtension);

export default router;
