const { query } = require('../config/db');

const notImpl = (name) => (req, res) => res.status(501).json({ success: false, message: `Not implemented: ${name}` });

exports.createLead      = notImpl('createLead');
exports.getLeads        = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const [countResult, dataResult] = await Promise.all([
      query(`SELECT COUNT(*) FROM leads l WHERE l.deleted_at IS NULL AND l.assigned_to = $1`, [userId]),
      query(`SELECT l.*,
        CASE WHEN l.stage NOT IN ('Won', 'Lost') AND l.next_followup_date IS NOT NULL
             AND DATE(l.next_followup_date) < CURRENT_DATE THEN true ELSE false END as is_overdue
       FROM leads l
       WHERE l.deleted_at IS NULL AND l.assigned_to = $1
       ORDER BY l.created_at DESC
       LIMIT $2 OFFSET $3`, [userId, limit, offset]),
    ]);

    return res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        totalCount: parseInt(countResult.rows[0].count, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.checkMobile     = notImpl('checkMobile');
exports.checkEmail      = notImpl('checkEmail');
exports.getLeadHistory  = notImpl('getLeadHistory');
exports.updateLeadStage = notImpl('updateLeadStage');
exports.closeLeadLost   = notImpl('closeLeadLost');
exports.closeLeadWon    = notImpl('closeLeadWon');
exports.exportLeads     = notImpl('exportLeads');
exports.getLead         = notImpl('getLead');
exports.getAdminLeads   = notImpl('getAdminLeads');
