const { query } = require('../config/db');

const LeadHistory = {
  async create(data, client = null) {
    const { leadId, fieldName, oldValue, newValue, changeSummary, changedBy, reason, metadata, isSystemGenerated } = data;
    const executeQuery = client ? client.query.bind(client) : query;
    
    const result = await executeQuery(
      `INSERT INTO lead_history ("lead_id", "field_name", "old_value", "new_value", "change_summary", "changed_by", "reason", "metadata", "is_system_generated")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        leadId,
        fieldName || null,
        oldValue ?? null,
        newValue ?? null,
        changeSummary || null,
        changedBy || null,
        reason || null,
        metadata ? JSON.stringify(metadata) : null,
        isSystemGenerated || false
      ]
    );
    return result && result.rows ? result.rows[0] : null;
  },

  async findByLeadId(leadId, filters = {}) {
    let sql = `SELECT h.*, u.name as changed_by_name, u.employee_id as actor_employee_id
       FROM lead_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.lead_id = $1`;
    const params = [leadId];
    
    if (filters.fieldNames && Array.isArray(filters.fieldNames) && filters.fieldNames.length > 0) {
      const orClauses = [];
      filters.fieldNames.forEach(f => {
        params.push(f);
        const p1 = `$${params.length}`;
        params.push(f.toLowerCase().replace(/[\s_-]+/g, ''));
        const p2 = `$${params.length}`;
        orClauses.push(`(LOWER(h.field_name) = ${p1} OR REPLACE(LOWER(h.field_name), ' ', '_') = ${p1} OR REPLACE(REPLACE(LOWER(h.field_name), ' ', ''), '_', '') = ${p2})`);
      });
      sql += ` AND (${orClauses.join(' OR ')})`;
    } else if (filters.fieldName) {
      params.push(filters.fieldName);
      const p1 = `$${params.length}`;
      params.push(filters.fieldName.toLowerCase().replace(/[\s_-]+/g, ''));
      const p2 = `$${params.length}`;
      sql += ` AND (LOWER(h.field_name) = ${p1} OR REPLACE(LOWER(h.field_name), ' ', '_') = ${p1} OR REPLACE(REPLACE(LOWER(h.field_name), ' ', ''), '_', '') = ${p2})`;
    }
    if (filters.isSystemGenerated !== undefined) {
      params.push(filters.isSystemGenerated);
      sql += ` AND h.is_system_generated = $${params.length}`;
    }
    if (filters.from) {
      params.push(filters.from);
      sql += ` AND h.changed_at >= $${params.length}`;
    }
    if (filters.to) {
      params.push(filters.to);
      sql += ` AND h.changed_at <= $${params.length}`;
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      sql += ` AND (
        h.field_name ILIKE $${params.length} OR
        h.old_value ILIKE $${params.length} OR
        h.new_value ILIKE $${params.length} OR
        h.change_summary ILIKE $${params.length} OR
        h.reason ILIKE $${params.length} OR
        u.name ILIKE $${params.length}
      )`;
    }
    
    sql += ` ORDER BY h.changed_at DESC`;
    
    if (filters.limit) {
      params.push(filters.limit);
      sql += ` LIMIT $${params.length}`;
      if (filters.page) {
        const offset = (filters.page - 1) * filters.limit;
        params.push(offset);
        sql += ` OFFSET $${params.length}`;
      }
    }

    const result = await query(sql, params);
    
    let countSql = `SELECT COUNT(*) FROM lead_history h LEFT JOIN users u ON h.changed_by = u.id WHERE h.lead_id = $1 /* SELECT COUNT(*) FROM lead_history WHERE lead_id = $1 */`;
    const countParams = [leadId];
    if (filters.fieldNames && Array.isArray(filters.fieldNames) && filters.fieldNames.length > 0) {
      const orClauses = [];
      filters.fieldNames.forEach(f => {
        countParams.push(f);
        const p1 = `$${countParams.length}`;
        countParams.push(f.toLowerCase().replace(/[\s_-]+/g, ''));
        const p2 = `$${countParams.length}`;
        orClauses.push(`(LOWER(h.field_name) = ${p1} OR REPLACE(LOWER(h.field_name), ' ', '_') = ${p1} OR REPLACE(REPLACE(LOWER(h.field_name), ' ', ''), '_', '') = ${p2})`);
      });
      countSql += ` AND (${orClauses.join(' OR ')})`;
    } else if (filters.fieldName) {
      countParams.push(filters.fieldName);
      const p1 = `$${countParams.length}`;
      countParams.push(filters.fieldName.toLowerCase().replace(/[\s_-]+/g, ''));
      const p2 = `$${countParams.length}`;
      countSql += ` AND (LOWER(h.field_name) = ${p1} OR REPLACE(LOWER(h.field_name), ' ', '_') = ${p1} OR REPLACE(REPLACE(LOWER(h.field_name), ' ', ''), '_', '') = ${p2})`;
    }
    if (filters.isSystemGenerated !== undefined) {
      countParams.push(filters.isSystemGenerated);
      countSql += ` AND h.is_system_generated = $${countParams.length}`;
    }
    if (filters.from) {
      countParams.push(filters.from);
      countSql += ` AND h.changed_at >= $${countParams.length}`;
    }
    if (filters.to) {
      countParams.push(filters.to);
      countSql += ` AND h.changed_at <= $${countParams.length}`;
    }
    if (filters.search) {
      countParams.push(`%${filters.search}%`);
      countSql += ` AND (
        h.field_name ILIKE $${countParams.length} OR
        h.old_value ILIKE $${countParams.length} OR
        h.new_value ILIKE $${countParams.length} OR
        h.change_summary ILIKE $${countParams.length} OR
        h.reason ILIKE $${countParams.length} OR
        u.name ILIKE $${countParams.length}
      )`;
    }
    const countResult = await query(countSql, countParams);
    
    return {
      history: result.rows,
      total_changes: countResult.rows[0] ? parseInt(countResult.rows[0].count) : 0
    };
  },

  async findHistoryPaginated(leadId, page = 1, limit = 20) {
    const res = await this.findByLeadId(leadId, { page, limit });
    return {
      data: res.history,
      totalEntries: res.total_changes,
      totalPages: Math.ceil(res.total_changes / limit),
      page,
      limit,
    };
  },

  async findAssignments(leadId) {
    const result = await query(
      `SELECT h.*, u.name as changed_by_name,
              u2."employee_id" as actor_employee_id
       FROM lead_history h
       LEFT JOIN users u ON h.changed_by = u.id
       LEFT JOIN users u2 ON h.changed_by = u2.id
       WHERE h.lead_id = $1 AND h.field_name = 'assigned_to'
       ORDER BY h.changed_at DESC`,
      [leadId]
    );
    return result.rows;
  },
};

module.exports = LeadHistory;
