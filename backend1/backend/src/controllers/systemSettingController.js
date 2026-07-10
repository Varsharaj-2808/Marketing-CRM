const SystemSetting = require('../models/SystemSetting');
const { query } = require('../config/db');

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await SystemSetting.getAll();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

exports.updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (!key || !key.trim()) {
      return res.status(400).json({ success: false, message: 'Setting key is required' });
    }
    if (value === undefined || value === null || String(value).trim() === '') {
      return res.status(400).json({ success: false, message: 'Setting value is required' });
    }

    const validKeys = ['LOCKOUT_THRESHOLD', 'LOCKOUT_WINDOW_MINUTES', 'RESET_TOKEN_EXPIRY_MINUTES'];
    if (!validKeys.includes(key)) {
      return res.status(400).json({ success: false, message: `Invalid setting key. Allowed: ${validKeys.join(', ')}` });
    }

    if (key === 'LOCKOUT_THRESHOLD') {
      const num = parseInt(value);
      if (isNaN(num) || num < 1 || num > 50) {
        return res.status(400).json({ success: false, message: 'LOCKOUT_THRESHOLD must be between 1 and 50' });
      }
    }
    if (key === 'LOCKOUT_WINDOW_MINUTES' || key === 'RESET_TOKEN_EXPIRY_MINUTES') {
      const num = parseInt(value);
      if (isNaN(num) || num < 1 || num > 1440) {
        return res.status(400).json({ success: false, message: `${key} must be between 1 and 1440` });
      }
    }

    const setting = await SystemSetting.set(key, value, description);
    res.json({ success: true, message: 'Setting updated successfully.', data: setting });
  } catch (error) {
    next(error);
  }
};

exports.getAuditRetention = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM system_settings WHERE key = $1', ['audit_log_retention_months']);
    if (!result.rows[0]) {
      return res.json({ success: true, data: { key: 'audit_log_retention_months', value: '12' } });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.updateAuditRetention = async (req, res, next) => {
  try {
    const { value } = req.body;

    const num = parseInt(value);
    if (isNaN(num) || num < 1) {
      return res.status(400).json({ success: false, message: 'Retention period must be a positive integer (months)' });
    }

    const setting = await SystemSetting.set('audit_log_retention_months', String(num), 'Months an audit record stays in active storage before archival');
    res.json({ success: true, message: 'Retention policy updated successfully.', data: setting });
  } catch (error) {
    next(error);
  }
};
