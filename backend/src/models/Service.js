const { query } = require('../config/db');

const Service = {
  async findAllActive() {
    const result = await query('SELECT id, name, status FROM services WHERE status = $1 ORDER BY name', ['Active']);
    return result.rows;
  },
};

module.exports = Service;
