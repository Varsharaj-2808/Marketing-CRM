const { query } = require('../config/db');

const BusinessSubCategory = {
  async findByCategoryId(categoryId) {
    const result = await query(
      'SELECT id, sub_category_name, status FROM business_sub_categories WHERE category_id = $1 AND status = $2 ORDER BY sub_category_name',
      [categoryId, 'Active']
    );
    return result.rows;
  },
};

module.exports = BusinessSubCategory;
