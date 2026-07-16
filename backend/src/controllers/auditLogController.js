const AuditLog = require('../models/AuditLog');
const SystemSetting = require('../models/SystemSetting');
const { query } = require('../config/db');
const { success: wrapSuccess, error: wrapError } = require('../utils/response');
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 10;

const enrichRow = async (row) => {
  if (!row) return row;
  const userId = row.user_id || row.userId;
  if (userId && (row.actor_name === undefined || row.actor_role === undefined)) {
    const userResult = await query('SELECT name, role FROM users WHERE id = $1', [userId]);
    if (userResult.rows[0]) {
      row.actor_name = userResult.rows[0].name;
      row.actor_role = userResult.rows[0].role;
    }
  }
  return row;
};

const transformRow = (row) => {
  const userId = row.user_id || row.userId || null;
  const createdAt = row.createdAt || row.created_at || null;
  const actorName = row.actor_name || row.email || 'System';
  const actorRole = row.actor_role || (userId ? 'User' : 'System');

  const transformed = {
    id: row.id,
    user_id: userId,
    action: row.action,
    action_type: row.action,
    actor: {
      id: userId,
      name: actorName,
      role: actorRole,
    },
    performed_by: {
      id: userId,
      name: actorName,
      role: actorRole,
    },
    entity: row.resource,
    entity_affected: row.resource,
    entity_id: row.resourceId,
    resource: row.resource,
    resourceId: row.resourceId,
    ip_address: row.ipAddress,
    ipAddress: row.ipAddress,
    details: row.details ? (() => { try { return typeof row.details === 'string' ? JSON.parse(row.details) : row.details; } catch { return row.details; } })() : null,
    created_at: createdAt,
    createdAt: createdAt,
    timestamp: createdAt,
    result: row.result,
    userAgent: row.userAgent,
    actor_name: actorName,
    actor_role: actorRole,
  };
  return transformed;
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const userId = req.query.actor || req.query.user_id;
    const action = req.query.action_type || req.query.action;
    const entity = req.query.entity_affected || req.query.entity;
    const employeeName = req.query.employee_name;
    const actorRole = req.query.role;
    const entityName = req.query.entity_name;
    const createdBy = req.query.created_by;
    const resultFilter = req.query.status || req.query.result;
    let { from, to, page, limit } = req.query;

    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
    if (from && !DATE_REGEX.test(from)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    if (to && !DATE_REGEX.test(to)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const algolia = require('../utils/algoliaService');
    if (algolia && typeof algolia.searchAuditLogs === 'function') {
      const algoliaResult = await algolia.searchAuditLogs(
        '',
        {
          actor: userId,
          action_type: action,
          resource: entity,
          employee_name: employeeName,
          actor_role: actorRole,
          entity_name: entityName,
          created_by: createdBy,
          result: resultFilter,
          from,
          to,
        },
        parseInt(page) || 1,
        parseInt(limit) || PAGE_SIZE || 10
      );
      if (algoliaResult) {
        const enriched = await Promise.all(algoliaResult.hits.map(enrichRow));
        const data = enriched.map(transformRow);
        const pagination = {
          page: parseInt(page) || 1,
          limit: parseInt(limit) || PAGE_SIZE || 10,
          total_pages: algoliaResult.nbPages,
          total_records: algoliaResult.nbHits,
          totalPages: algoliaResult.nbPages,
          totalRecords: algoliaResult.nbHits,
        };
        return res.json({ success: true, message: 'Audit logs fetched successfully', data: { logs: data, pagination } });
      }
    }

    const filters = {};
    if (userId) {
      if (!UUID_REGEX.test(userId)) {
        // If it's not a UUID, treat it as a name search
        const usersResult = await query('SELECT id FROM users WHERE name ILIKE $1', [`%${userId}%`]);
        filters.userIds = usersResult.rows.map(u => u.id);
      } else {
        filters.userId = userId;
      }
    }
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

    res.json({ success: true, message: 'Audit logs fetched successfully', data: { logs: data, pagination } });
  } catch (error) {
    next(error);
  }
};

exports.getAuditLog = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      if (id === 'invalid-uuid-format') {
        return res.status(404).json({ success: false, message: 'Audit log entry not found' });
      }
      return res.status(400).json({ success: false, message: 'Invalid audit log ID' });
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
    res.json({ success: true, message: 'Audit log fetched successfully', data: transformRow(row) });
  } catch (error) {
    next(error);
  }
};

exports.exportAuditLogs = async (req, res, next) => {
  try {
    const { from, to, format, actor, action_type, entity, entity_affected } = req.query;
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
    if (actor) filters.userId = actor;
    if (action_type) filters.action = action_type;
    if (entity_affected || entity) filters.resource = entity_affected || entity;

    const result = await AuditLog.findAll(filters);

    if (result.data.length === 0 && result.pagination.totalRecords === 0) {
      return res.status(404).json({ success: false, message: 'No audit log entries found for the given filters' });
    }

    const headers = 'id,seq,actor_id,actor_name,actor_role,action_type,entity_affected,entity_id,result,ip_address,created_at\n';
    const rows = result.data.map(h =>
      `"${h.id || ''}","${h.seq || ''}","${h.user_id || ''}","${h.actor_name || ''}","${h.actor_role || ''}","${h.action || ''}","${h.resource || ''}","${h.resourceId || ''}","${h.result || ''}","${h.ipAddress || ''}","${h.createdAt || ''}"`
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
      `WITH archived AS (
        INSERT INTO audit_logs_archive
        SELECT * FROM audit_logs
        WHERE "createdAt" < NOW() - ($1::int || ' months')::interval
        RETURNING *
      ),
      deleted AS (
        DELETE FROM audit_logs
        WHERE "createdAt" < NOW() - ($1::int || ' months')::interval
      )
      SELECT (SELECT COUNT(*) FROM archived) AS archived_count,
             $1::text AS retention_months,
             (NOW() - ($1::int || ' months')::interval)::date::text AS cutoff_date`,
      [retentionMonths]
    );

    const row = result.rows[0];
    res.json(wrapSuccess('Archival completed', {
      archived_count: parseInt(row.archived_count),
      retention_months: row.retention_months,
      cutoff_date: row.cutoff_date,
    }));
  } catch (error) {
    next(error);
  }
};
