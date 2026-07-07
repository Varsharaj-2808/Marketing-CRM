const { query } = require('../config/db');

const LeadHistory = {
  async create(data) {
    const { leadId, fieldName, oldValue, newValue, changeSummary, changedBy, reason, metadata } = data;
    const result = await query(
      `INSERT INTO lead_history ("lead_id", "field_name", "old_value", "new_value", "change_summary", "changed_by", "reason", "metadata")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        leadId,
        fieldName || null,
        oldValue || null,
        newValue || null,
        changeSummary || null,
        changedBy || null,
        reason || null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );
    return result.rows[0];
  },

  async findByLeadId(leadId) {
    const result = await query(
      `SELECT h.*, u.name as changed_by_name, u.employee_id as actor_employee_id
       FROM lead_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.lead_id = $1
       ORDER BY h.created_at ASC`,
      [leadId]
    );
    return result.rows;
  },

  async findHistoryPaginated(leadId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const countResult = await query(
      `SELECT COUNT(*) FROM lead_history
       WHERE lead_id = $1 AND field_name IN ('stage', 'Stage Changed', 'Lead Reopened')`,
      [leadId]
    );
    const totalEntries = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT h.*, u.employee_id as actor_employee_id, u.name as actor_name
       FROM lead_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.lead_id = $1 AND h.field_name IN ('stage', 'Stage Changed', 'Lead Reopened')
       ORDER BY h.created_at DESC
       LIMIT $2 OFFSET $3`,
      [leadId, limit, offset]
    );

    return {
      data: result.rows,
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
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
       ORDER BY h.created_at DESC`,
      [leadId]
    );
    return result.rows;
  },
};

module.exports = LeadHistory;
