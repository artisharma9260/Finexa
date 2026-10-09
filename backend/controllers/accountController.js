import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Limit from '../models/Limit.js';

// @desc    Get currently logged in user's account & balance
// @route   GET /api/accounts/my-account
// @access  Private (Student or Parent)
export const getMyAccount = async (req, res) => {
  try {
    let account = await Account.findOne({ userId: req.user._id }).populate(
      'userId',
      'name email role'
    );

    // If user doesn't have an account yet, create one with $500 starter balance
    if (!account) {
      account = await Account.create({
        userId: req.user._id,
        balance: 500,
      });
      account = await Account.findById(account._id).populate(
        'userId',
        'name email role'
      );
    }

    res.status(200).json({
      account,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve account',
      error: error.message,
    });
  }
};

// @desc    Transfer money to another account by account ID using MongoDB transaction
// @route   POST /api/accounts/transfer
// @access  Private (Student or Parent)
export const transferMoney = async (req, res) => {
  const { toAccountId, amount } = req.body;

  // Validate inputs
  if (!toAccountId) {
    return res.status(400).json({
      message: 'Destination account ID (toAccountId) is required',
    });
  }

  if (amount === undefined || amount === null) {
    return res.status(400).json({
      message: 'Transfer amount is required',
    });
  }

  const transferAmount = Number(amount);
  if (isNaN(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({
      message: 'Transfer amount must be a positive number greater than 0',
    });
  }

  if (!mongoose.Types.ObjectId.isValid(toAccountId)) {
    return res.status(400).json({
      message: 'Invalid destination account ID format',
    });
  }

  // Retrieve sender account
  let fromAccount = await Account.findOne({ userId: req.user._id });
  if (!fromAccount) {
    fromAccount = await Account.create({
      userId: req.user._id,
      balance: 500,
    });
  }

  // Check if transferring to self
  if (fromAccount._id.toString() === toAccountId.toString()) {
    return res.status(400).json({
      message: 'Cannot transfer money to your own account',
    });
  }

  // Retrieve receiver account
  const toAccount = await Account.findById(toAccountId);
  if (!toAccount) {
    return res.status(404).json({
      message: 'Destination account not found',
    });
  }

  // Reject transfers with insufficient balance
  if (fromAccount.balance < transferAmount) {
    return res.status(400).json({
      message: `Insufficient balance. Current balance is $${fromAccount.balance.toFixed(
        2
      )}, but transfer requires $${transferAmount.toFixed(2)}`,
      currentBalance: fromAccount.balance,
    });
  }

  // If sender is a student, enforce daily and monthly limits
  if (req.user.role === 'student') {
    const studentLimit = await Limit.findOne({ studentId: req.user._id });

    if (studentLimit) {
      // 1. Check Daily Limit
      if (
        studentLimit.dailyLimit !== undefined &&
        studentLimit.dailyLimit !== null
      ) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const dailyTransactions = await Transaction.find({
          from: fromAccount._id,
          status: 'completed',
          createdAt: { $gte: startOfDay },
        });

        const dailySpent = dailyTransactions.reduce(
          (sum, tx) => sum + tx.amount,
          0
        );

        if (dailySpent + transferAmount > studentLimit.dailyLimit) {
          // Save transfer as Blocked in Transaction model
          const blockedTx = await Transaction.create({
            from: fromAccount._id,
            to: toAccount._id,
            amount: transferAmount,
            status: 'Blocked',
            approvedBy: null,
            createdAt: new Date(),
          });

          return res.status(403).json({
            message: `Transfer blocked: Daily limit of $${studentLimit.dailyLimit.toFixed(
              2
            )} exceeded. Today's total spent is $${dailySpent.toFixed(
              2
            )}. Attempted transfer of $${transferAmount.toFixed(
              2
            )} would bring daily total to $${(dailySpent + transferAmount).toFixed(2)}.`,
            status: 'Blocked',
            dailySpent,
            dailyLimit: studentLimit.dailyLimit,
            attemptedAmount: transferAmount,
            transaction: blockedTx,
          });
        }
      }

      // 2. Check Monthly Limit
      if (
        studentLimit.monthlyLimit !== undefined &&
        studentLimit.monthlyLimit !== null
      ) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const monthlyTransactions = await Transaction.find({
          from: fromAccount._id,
          status: 'completed',
          createdAt: { $gte: startOfMonth },
        });

        const monthlySpent = monthlyTransactions.reduce(
          (sum, tx) => sum + tx.amount,
          0
        );

        if (monthlySpent + transferAmount > studentLimit.monthlyLimit) {
          // Save transfer as Blocked in Transaction model
          const blockedTx = await Transaction.create({
            from: fromAccount._id,
            to: toAccount._id,
            amount: transferAmount,
            status: 'Blocked',
            approvedBy: null,
            createdAt: new Date(),
          });

          return res.status(403).json({
            message: `Transfer blocked: Monthly limit of $${studentLimit.monthlyLimit.toFixed(
              2
            )} exceeded. This month's total spent is $${monthlySpent.toFixed(
              2
            )}. Attempted transfer of $${transferAmount.toFixed(
              2
            )} would bring monthly total to $${(monthlySpent + transferAmount).toFixed(2)}.`,
            status: 'Blocked',
            monthlySpent,
            monthlyLimit: studentLimit.monthlyLimit,
            attemptedAmount: transferAmount,
            transaction: blockedTx,
          });
        }
      }
    }
  }

  // Execute transfer using MongoDB Transaction
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    // Deduct safely with balance check inside transaction
    const updatedFrom = await Account.findOneAndUpdate(
      { _id: fromAccount._id, balance: { $gte: transferAmount } },
      { $inc: { balance: -transferAmount } },
      { returnDocument: 'after', session }
    );

    if (!updatedFrom) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Insufficient balance for transfer',
      });
    }

    // Credit destination account
    const updatedTo = await Account.findByIdAndUpdate(
      toAccount._id,
      { $inc: { balance: transferAmount } },
      { returnDocument: 'after', session }
    );

    // Save transfer in Transaction model
    const [transaction] = await Transaction.create(
      [
        {
          from: fromAccount._id,
          to: toAccount._id,
          amount: transferAmount,
          status: 'completed',
          approvedBy: req.user._id,
          createdAt: new Date(),
        },
      ],
      { session }
    );

    // Commit the MongoDB transaction
    await session.commitTransaction();

    return res.status(200).json({
      message: 'Transfer completed successfully',
      transaction,
      fromAccount: {
        id: updatedFrom._id,
        newBalance: updatedFrom.balance,
      },
      toAccount: {
        id: updatedTo._id,
        newBalance: updatedTo.balance,
      },
    });
  } catch (txError) {
    if (session) {
      await session.abortTransaction().catch(() => {});
    }

    // In standalone MongoDB environments without replica sets (or when transactions are not supported):
    const isStandaloneError =
      txError.message &&
      (txError.message.includes('Transaction numbers are only allowed') ||
        txError.message.includes('does not support retryable writes') ||
        txError.message.includes('replica set'));

    if (isStandaloneError) {
      // Execute atomic balance update
      const updatedFrom = await Account.findOneAndUpdate(
        { _id: fromAccount._id, balance: { $gte: transferAmount } },
        { $inc: { balance: -transferAmount } },
        { returnDocument: 'after' }
      );

      if (!updatedFrom) {
        return res.status(400).json({
          message: 'Insufficient balance for transfer',
        });
      }

      const updatedTo = await Account.findByIdAndUpdate(
        toAccount._id,
        { $inc: { balance: transferAmount } },
        { returnDocument: 'after' }
      );

      const transaction = await Transaction.create({
        from: fromAccount._id,
        to: toAccount._id,
        amount: transferAmount,
        status: 'completed',
        approvedBy: req.user._id,
        createdAt: new Date(),
      });

      return res.status(200).json({
        message: 'Transfer completed successfully',
        transaction,
        fromAccount: {
          id: updatedFrom._id,
          newBalance: updatedFrom.balance,
        },
        toAccount: {
          id: updatedTo._id,
          newBalance: updatedTo.balance,
        },
      });
    }

    return res.status(500).json({
      message: 'Transfer transaction failed',
      error: txError.message,
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

// @desc    Deposit / Add funds to own account (for testing/top-up)
// @route   POST /api/accounts/deposit
// @access  Private (Student or Parent)
export const depositFunds = async (req, res) => {
  try {
    const { amount } = req.body;
    const depositAmount = Number(amount);

    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({
        message: 'Deposit amount must be a positive number',
      });
    }

    let account = await Account.findOne({ userId: req.user._id });
    if (!account) {
      account = await Account.create({
        userId: req.user._id,
        balance: 0,
      });
    }

    account.balance += depositAmount;
    await account.save();

    res.status(200).json({
      message: `Deposited $${depositAmount.toFixed(2)} successfully`,
      balance: account.balance,
      account,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to deposit funds',
      error: error.message,
    });
  }
};

// @desc    Get transaction history for currently logged in user's account
// @route   GET /api/accounts/transactions
// @access  Private (Student or Parent)
export const getMyTransactions = async (req, res) => {
  try {
    const account = await Account.findOne({ userId: req.user._id });
    if (!account) {
      return res.status(200).json({ transactions: [] });
    }

    const transactions = await Transaction.find({
      $or: [{ from: account._id }, { to: account._id }],
    })
      .populate({
        path: 'from',
        populate: { path: 'userId', select: 'name email role' },
      })
      .populate({
        path: 'to',
        populate: { path: 'userId', select: 'name email role' },
      })
      .populate('approvedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      transactions,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve transactions',
      error: error.message,
    });
  }
};
