const { query } = require('../config/db');

exports.getDashboard = async (req, res, next) => {
  try {
    const [leadStatsResult, recentLeadsResult, unreadCountResult] = await Promise.all([
      query(`SELECT
        COUNT(*)::text as total_leads,
        COUNT(*) FILTER (WHERE stage NOT IN ('Won', 'Lost'))::text as active_leads,
        COUNT(*) FILTER (WHERE stage = 'Won')::text as won_leads,
        COUNT(*) FILTER (WHERE stage = 'Lost')::text as lost_leads,
        COALESCE(SUM(proposal_value), 0)::text as total_estimated_value
      FROM leads WHERE assigned_to = $1 AND deleted_at IS NULL`, [req.user.id]),
      query(`SELECT id, company_name, stage FROM leads WHERE assigned_to = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 5`, [req.user.id]),
      query(`SELECT COUNT(*)::text as count FROM notifications WHERE user_id = $1 AND read = false`, [req.user.id]),
    ]);

    const stageBreakdownResult = await query(
      `SELECT stage, COUNT(*)::int as count FROM leads WHERE assigned_to = $1 AND deleted_at IS NULL GROUP BY stage ORDER BY count DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      data: {
        stats: leadStatsResult.rows[0],
        recent_leads: recentLeadsResult.rows,
        unread_notifications: parseInt(unreadCountResult.rows[0].count, 10),
        stage_breakdown: stageBreakdownResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};
