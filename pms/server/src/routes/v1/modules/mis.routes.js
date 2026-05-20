import express from 'express';
import { 
  createMIS, getMISById, getMISByEmployee, updateMIS, submitMIS, 
  getPendingMIS, approveMIS, rejectMIS
} from '../../../controllers/mis.controller.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

// Manager APIs
router.get('/pending', getPendingMIS);
router.put('/approve', approveMIS);
router.put('/reject', rejectMIS);

// Employee/MIS APIs
router.post('/create', createMIS);
router.put('/submit', submitMIS);
router.put('/update', updateMIS);
router.get('/employee/:employeeId', getMISByEmployee);
router.get('/:id', getMISById);

export default router;
