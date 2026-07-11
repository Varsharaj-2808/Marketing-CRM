const Notification = require('../models/Notification');
const { success: wrapSuccess, error: wrapError } = require('../utils/response');

exports.getNotifications = async (req, res, next) => {
  try {
    const data = await Notification.findByUser(req.user.id);
    const unreadCount = await Notification.getUnreadCount(req.user.id);
    res.json({ success: true, message: 'Notifications fetched successfully', data: { notifications: data, unread_count: unreadCount } });
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
