const { query } = require('../config/db');
const Notification = require('../models/Notification');
const { success: wrapSuccess, error: wrapError } = require('../utils/response');

const buildFilterClause = (params) => {
  const { userId, isAdmin, categoryId, subCategoryId, from, to } = params;
  const conditions = ['deleted_at IS NULL'];
  const values = [];
  let idx = 1;

  if (!isAdmin && userId) {
    conditions.push(`assigned_to = $${idx++}`);
    values.push(userId);
  }

  if (categoryId) {
    conditions.push(`category = $${idx++}`);
    values.push(categoryId);
  }
  if (subCategoryId) {
    conditions.push(`sub_category = $${idx++}`);
    values.push(subCategoryId);
  }
  if (from) {
    conditions.push(`created_at >= $${idx++}`);
    values.push(from);
  }
  if (to) {
    conditions.push(`created_at <= $${idx++}`);
    values.push(to + 'T23:59:59.999Z');
  }

  return { clause: conditions.join(' AND '), values };
};

exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'Admin';
    const { category_id, sub_category_id, from, to } = req.query;

    const { clause, values } = buildFilterClause({ userId, isAdmin, categoryId: category_id, subCategoryId: sub_category_id, from, to });

    const [leadStats, recentLeads, notificationCount] = await Promise.all([
      query(`
        SELECT
          COUNT(*) AS total_leads,
          COUNT(*) FILTER (WHERE stage NOT IN ('Won', 'Lost')) AS active_leads,
          COUNT(*) FILTER (WHERE stage = 'Won') AS won_leads,
          COUNT(*) FILTER (WHERE stage = 'Lost') AS lost_leads,
          COALESCE(SUM(estimated_value), 0) AS total_estimated_value
        FROM leads
        WHERE ${clause}
      `, values),
      query(`
        SELECT l.id, l.lead_id, l.company_name, l.contact_person, l.stage, l.priority, l.estimated_value, l.created_at
        FROM leads l
        WHERE ${clause}
        ORDER BY l.created_at DESC
        LIMIT 5
      `, values),
      Notification.getUnreadCount(userId),
    ]);

    const stageBreakdown = await query(`
      SELECT stage, COUNT(*)::int AS count
      FROM leads
      WHERE ${clause}
      GROUP BY stage
      ORDER BY count DESC
    `, values);

    res.json({
      success: true,
      message: 'Dashboard fetched successfully',
      data: {
        stats: leadStats.rows[0],
        stage_breakdown: stageBreakdown.rows,
        recent_leads: recentLeads.rows,
        unread_notifications: notificationCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
