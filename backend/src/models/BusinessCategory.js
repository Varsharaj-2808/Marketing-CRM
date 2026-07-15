const { query } = require('../config/db');

const BusinessCategory = {
  async findAllActive() {
    const result = await query('SELECT id, category_name, status FROM business_categories WHERE status = $1 ORDER BY category_name', ['Active']);
    return result.rows;
  },

  async findAllForDropdown() {
    const result = await query('SELECT id, category_name FROM business_categories WHERE status = $1 ORDER BY category_name', ['Active']);
    return result.rows;
  },

  async findAllPaginated(filters = {}) {
    const { search, status, page = 1, limit = 20 } = filters;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (status) {
      conditions.push(`c.status = $${idx++}`);
      values.push(status);
    }
    if (search) {
      conditions.push(`c.category_name ILIKE $${idx++}`);
      values.push(`%${search}%`);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (page - 1) * limit;

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM business_categories c ${where}`,
      values
    );
    const total = countResult.rows[0].total;

    const dataResult = await query(
      `SELECT c.id, c.category_name, c.status,
        (SELECT COUNT(*)::int FROM business_sub_categories sc WHERE sc.category_id = c.id) AS "subCategoryCount"
       FROM business_categories c ${where}
       ORDER BY c.category_name
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    return { data: dataResult.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findById(id) {
    const result = await query('SELECT * FROM business_categories WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findAll(filters = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filters.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filters.status);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = await query(`SELECT * FROM business_categories ${where} ORDER BY category_name`, values);
    return result.rows;
  },

  async create(data, client) {
    const { category_name } = data;
    const db = client || { query };
    const result = await db.query(
      `INSERT INTO business_categories (category_name, status) VALUES ($1, 'Active') RETURNING *`,
      [category_name]
    );
    return result.rows[0];
  },

  async update(id, data, client) {
    const sets = [];
    const values = [];
    let idx = 1;

    if (data.category_name !== undefined) {
      sets.push(`category_name = $${idx++}`);
      values.push(data.category_name);
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
      `UPDATE business_categories SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id, client) {
    const db = client || { query };
    const result = await db.query('DELETE FROM business_categories WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  },

  async isInUse(id) {
    const subCatResult = await query('SELECT COUNT(*)::int AS count FROM business_sub_categories WHERE category_id = $1', [id]);
    const leadResult = await query('SELECT COUNT(*)::int AS count FROM leads WHERE category = $1', [id]);
    return {
      inUse: subCatResult.rows[0].count > 0 || leadResult.rows[0].count > 0,
      subCategoryCount: subCatResult.rows[0].count,
      leadCount: leadResult.rows[0].count,
    };
  },
};

module.exports = BusinessCategory;
