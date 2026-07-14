const { query } = require('../config/db');
const { sendAdminLeadCreatedEmail } = require('../utils/emailService');

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

  async notifyAdmins(data) {
    const { notificationType, leadId, message, leadData, creatorName } = data;
    const admins = await query("SELECT id, name, email FROM users WHERE role IN ('Admin', 'admin') AND \"accountStatus\" = 'active'");
    
    const promises = admins.rows.map(admin => {
      const p1 = this.create({
        userId: admin.id,
        notificationType,
        leadId,
        message,
      }).catch(err => console.error(`[Notification] Failed to notify admin ${admin.id}:`, err.message));

      // Send email if leadData is provided and it's a lead_created event
      if (notificationType === 'lead_created' && leadData && admin.email) {
        sendAdminLeadCreatedEmail(admin.email, admin.name || 'Admin', creatorName || 'Marketing Executive', leadData)
          .catch(err => console.error(`[Notification] Failed to send email to admin ${admin.id}:`, err.message));
      }

      return p1;
    });
    
    await Promise.allSettled(promises);
  },
};

module.exports = Notification;
