import express from 'express';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { authorize } from '../../../middleware/authorize.js';
import { PERMISSIONS } from '../../../config/permissions.config.js';
import * as rbacController from '../../../controllers/rbac.controller.js';


const router = express.Router();

router.use(requireAuth);
// Only those with permission.manage can access these endpoints
router.use(authorize(PERMISSIONS.PERMISSION_MANAGE));

// Registry
router.get('/registry', rbacController.getPermissionRegistry);
router.post('/registry/custom', rbacController.createCustomPermission);

// Roles
router.get('/roles', rbacController.listRoles);
router.post('/roles', rbacController.createRole);
router.put('/roles/:id', rbacController.updateRole);
router.delete('/roles/:id', rbacController.deleteRole);

// User Permissions Overrides
router.get('/users/:userId', rbacController.getUserPermissions);
router.put('/users/:userId', rbacController.updateUserPermissions);

export default router;
