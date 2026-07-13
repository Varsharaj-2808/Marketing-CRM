const { query } = require('../config/db');

const SavedView = {
  async create(data) {
    const { name, filters, createdBy } = data;
    const result = await query(
      `INSERT INTO saved_views (name, filters, created_by)
       VALUES ($1, $2::jsonb, $3)
       RETURNING id, name, filters, created_by, created_at, updated_at`,
      [name, JSON.stringify(filters || {}), createdBy]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query(
      `SELECT id, name, filters, created_by, created_at, updated_at
       FROM saved_views WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findByUser(userId) {
    const result = await query(
      `SELECT id, name, filters, created_by, created_at, updated_at
       FROM saved_views WHERE created_by = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findByNameAndUser(name, userId, excludeId) {
    let sql = `SELECT id FROM saved_views WHERE name = $1 AND created_by = $2`;
    const params = [name, userId];
    if (excludeId) {
      sql += ` AND id != $3`;
      params.push(excludeId);
    }
    const result = await query(sql, params);
    return result.rows[0] || null;
  },

  async update(id, fields) {
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        if (key === 'filters') {
          setClauses.push(`filters = $${idx++}::jsonb`);
          values.push(JSON.stringify(value));
        } else {
          setClauses.push(`"${key}" = $${idx++}`);
          values.push(value);
        }
      }
    }

    if (setClauses.length === 0) return null;

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE saved_views SET ${setClauses.join(', ')}
       WHERE id = $${idx}
       RETURNING id, name, filters, created_by, created_at, updated_at`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await query(
      `DELETE FROM saved_views WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = SavedView;
