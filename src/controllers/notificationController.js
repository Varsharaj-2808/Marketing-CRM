const Notification = require('../models/Notification');
const { success: wrapSuccess, error: wrapError } = require('../utils/response');

exports.getNotifications = async (req, res, next) => {
  try {
    const data = await Notification.findByUser(req.user.id);
    const unreadCount = await Notification.getUnreadCount(req.user.id);
    res.json({
      success: true,
      message: 'Notifications fetched successfully',
      data: data,
      unread_count: unreadCount,
      // For backward compatibility:
      notifications: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.getNotificationCount = async (req, res, next) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);
    res.json(wrapSuccess('Unread count fetched', { unread_count: count }));
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Notification.markAsRead(id);
    res.json(wrapSuccess('Notification marked as read'));
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.markAllAsRead(req.user.id);
    res.json(wrapSuccess('All notifications marked as read'));
  } catch (error) {
    next(error);
  }
};
