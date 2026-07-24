const Notification = require('../models/Notification');
const { success: wrapSuccess, error: wrapError } = require('../utils/response');

exports.getNotifications = async (req, res, next) => {
  try {
    const algolia = require('../utils/algoliaService');
    if (algolia && typeof algolia.searchNotifications === 'function') {
      const [unreadResult, recentResult] = await Promise.all([
        algolia.searchNotifications('', { user_id: req.user.id, is_read: false }, 1, 50),
        algolia.searchNotifications('', { user_id: req.user.id }, 1, 20)
      ]);
      
      let hits = [];
      if (unreadResult && unreadResult.nbHits > 0) {
        hits = [...unreadResult.hits];
      }
      if (recentResult && recentResult.nbHits > 0) {
        const existingIds = new Set(hits.map(h => h.objectID || h.id));
        for (const hit of recentResult.hits) {
          if (!existingIds.has(hit.objectID || hit.id)) {
            hits.push(hit);
          }
        }
      }
      
      if (hits.length > 0) {
        hits.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
        const unreadCount = await Notification.getUnreadCount(req.user.id);
        return res.json({ success: true, message: 'Notifications fetched successfully', data: hits, unread_count: unreadCount });
      }
    }

    const data = await Notification.findByUser(req.user.id);
    const unreadCount = await Notification.getUnreadCount(req.user.id);
    res.json({ success: true, message: 'Notifications fetched successfully', data: data, unread_count: unreadCount });
  } catch (error) {
    next(error);
  }
};

exports.getNotificationCount = async (req, res, next) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);
    res.json({ success: true, message: 'Unread count fetched', unread_count: count, data: { unread_count: count } });
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
