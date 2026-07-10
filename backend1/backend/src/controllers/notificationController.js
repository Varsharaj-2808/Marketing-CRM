const Notification = require('../models/Notification');

exports.getNotifications = async (req, res, next) => {
  try {
    const data = await Notification.findByUser(req.user.id);
    const unreadCount = await Notification.getUnreadCount(req.user.id);
    res.json({ success: true, data, unread_count: unreadCount });
  } catch (error) {
    next(error);
  }
};

exports.getNotificationCount = async (req, res, next) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);
    res.json({
      success: true,
      unread_count: count,
    });
  } catch (error) {
    next(error);
  }
};
