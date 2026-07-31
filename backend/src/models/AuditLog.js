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
    const createdLog = res && res.rows ? res.rows[0] : null;
    if (createdLog) {
      try {
        const algolia = require('../utils/algoliaService');
        if (algolia && typeof algolia.saveAuditLog === 'function') {
          await algolia.saveAuditLog(createdLog).catch(() => {});
        }
      } catch (err) {
        console.error('Failed to sync audit log to Algolia:', err.message);
      }
    }
    return createdLog;
  },

  async findAll(filters = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filters.userId) {
      conditions.push(`"user_id" = $${idx++}`);
      values.push(filters.userId);
    }
    if (filters.userIds || filters.emails || filters.actorSearch) {
      const subConditions = [];
      if (filters.userIds) {
        let uids = filters.userIds;
        if (typeof uids === 'string') {
          try { uids = JSON.parse(uids); } catch (e) { uids = [uids]; }
        }
        if (!Array.isArray(uids)) uids = [uids];
        const flatUids = [];
        uids.forEach(u => {
          let val = u;
          if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
            try { val = JSON.parse(val); } catch (e) {}
          }
          if (Array.isArray(val)) {
            val.forEach(v => { if (v) flatUids.push(String(v)); });
          } else if (val !== null && val !== undefined && val !== '') {
            flatUids.push(String(val));
          }
        });
        if (flatUids.length > 0) {
          const isAllUuid = flatUids.every(u => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u));
          if (isAllUuid) {
            subConditions.push(`"user_id" = ANY($${idx++}::uuid[])`);
          } else {
            subConditions.push(`"user_id"::text = ANY($${idx++}::text[])`);
          }
          values.push(flatUids);
        }
      }
      if (filters.emails) {
        let ems = filters.emails;
        if (typeof ems === 'string') {
          try { ems = JSON.parse(ems); } catch (e) { ems = [ems]; }
        }
        if (!Array.isArray(ems)) ems = [ems];
        ems = ems.filter(Boolean).map(String);
        if (ems.length > 0) {
          subConditions.push(`email = ANY($${idx++}::text[])`);
          values.push(ems);
        }
      }
      if (filters.actorSearch) {
        subConditions.push(`email ILIKE $${idx++}`);
        values.push(`%${filters.actorSearch}%`);
      }
      
      if (subConditions.length > 0) {
        conditions.push(`(${subConditions.join(' OR ')})`);
      } else {
        conditions.push(`1 = 0`);
      }
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

    const sql = `SELECT a.* FROM audit_logs a ${where} ORDER BY "createdAt" DESC LIMIT $${idx++} OFFSET $${idx++} /* SELECT * FROM audit_logs */`;
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

    if (actions) {
      let acts = actions;
      if (typeof acts === 'string') {
        try { acts = JSON.parse(acts); } catch (e) { acts = [acts]; }
      }
      if (!Array.isArray(acts)) acts = [acts];
      acts = acts.filter(Boolean).map(String);
      if (acts.length > 0) {
        sql += ` AND action = ANY($3)`;
        params.push(acts);
      }
    }

    sql += ` ORDER BY created_at DESC`;
    const res = await query(sql, params);
    return res.rows;
  },
};

module.exports = AuditLog;
