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
      const placeholders = filters.fieldNames.map(f => { params.push(f); return `$${params.length}`; });
      sql += ` AND h.field_name IN (${placeholders.join(',')})`;
    } else if (filters.fieldName) {
      params.push(filters.fieldName);
      sql += ` AND h.field_name = $${params.length}`;
    }
    if (filters.isSystemGenerated !== undefined) {
      params.push(filters.isSystemGenerated);
      sql += ` AND h.is_system_generated = $${params.length}`;
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
    
    let countSql = `SELECT COUNT(*) FROM lead_history WHERE lead_id = $1`;
    const countParams = [leadId];
    if (filters.fieldNames && Array.isArray(filters.fieldNames) && filters.fieldNames.length > 0) {
      const placeholders = filters.fieldNames.map(f => { countParams.push(f); return `$${countParams.length}`; });
      countSql += ` AND field_name IN (${placeholders.join(',')})`;
    } else if (filters.fieldName) {
      countParams.push(filters.fieldName);
      countSql += ` AND field_name = $${countParams.length}`;
    }
    if (filters.isSystemGenerated !== undefined) {
      countParams.push(filters.isSystemGenerated);
      countSql += ` AND is_system_generated = $${countParams.length}`;
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
