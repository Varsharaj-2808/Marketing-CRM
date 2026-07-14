const { query } = require('../config/db');

const Notification = {
  async create(data) {
    const { userId, notificationType, leadId, message } = data;
    const result = await query(
      `INSERT INTO notifications ("user_id", "notification_type", "lead_id", message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, notificationType || 'lead_assigned', leadId || null, message]
    );
    return result.rows[0];
  },

  async findByUser(userId) {
    const result = await query(
      `SELECT n.*, l.lead_id as lead_business_id, l.company_name
       FROM notifications n
       LEFT JOIN leads l ON n.lead_id = l.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async getUnreadCount(userId) {
    const result = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(result.rows[0].count);
  },

  async markAsRead(notificationId) {
    const result = await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
      [notificationId]
    );
    return result.rows[0] || null;
  },

  async markAllAsRead(userId) {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );
  },
};

module.exports = Notification;
