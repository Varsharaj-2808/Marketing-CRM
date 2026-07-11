const { query } = require('../config/db');

const SystemSetting = {
  async get(key) {
    const result = await query('SELECT value FROM system_settings WHERE key = $1', [key]);
    return result.rows[0]?.value || null;
  },

  async set(key, value, description) {
    const result = await query(
      `INSERT INTO system_settings (key, value, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = COALESCE($3, system_settings.description)
       RETURNING *`,
      [key, String(value), description || null]
    );
    return result.rows[0];
  },

  async getAll() {
    const result = await query('SELECT * FROM system_settings ORDER BY key');
    return result.rows;
  },

  async getLockoutConfig() {
    const rows = await query(
      "SELECT key, value FROM system_settings WHERE key IN ('LOCKOUT_THRESHOLD', 'LOCKOUT_WINDOW_MINUTES', 'RESET_TOKEN_EXPIRY_MINUTES')"
    );
    const map = {};
    for (const row of rows.rows) {
      map[row.key] = row.value;
    }
    return {
      lockoutThreshold: parseInt(map.LOCKOUT_THRESHOLD || process.env.LOCKOUT_THRESHOLD || '5'),
      lockoutWindowMinutes: parseInt(map.LOCKOUT_WINDOW_MINUTES || process.env.LOCKOUT_WINDOW_MINUTES || '15'),
      resetTokenExpiryMinutes: parseInt(map.RESET_TOKEN_EXPIRY_MINUTES || process.env.RESET_TOKEN_EXPIRY_MINUTES || '30'),
    };
  },
};

module.exports = SystemSetting;
