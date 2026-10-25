import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for notification'],
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
    },
    type: {
      type: String,
      enum: ['transfer_request', 'transfer_approved', 'transfer_rejected', 'info'],
      default: 'info',
    },
    read: {
      type: Boolean,
      default: false,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
