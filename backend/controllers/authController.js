import User from '../models/User.js';
import Invitation from '../models/Invitation.js';
import Account from '../models/Account.js';
import Limit from '../models/Limit.js';
import Transaction from '../models/Transaction.js';
import { generateToken } from '../utils/generateToken.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: 'Please provide all required fields: name, email, password, role',
      });
    }

    // Validate role
    if (!['parent', 'student'].includes(role)) {
      return res.status(400).json({
        message: "Invalid role. Role must be either 'parent' or 'student'",
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        message: 'A user with this email already exists',
      });
    }

    // If role is student, check if a parent sent an invitation
    let parentId = null;
    if (role === 'student') {
      const pendingInvite = await Invitation.findOne({
        studentEmail: email.toLowerCase(),
        status: 'pending',
      });
      if (pendingInvite) {
        parentId = pendingInvite.parentId;
        pendingInvite.status = 'accepted';
        await pendingInvite.save();
      }
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
      parentId,
    });

    // Create Account with starter balance for user
    const account = await Account.create({
      userId: user._id,
      balance: 500,
    });

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        parentId: user.parentId,
        accountId: account._id,
        balance: account.balance,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error during registration',
      error: error.message,
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: 'Please provide both email and password',
      });
    }

    // Check user existence
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    // Retrieve or initialize account
    let account = await Account.findOne({ userId: user._id });
    if (!account) {
      account = await Account.create({ userId: user._id, balance: 500 });
    }

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        parentId: user.parentId,
        accountId: account._id,
        balance: account.balance,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error during login',
      error: error.message,
    });
  }
};

// @desc    Get currently logged in user profile
// @route   GET /api/auth/me
// @access  Private (Token required)
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('parentId', 'name email');

    let account = await Account.findOne({ userId: req.user._id });
    if (!account) {
      account = await Account.create({ userId: req.user._id, balance: 500 });
    }

    let parentAccount = null;
    if (user.parentId) {
      parentAccount = await Account.findOne({ userId: user.parentId._id });
      if (!parentAccount) {
        parentAccount = await Account.create({
          userId: user.parentId._id,
          balance: 500,
        });
      }
    }

    let studentLimit = null;
    let spentStats = null;
    if (user.role === 'student') {
      studentLimit = await Limit.findOne({ studentId: user._id });
      if (studentLimit) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(
          startOfDay.getFullYear(),
          startOfDay.getMonth(),
          1
        );

        const dailyTxs = await Transaction.find({
          from: account._id,
          status: 'completed',
          createdAt: { $gte: startOfDay },
        });

        const monthlyTxs = await Transaction.find({
          from: account._id,
          status: 'completed',
          createdAt: { $gte: startOfMonth },
        });

        spentStats = {
          dailySpent: dailyTxs.reduce((sum, tx) => sum + tx.amount, 0),
          monthlySpent: monthlyTxs.reduce((sum, tx) => sum + tx.amount, 0),
        };
      }
    }

    res.status(200).json({
      user,
      account,
      parentAccount: parentAccount
        ? { id: parentAccount._id, balance: parentAccount.balance }
        : null,
      limit: studentLimit,
      spentStats,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error retrieving profile',
      error: error.message,
    });
  }
};
