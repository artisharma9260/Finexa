import Notification from '../models/Notification.js';

// @desc    Get all notifications for logged-in user
// @route   GET /api/notifications
// @access  Private (Student or Parent)
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: false,
    });

    res.status(200).json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve notifications',
      error: error.message,
    });
  }
};

// @desc    Mark a single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { read: true },
      { returnDocument: 'after' }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({
      message: 'Notification marked as read',
      notification,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  }
};

// @desc    Mark all notifications as read for current user
// @route   POST /api/notifications/mark-all-read
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );

    res.status(200).json({
      message: 'All notifications marked as read',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to mark notifications as read',
      error: error.message,
    });
  }
};
