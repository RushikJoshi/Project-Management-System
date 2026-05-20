import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validateBody } from '../../../middleware/validate.middleware.js';
import * as TicketsController from '../../../controllers/tickets.controller.js';

const router = express.Router();

router.use(requireAuth);

const ticketCreateSchema = z.object({
  projectId: z.string(),
  workspaceId: z.string().optional(),
  title: z.string().trim().min(3).max(300),
  description: z.string().trim().max(10000),
  type: z.enum([
    'BUG', 'CHANGE_REQUEST', 'NEW_FEATURE', 'UI_CHANGE', 
    'URGENT_FIX', 'PERFORMANCE_ISSUE', 'SECURITY_ISSUE', 
    'CONTENT_UPDATE', 'API_CHANGE', 'OTHER'
  ]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'BLOCKER']),
  attachments: z.array(z.any()).optional(),
});

const statusUpdateSchema = z.object({
  status: z.enum([
    'OPEN', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 
    'ON_HOLD', 'IN_PROGRESS', 'TESTING', 'CLIENT_REVIEW', 
    'REVISION_REQUIRED', 'COMPLETED', 'CLOSED'
  ]),
  note: z.string().trim().max(5000).optional(),
});

const commentSchema = z.object({
  content: z.string().trim().min(1),
  isInternal: z.boolean().optional(),
  attachments: z.array(z.any()).optional(),
});

const assignSchema = z.object({
  assigneeId: z.string(),
});

router.get('/', TicketsController.listTickets);
router.post('/', validateBody(ticketCreateSchema), TicketsController.createTicket);
router.get('/analytics', TicketsController.getAnalytics);
router.get('/:id', TicketsController.getTicketDetails);
router.patch('/:id/status', validateBody(statusUpdateSchema), TicketsController.updateTicketStatus);
router.post('/:id/comments', validateBody(commentSchema), TicketsController.addComment);
router.patch('/:id/assign', validateBody(assignSchema), TicketsController.assignTicket);

export default router;
