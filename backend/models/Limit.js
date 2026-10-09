import mongoose from 'mongoose';

const limitSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
      unique: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Parent ID is required'],
    },
    dailyLimit: {
      type: Number,
      required: [true, 'Daily limit is required'],
      min: [0, 'Daily limit must be 0 or greater'],
      default: 100,
    },
    monthlyLimit: {
      type: Number,
      required: [true, 'Monthly limit is required'],
      min: [0, 'Monthly limit must be 0 or greater'],
      default: 500,
    },
    approvalAbove: {
      type: Number,
      required: [true, 'Approval threshold is required'],
      min: [0, 'Approval threshold must be 0 or greater'],
      default: 50,
    },
  },
  {
    timestamps: true,
  }
);

const Limit = mongoose.model('Limit', limitSchema);

export default Limit;
