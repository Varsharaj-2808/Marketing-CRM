const AuditLog = require('../models/AuditLog');

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { user_id, action, entity, from, to, page, limit } = req.query;

    const filters = {};
    if (user_id) filters.userId = user_id;
    if (action) filters.action = action;
    if (entity) filters.resource = entity;
    if (from) filters.from = new Date(from);
    if (to) filters.to = new Date(to);
    if (page) filters.page = parseInt(page);
    if (limit) filters.limit = parseInt(limit);

    const result = await AuditLog.findAll(filters);

    res.json({
      success: true,
      data: {
        logs: result.data,
        total: result.pagination.totalRecords,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAuditLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { query } = require('../config/db');
    const result = await query('SELECT * FROM audit_logs WHERE id = $1', [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
