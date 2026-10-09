import express from 'express';
import {
  getMyAccount,
  transferMoney,
  depositFunds,
  getMyTransactions,
} from '../controllers/accountController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All account routes require a valid token (available to both parent and student)
router.use(authenticateToken);

router.get('/my-account', getMyAccount);
router.post('/transfer', transferMoney);
router.post('/deposit', depositFunds);
router.get('/transactions', getMyTransactions);

export default router;
