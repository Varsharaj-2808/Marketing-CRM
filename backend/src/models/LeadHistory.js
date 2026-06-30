const { query } = require('../config/db');

const LeadHistory = {
  async create(data) {
    const { leadId, fieldName, oldValue, newValue, changeSummary, changedBy } = data;
    const result = await query(
      `INSERT INTO lead_history ("lead_id", "field_name", "old_value", "new_value", "change_summary", "changed_by")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [leadId, fieldName || null, oldValue || null, newValue || null, changeSummary || null, changedBy || null]
    );
    return result.rows[0];
  },

  async findByLeadId(leadId) {
    const result = await query(
      `SELECT h.*, u.name as changed_by_name
       FROM lead_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.lead_id = $1
       ORDER BY h.created_at ASC`,
      [leadId]
    );
    return result.rows;
  },
};

module.exports = LeadHistory;
