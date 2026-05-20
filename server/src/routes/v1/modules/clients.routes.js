import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { validateBody } from '../../../middleware/validate.middleware.js';
import { authorize } from '../../../middleware/authorize.js';
import * as ClientsController from '../../../controllers/clients.controller.js';

const router = express.Router();

router.use(requireAuth);

const clientCreateSchema = z.object({
  companyName: z.string().trim().min(2).max(200),
  contactPerson: z.string().trim().max(120).optional().or(z.literal('')),
  email: z.string().email().max(200),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  website: z.string().trim().max(500).optional().or(z.literal('')),
  industry: z.string().trim().max(120).optional().or(z.literal('')),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),
  taxId: z.string().trim().max(80).optional().or(z.literal('')),
  clientType: z.enum(['enterprise', 'individual', 'partner']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  notes: z.string().trim().max(5000).optional().or(z.literal('')),
});

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(120).optional(),
  password: z.string().min(6).max(128).optional().or(z.literal('')),
  role: z.enum(['CLIENT_ADMIN', 'CLIENT_MANAGER', 'CLIENT_REVIEWER', 'CLIENT_VIEWER']),
  projectIds: z.array(z.string()).optional(),
});

const assignProjectsSchema = z.object({
  projectIds: z.array(z.string()),
});

router.get('/', ClientsController.listClients);
router.get('/:id', ClientsController.getClient);
router.post('/', validateBody(clientCreateSchema), ClientsController.createClient);
router.put('/:id', validateBody(clientCreateSchema.partial()), ClientsController.updateClient);
router.post('/:id/invite', authorize('client.user.invite'), validateBody(inviteSchema), ClientsController.inviteClientUser);
router.post('/:id/projects', validateBody(assignProjectsSchema), ClientsController.assignProjects);

export default router;
