const { query } = require('../config/db');

const LeadSource = {
  async findAllActive() {
    const result = await query('SELECT id, name, status FROM lead_sources WHERE status = $1 ORDER BY name', ['Active']);
    return result.rows;
  },
};

module.exports = LeadSource;
