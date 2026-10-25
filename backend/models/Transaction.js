import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'From account ID is required'],
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'To account ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    status: {
      type: String,
      required: [true, 'Transaction status is required'],
      enum: ['pending', 'completed', 'failed', 'blocked', 'Blocked', 'Rejected'],
      default: 'completed',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
