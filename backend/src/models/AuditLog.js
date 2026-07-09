const { query } = require('../config/db');

const AuditLog = {
  async create(data, client) {
    const { userId, email, action, resource, resourceId, details, ipAddress, userAgent, result } = data;
    const db = client || { query };
    const res = await db.query(
      `INSERT INTO audit_logs ("user_id", email, action, resource, "resourceId", details, "ipAddress", "userAgent", result)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId || null, email || '', action || '', resource || '', resourceId || '', details || '', ipAddress || '', userAgent || '', result || 'Success']
    );
    return res.rows[0];
  },

  async findAll(filters = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filters.userId) {
      conditions.push(`"user_id" = $${idx++}`);
      values.push(filters.userId);
    }
    if (filters.action) {
      conditions.push(`action = $${idx++}`);
      values.push(filters.action);
    }
    if (filters.resource) {
      conditions.push(`resource = $${idx++}`);
      values.push(filters.resource);
    }
    if (filters.from) {
      conditions.push(`"createdAt" >= $${idx++}`);
      values.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`"createdAt" <= $${idx++}`);
      values.push(filters.to);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const limit = filters.limit || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const countResult = await query(`SELECT COUNT(*) FROM audit_logs ${where}`, values);
    const totalRecords = parseInt(countResult.rows[0].count);

    const sql = `SELECT a.* FROM audit_logs a ${where} ORDER BY "createdAt" DESC LIMIT $${idx++} OFFSET $${idx++}`;
    values.push(limit, offset);
    const result = await query(sql, values);

    return {
      data: result.rows,
      pagination: {
        page: filters.page || 1,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    };
  },

  async findByResource(resource, resourceId, actions) {
    let sql = `SELECT * FROM audit_logs WHERE resource = $1 AND "resourceId" = $2`;
    const params = [resource, resourceId];

    if (actions && actions.length > 0) {
      sql += ` AND action = ANY($3)`;
      params.push(actions);
    }

    sql += ` ORDER BY created_at DESC`;
    const res = await query(sql, params);
    return res.rows;
  },
};

module.exports = AuditLog;
