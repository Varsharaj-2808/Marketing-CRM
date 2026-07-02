const Notification = require('../models/Notification');

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
