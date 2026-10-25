import express from 'express';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', getMyNotifications);
router.patch('/:id/read', markAsRead);
router.post('/mark-all-read', markAllAsRead);

export default router;
