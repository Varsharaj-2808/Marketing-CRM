const { query } = require('../config/db');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const algolia = require('../utils/algoliaService');
const LeadSource = require('../models/LeadSource');
const BusinessCategory = require('../models/BusinessCategory');
const BusinessSubCategory = require('../models/BusinessSubCategory');
const Service = require('../models/Service');
const Lead = require('../models/Lead');
const LeadHistory = require('../models/LeadHistory');

const getIpAndAgent = (req) => ({
  ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
  userAgent: req.headers['user-agent'] || '',
});

exports.deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const user = await User.findByIdOrEmployeeId(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentStatus = user.accountStatus || user.status;
    if (currentStatus === 'inactive') {
      return res.status(400).json({ success: false, message: 'User is already inactive' });
    }

    const updated = await User.updateAccountStatus(user.id, 'inactive');

    await algolia.saveUser(updated).catch(err => console.error('[deactivateUser] Algolia indexing skipped:', err.message));

    await AuditLog.create({
      userId: req.user.id,
      action: 'USER_STATUS_CHANGED',
      resource: 'User',
      resourceId: user.employee_id || id,
      details: JSON.stringify({ status: { old: currentStatus, new: 'inactive' } }),
      ipAddress,
      userAgent,
      result: 'Success',
    });

    res.json({
      success: true,
      message: 'User deactivated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

exports.activateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const user = await User.findByIdOrEmployeeId(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentStatus = user.accountStatus || user.status;
    if (currentStatus === 'active') {
      return res.status(400).json({ success: false, message: 'User is already active' });
    }

    const updated = await User.updateAccountStatus(user.id, 'active');

    await algolia.saveUser(updated).catch(err => console.error('[activateUser] Algolia indexing skipped:', err.message));

    await AuditLog.create({
      userId: req.user.id,
      action: 'USER_STATUS_CHANGED',
      resource: 'User',
      resourceId: user.employee_id || id,
      details: JSON.stringify({ status: { old: currentStatus, new: 'active' } }),
      ipAddress,
      userAgent,
      result: 'Success',
    });

    res.json({
      success: true,
      message: 'User activated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserStatusHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdOrEmployeeId(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const resourceId = user.employee_id || id;
    const logs = await AuditLog.findByResource('User', resourceId, [
      'USER_CREATED', 'USER_STATUS_CHANGED', 'USER_ROLE_CHANGED', 'USER_UPDATED',
    ]);

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

exports.getLeadSources = async (req, res, next) => {
  try {
    const sources = await LeadSource.findAllActive();
    res.json({ success: true, data: sources });
  } catch (error) {
    next(error);
  }
};

exports.getBusinessCategories = async (req, res, next) => {
  try {
    const categories = await BusinessCategory.findAllActive();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

exports.getBusinessSubCategories = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const category = await BusinessCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Business category not found' });
    }
    const subcategories = await BusinessSubCategory.findByCategoryId(categoryId);
    res.json({ success: true, data: subcategories });
  } catch (error) {
    next(error);
  }
};

exports.getServices = async (req, res, next) => {
  try {
    const services = await Service.findAllActive();
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.reopenLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!UUID_REGEX.test(id)) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (reason === undefined) {
      return res.status(400).json({ reason: 'Reopen reason is required' });
    }
    if (typeof reason !== 'string' || reason.trim() === '') {
      return res.status(400).json({ reason: 'Reopen reason cannot be empty' });
    }
    if (reason.length > 500) {
      return res.status(400).json({ reason: 'Reopen reason must not exceed 500 characters' });
    }

    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    }

    const lead = await Lead.findById(id);
    if (!lead || lead.deleted_at) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (lead.stage !== 'Won' && lead.stage !== 'Lost') {
      return res.status(400).json({ error: `Lead is not closed. Current stage: ${lead.stage}` });
    }

    const updatedLead = await Lead.reopen(id);

    await LeadHistory.create({
      leadId: id,
      fieldName: 'Lead Reopened',
      oldValue: lead.stage,
      newValue: 'Contacted',
      changeSummary: `Lead reopened by Admin (Reason: ${reason})`,
      changedBy: req.user.id,
      reason
    });

    const { ipAddress, userAgent } = getIpAndAgent(req);
    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'LEAD_REOPENED',
      resource: 'Lead',
      resourceId: updatedLead.lead_id,
      details: JSON.stringify({ oldStage: lead.stage, reason }),
      ipAddress,
      userAgent,
      result: 'Success'
    });

    const responseLead = { ...updatedLead, status: updatedLead.lead_status };
    return res.status(200).json({ success: true, data: responseLead });
  } catch (error) {
    next(error);
  }
};

exports.getDashboardKpis = async (req, res, next) => {
  try {
    const { category } = req.query;
    let sql = `
      SELECT
        COUNT(*) AS total_leads,
        COUNT(*) FILTER (WHERE stage = 'Won') AS won_leads,
        COUNT(*) FILTER (WHERE stage = 'Lost') AS lost_leads,
        COUNT(*) FILTER (WHERE stage NOT IN ('Won', 'Lost')) AS active_leads,
        COALESCE(SUM(estimated_value), 0) AS total_estimated_value
      FROM leads
      WHERE deleted_at IS NULL
    `;
    const values = [];
    if (category) {
      sql += ` AND category = $1`;
      values.push(category);
    }
    const result = await query(sql, values);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.getWonRateByCategory = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        l.category AS category_id,
        c.name AS category_name,
        COUNT(*) FILTER (WHERE l.stage IN ('Won', 'Lost')) AS total_closed,
        COUNT(*) FILTER (WHERE l.stage = 'Won') AS won,
        COUNT(*) FILTER (WHERE l.stage = 'Lost') AS lost,
        CASE
          WHEN COUNT(*) FILTER (WHERE l.stage IN ('Won', 'Lost')) > 0
            THEN ROUND(100.0 * COUNT(*) FILTER (WHERE l.stage = 'Won') / COUNT(*) FILTER (WHERE l.stage IN ('Won', 'Lost')), 2) || '%'
          ELSE '0.00%'
        END AS win_rate
      FROM leads l
      LEFT JOIN business_categories c ON l.category = c.id
      WHERE l.deleted_at IS NULL AND l.stage IN ('Won', 'Lost')
      GROUP BY l.category, c.name
      ORDER BY win_rate DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.getLeadVolumeByCategory = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        l.category AS category_id,
        c.name AS category_name,
        COUNT(*) AS lead_count
      FROM leads l
      LEFT JOIN business_categories c ON l.category = c.id
      WHERE l.deleted_at IS NULL
      GROUP BY l.category, c.name
      ORDER BY lead_count DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.exportAdminLeads = async (req, res, next) => {
  try {
    const { format, category } = req.query;
    const filters = { page: 1, limit: 10000 };
    if (category) filters.category = category;
    const result = await Lead.findAllAdmin(filters);

    if (format === 'csv') {
      const headers = [
        'lead_id', 'company_name', 'contact_person', 'mobile_number',
        'email', 'city', 'lead_source', 'category', 'sub_category',
        'priority', 'stage', 'estimated_value',
      ];
      const csvRows = [headers.join(',')];
      for (const lead of result.data) {
        csvRows.push(
          headers.map((h) => {
            const val = lead[h] != null ? String(lead[h]) : '';
            return `"${val.replace(/"/g, '""')}"`;
          }).join(',')
        );
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
      return res.send(csvRows.join('\n'));
    }

    if (format === 'excel') {
      return res.json({ success: true, data: result.data });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
};

exports.exportReport = async (req, res, next) => {
  try {
    const { report, format } = req.query;

    if (report === 'lead-conversion-by-category') {
      const dbResult = await query(`
        SELECT
          c.name AS category_name,
          COUNT(*) AS total_leads,
          COUNT(*) FILTER (WHERE l.stage = 'Won') AS won,
          COUNT(*) FILTER (WHERE l.stage = 'Lost') AS lost,
          CASE WHEN COUNT(*) > 0
            THEN ROUND(100.0 * COUNT(*) FILTER (WHERE l.stage = 'Won') / COUNT(*), 2) || '%'
            ELSE '0.00%'
          END AS conversion_rate
        FROM leads l
        LEFT JOIN business_categories c ON l.category = c.id
        WHERE l.deleted_at IS NULL
        GROUP BY c.name
        ORDER BY category_name
      `);

      if (format === 'excel') {
        return res.json({ success: true, data: dbResult.rows });
      }
      return res.json({ success: true, data: dbResult.rows });
    }

    res.status(400).json({ success: false, message: 'Invalid report type' });
  } catch (error) {
    next(error);
  }
};
