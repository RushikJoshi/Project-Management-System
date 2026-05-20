import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validateBody } from '../../../middleware/validate.middleware.js';
import * as TimelineController from '../../../controllers/timeline.controller.js';

const router = express.Router();

router.use(requireAuth);

const phaseSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(160),
  order: z.number().optional(),
  color: z.string().trim().max(32).optional(),
});

const timelineUpsertSchema = z.object({
  status: z.enum(['Draft', 'Approved']).optional(),
  settings: z.object({
    zoom: z.enum(['day', 'week', 'month']).optional(),
    baselineVisible: z.boolean().optional(),
    showCriticalPath: z.boolean().optional(),
  }).optional(),
  phases: z.array(phaseSchema).optional(),
});

const dependencySchema = z.object({
  projectId: z.string().min(10),
  fromTaskId: z.string().min(10),
  toTaskId: z.string().min(10),
});

const patchTimelineTaskSchema = z.object({
  projectId: z.string().min(10),
  title: z.string().trim().min(1).max(300).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  phaseId: z.string().nullable().optional(),
  dependencies: z.array(z.string()).optional(),
  type: z.enum(['task', 'milestone']).optional(),
  assigneeIds: z.array(z.string()).optional(),
  status: z.string().optional(),
}).strict();

router.patch('/task/:id', validateBody(patchTimelineTaskSchema), TimelineController.patchTaskTimeline);
router.post('/dependency', validateBody(dependencySchema), TimelineController.createDependency);
router.patch('/:projectId/lock', TimelineController.lockTimeline);
router.patch('/:projectId/unlock', TimelineController.unlockTimeline);
router.get('/:projectId', TimelineController.getTimeline);
router.post('/:projectId', validateBody(timelineUpsertSchema), TimelineController.upsertTimeline);

export default router;
