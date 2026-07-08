const AuditLog = require('../models/AuditLog');
const SystemSetting = require('../models/SystemSetting');
const { query } = require('../config/db');
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const enrichRow = async (row) => {
  if (row && row.user_id && (row.actor_name === undefined || row.actor_role === undefined)) {
    const userResult = await query('SELECT name, role FROM users WHERE id = $1', [row.user_id]);
    if (userResult.rows[0]) {
      row.actor_name = userResult.rows[0].name;
      row.actor_role = userResult.rows[0].role;
    }
  }
  return row;
};

const transformRow = (row) => {
  const transformed = {
    id: row.id,
    user_id: row.user_id,
    action: row.action,
    action_type: row.action,
    actor: {
      id: row.user_id,
      name: row.actor_name,
      role: row.actor_role,
    },
    entity_affected: row.resource,
    entity_id: row.resourceId,
    resource: row.resource,
    resourceId: row.resourceId,
    ip_address: row.ipAddress,
    ipAddress: row.ipAddress,
    details: row.details ? (() => { try { return typeof row.details === 'string' ? JSON.parse(row.details) : row.details; } catch { return row.details; } })() : null,
    created_at: row.createdAt,
    createdAt: row.createdAt,
    result: row.result,
    userAgent: row.userAgent,
    actor_name: row.actor_name,
    actor_role: row.actor_role,
  };
  return transformed;
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const userId = req.query.actor || req.query.user_id;
    const action = req.query.action_type || req.query.action;
    const entity = req.query.entity_affected || req.query.entity;
    let { from, to, page, limit } = req.query;

    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
    if (from && !DATE_REGEX.test(from)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    if (to && !DATE_REGEX.test(to)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const filters = {};
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (entity) filters.resource = entity;
    if (from) filters.from = new Date(from);
    if (to) filters.to = new Date(to);
    if (page) filters.page = parseInt(page);
    if (limit) filters.limit = parseInt(limit);

    const result = await AuditLog.findAll(filters);

    const enriched = await Promise.all(result.data.map(enrichRow));
    const data = enriched.map(transformRow);
    const pagination = {
      page: result.pagination.page,
      limit: result.pagination.limit,
      total_pages: result.pagination.totalPages,
      total_records: result.pagination.totalRecords,
      totalPages: result.pagination.totalPages,
      totalRecords: result.pagination.totalRecords,
    };

    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
};

exports.getAuditLog = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(404).json({ success: false, message: 'Audit log entry not found' });
    }

    let result = await query(
      `SELECT a.* FROM audit_logs a WHERE a.id = $1`,
      [id]
    );

    if (!result.rows[0]) {
      result = await query('SELECT * FROM audit_logs WHERE id = $1', [id]);
    }

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Audit log entry not found' });
    }

    const row = await enrichRow(result.rows[0]);
    res.json({ success: true, data: transformRow(row) });
  } catch (error) {
    next(error);
  }
};

exports.exportAuditLogs = async (req, res, next) => {
  try {
    const { from, to, format } = req.query;
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

    if (format && format !== 'csv') {
      return res.status(400).json({ success: false, message: 'Format must be csv' });
    }

    if (!from || !to || !DATE_REGEX.test(from) || !DATE_REGEX.test(to)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const filters = {
      from: new Date(from),
      to: new Date(to),
      limit: 100000
    };

    const result = await AuditLog.findAll(filters);

    if (result.data.length === 0 && result.pagination.totalRecords === 0) {
      return res.status(404).json({ success: false, message: 'No audit log entries found matching the filter criteria' });
    }

    const headers = 'action_type,actor_name,actor_role,entity_affected,entity_id\n';
    const rows = result.data.map(h =>
      `"${h.action || ''}","${h.actor_name || ''}","${h.actor_role || ''}","${h.resource || ''}","${h.resourceId || ''}"`
    ).join('\n');

    const csv = headers + rows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-${from}-to-${to}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

exports.archiveAuditLogs = async (req, res, next) => {
  try {
    const setting = await SystemSetting.get('audit_log_retention_months');
    const retentionMonths = parseInt(setting) || 12;

    const result = await query(
      `WITH moved AS (
        DELETE FROM audit_logs
        WHERE "createdAt" < NOW() - ($1::int || ' months')::interval
        RETURNING *
      )
      SELECT (SELECT COUNT(*) FROM moved) AS archived_count,
             $1::text AS retention_months,
             (NOW() - ($1::int || ' months')::interval)::date::text AS cutoff_date`,
      [retentionMonths]
    );

    const row = result.rows[0];
    res.json({
      success: true,
      message: 'Archival completed successfully',
      archived_count: parseInt(row.archived_count),
      retention_months: row.retention_months,
      cutoff_date: row.cutoff_date,
    });
  } catch (error) {
    next(error);
  }
};
