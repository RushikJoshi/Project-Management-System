import { Router } from 'express';
import * as PerformanceController from '../../../controllers/performance.controller.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/discovery', PerformanceController.getDiscovery);
router.get('/me', PerformanceController.getMyMetrics);

router.get('/workspace', PerformanceController.getWorkspaceMetrics);
router.get('/user/:userId', PerformanceController.getUserMetrics);
router.get('/team/:teamId', PerformanceController.getTeamMetrics);


export default router;
