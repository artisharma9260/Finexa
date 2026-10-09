import express from 'express';
import {
  inviteStudent,
  getLinkedStudents,
  unlinkStudent,
  cancelInvite,
  setStudentLimits,
  getStudentLimits,
} from '../controllers/parentController.js';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// All parent routes require authentication and parent role
router.use(authenticateToken, authorizeRole('parent'));

router.post('/invite', inviteStudent);
router.get('/students', getLinkedStudents);
router.post('/unlink/:studentId', unlinkStudent);
router.delete('/invite/:inviteId', cancelInvite);
router.get('/limits/:studentId', getStudentLimits);
router.post('/limits/:studentId', setStudentLimits);

export default router;
