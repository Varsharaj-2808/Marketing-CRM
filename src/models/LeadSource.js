const { query } = require('../config/db');

const LeadSource = {
  async findAllActive() {
    const result = await query('SELECT id, name, status FROM lead_sources WHERE status = $1 ORDER BY name', ['Active']);
    return result.rows;
  },

  async findAll(filters = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filters.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filters.status);
    }
    if (filters.search) {
      conditions.push(`name ILIKE $${idx++}`);
      values.push(`%${filters.search}%`);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = await query(`SELECT * FROM lead_sources ${where} ORDER BY name`, values);
    return result.rows;
  },

  async findById(id) {
    const result = await query('SELECT * FROM lead_sources WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async create(data, client) {
    const { name } = data;
    const db = client || { query };
    const result = await db.query(
      `INSERT INTO lead_sources (name, status) VALUES ($1, 'Active') RETURNING *`,
      [name]
    );
    return result.rows[0];
  },

  async update(id, data, client) {
    const sets = [];
    const values = [];
    let idx = 1;

    if (data.name !== undefined) {
      sets.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.status !== undefined) {
      sets.push(`status = $${idx++}`);
      values.push(data.status);
    }

    if (sets.length === 0) return null;

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const db = client || { query };
    const result = await db.query(
      `UPDATE lead_sources SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id, client) {
    const db = client || { query };
    const result = await db.query('DELETE FROM lead_sources WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  },
};

module.exports = LeadSource;
