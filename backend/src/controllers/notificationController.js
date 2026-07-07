const { query } = require('../config/db');

exports.getNotificationCount = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT COUNT(*)::text as count FROM notifications WHERE user_id = $1 AND read = false`,
      [req.user.id]
    );
    return res.json({
      success: true,
      unread_count: parseInt(result.rows[0].count, 10),
    });
  } catch (error) {
    next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const [dataResult, countResult] = await Promise.all([
      query(`SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]),
      query(`SELECT COUNT(*)::text as count FROM notifications WHERE user_id = $1 AND read = false`, [req.user.id]),
    ]);

    return res.json({
      success: true,
      data: dataResult.rows,
      unread_count: parseInt(countResult.rows[0].count, 10),
    });
  } catch (error) {
    next(error);
  }
};
