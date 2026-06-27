const { query } = require('../config/db');

const AuditLog = {
  async create(data) {
    const { userId, action, resource, resourceId, details, ipAddress, userAgent, result } = data;
    const res = await query(
      `INSERT INTO audit_logs ("user_id", action, resource, "resourceId", details, "ipAddress", "userAgent", result)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId || null, action || '', resource || '', resourceId || '', details || '', ipAddress || '', userAgent || '', result || 'Success']
    );
    return res.rows[0];
  },
};

module.exports = AuditLog;
