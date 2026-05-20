import express from 'express';
import * as ClientTeamsController from '../../../controllers/clientTeams.controller.js';
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

router.get('/summary', ClientTeamsController.getSummary);
router.get('/list', ClientTeamsController.getList);
router.get('/:id', ClientTeamsController.getDetails);

export default router;
