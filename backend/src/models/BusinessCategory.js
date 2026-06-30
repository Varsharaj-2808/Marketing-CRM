const { query } = require('../config/db');

const BusinessCategory = {
  async findAllActive() {
    const result = await query('SELECT id, category_name, status FROM business_categories WHERE status = $1 ORDER BY category_name', ['Active']);
    return result.rows;
  },

  async findById(id) {
    const result = await query('SELECT * FROM business_categories WHERE id = $1', [id]);
    return result.rows[0] || null;
  },
};

module.exports = BusinessCategory;
