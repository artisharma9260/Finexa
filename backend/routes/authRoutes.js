import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (requires valid JWT token)
router.get('/me', authenticateToken, getMe);

// Role-protected test routes
router.get('/parent-only', authenticateToken, authorizeRole('parent'), (req, res) => {
  res.status(200).json({
    message: `Access granted: Welcome to the parent dashboard, ${req.user.name}!`,
    user: req.user,
  });
});

router.get('/student-only', authenticateToken, authorizeRole('student'), (req, res) => {
  res.status(200).json({
    message: `Access granted: Welcome to the student portal, ${req.user.name}!`,
    user: req.user,
  });
});

export default router;
