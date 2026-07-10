const { query } = require('../config/db');

const BusinessSubCategory = {
  async findByCategoryId(categoryId) {
    const result = await query(
      'SELECT id, sub_category_name, status FROM business_sub_categories WHERE category_id = $1 AND status = $2 ORDER BY sub_category_name',
      [categoryId, 'Active']
    );
    return result.rows;
  },

  async findAllActiveByCategory(categoryId) {
    const result = await query(
      'SELECT id, sub_category_name FROM business_sub_categories WHERE category_id = $1 AND status = $2 ORDER BY sub_category_name',
      [categoryId, 'Active']
    );
    return result.rows;
  },

  async findAll(filters = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filters.status) {
      conditions.push(`s.status = $${idx++}`);
      values.push(filters.status);
    }
    if (filters.category_id) {
      conditions.push(`s.category_id = $${idx++}`);
      values.push(filters.category_id);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = await query(
      `SELECT s.*, c.category_name FROM business_sub_categories s LEFT JOIN business_categories c ON s.category_id = c.id ${where} ORDER BY s.sub_category_name`,
      values
    );
    return result.rows;
  },

  async findById(id) {
    const result = await query(
      `SELECT s.*, c.category_name FROM business_sub_categories s LEFT JOIN business_categories c ON s.category_id = c.id WHERE s.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async create(data, client) {
    const { category_id, sub_category_name } = data;
    const db = client || { query };
    const result = await db.query(
      `INSERT INTO business_sub_categories (category_id, sub_category_name, status) VALUES ($1, $2, 'Active') RETURNING *`,
      [category_id, sub_category_name]
    );
    return result.rows[0];
  },

  async update(id, data, client) {
    const sets = [];
    const values = [];
    let idx = 1;

    if (data.sub_category_name !== undefined) {
      sets.push(`sub_category_name = $${idx++}`);
      values.push(data.sub_category_name);
    }
    if (data.status !== undefined) {
      sets.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (data.category_id !== undefined) {
      sets.push(`category_id = $${idx++}`);
      values.push(data.category_id);
    }

    if (sets.length === 0) return null;

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const db = client || { query };
    const result = await db.query(
      `UPDATE business_sub_categories SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id, client) {
    const db = client || { query };
    const result = await db.query('DELETE FROM business_sub_categories WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  },

  async isInUse(id) {
    const result = await query('SELECT COUNT(*)::int AS count FROM leads WHERE sub_category = $1', [id]);
    return result.rows[0].count > 0;
  },
};

module.exports = BusinessSubCategory;
