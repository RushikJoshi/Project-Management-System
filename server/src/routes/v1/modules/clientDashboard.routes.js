import express from 'express';
import * as ClientDashboardController from '../../../controllers/clientDashboard.controller.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';

const router = express.Router();

// Middleware to ensure user is a client
const requireClient = (req, res, next) => {
  if (req.auth?.userType !== 'client') {
    return res.status(403).json({ success: false, error: { message: 'Access restricted to client users' } });
  }
  next();
};

router.use(requireAuth);
router.use(requireClient);

router.get('/stats', ClientDashboardController.getStats);
router.get('/projects', ClientDashboardController.getProjects);
router.get('/activity', ClientDashboardController.getActivity);

export default router;
