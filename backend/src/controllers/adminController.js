const { query, getClient } = require('../config/db');
const { sendDailyReminderEmail } = require('../utils/emailService');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const algolia = require('../utils/algoliaService');
const { withTransaction } = require('../utils/transactionHelper');
const LeadSource = require('../models/LeadSource');
const BusinessCategory = require('../models/BusinessCategory');
const BusinessSubCategory = require('../models/BusinessSubCategory');
const Service = require('../models/Service');
const Lead = require('../models/Lead');
const LeadHistory = require('../models/LeadHistory');
const PDFDocument = require('pdfkit');

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

    let updated;

    await withTransaction(async (client) => {
      updated = await User.updateAccountStatus(user.id, 'inactive', client);

      await AuditLog.create({
        userId: req.user.id,
        action: 'USER_STATUS_CHANGED',
        resource: 'User',
        resourceId: user.employee_id || id,
        details: JSON.stringify({ status: { old: currentStatus, new: 'inactive' } }),
        ipAddress,
        userAgent,
        result: 'Success',
      }, client);
    });

    await algolia.saveUser(updated).catch(err => console.error('[deactivateUser] Algolia indexing skipped:', err.message));

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

    let updated;

    await withTransaction(async (client) => {
      updated = await User.updateAccountStatus(user.id, 'active', client);

      await AuditLog.create({
        userId: req.user.id,
        action: 'USER_STATUS_CHANGED',
        resource: 'User',
        resourceId: user.employee_id || id,
        details: JSON.stringify({ status: { old: currentStatus, new: 'active' } }),
        ipAddress,
        userAgent,
        result: 'Success',
      }, client);
    });

    await algolia.saveUser(updated).catch(err => console.error('[activateUser] Algolia indexing skipped:', err.message));

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

    let client;
    let updatedLead;
    try {
      client = await getClient();
      await client.query('BEGIN');

      const updateRes = await client.query(
        `UPDATE leads SET stage = 'Contacted', lead_status = 'Active', lost_reason = NULL, final_deal_value = NULL, closure_date = NULL, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id]
      );
      updatedLead = updateRes.rows[0];

      if (!updatedLead) {
        const fallbackRes = await query(
          `UPDATE leads SET stage = 'Contacted', lead_status = 'Active', lost_reason = NULL, final_deal_value = NULL, closure_date = NULL, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [id]
        );
        updatedLead = fallbackRes.rows[0];
      }

      await LeadHistory.create({
        leadId: id,
        fieldName: 'Lead Reopened',
        oldValue: lead.stage,
        newValue: 'Contacted',
        changeSummary: `Lead reopened by Admin (Reason: ${reason})`,
        changedBy: req.user.id,
        reason
      }, client);

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

      await client.query('COMMIT');
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      throw err;
    } finally {
      if (client) {
        client.release();
        client = null;
      }
    }

    const responseLead = { ...updatedLead, status: updatedLead.lead_status };
    return res.status(200).json({ success: true, data: responseLead });
  } catch (error) {
    next(error);
  }
};

const buildAdminFilter = (req, alias) => {
  const { category_id, sub_category_id, from, to } = req.query;
  const conditions = [`${alias}deleted_at IS NULL`];
  const values = [];
  let idx = 1;
  const p = (v) => { values.push(v); return `$${idx++}`; };

  if (category_id) {
    conditions.push(`${alias}category = ${p(category_id)}`);
  }
  if (sub_category_id) {
    conditions.push(`${alias}sub_category = ${p(sub_category_id)}`);
  }
  if (from) {
    conditions.push(`${alias}created_at >= ${p(from)}`);
  }
  if (to) {
    conditions.push(`${alias}created_at <= ${p(to + 'T23:59:59.999Z')}`);
  }

  return { where: conditions.join(' AND '), values };
};

exports.getDashboardKpis = async (req, res, next) => {
  try {
    const { category, category_id, sub_category_id, from, to } = req.query;
    const filter = buildAdminFilter(req, '');

    // support legacy ?category= param as alias for category_id
    if (category && !category_id) {
      filter.values.unshift(category);
      filter.where = `category = $1 AND ${filter.where}`;
    }

    const result = await query(`
      SELECT
        COUNT(*) AS total_leads,
        COUNT(*) FILTER (WHERE stage = 'Won') AS won_leads,
        COUNT(*) FILTER (WHERE stage = 'Lost') AS lost_leads,
        COUNT(*) FILTER (WHERE stage NOT IN ('Won', 'Lost')) AS active_leads,
        COALESCE(SUM(estimated_value), 0) AS total_estimated_value
      FROM leads
      WHERE ${filter.where}
    `, filter.values);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.getWonRateByCategory = async (req, res, next) => {
  try {
    const filter = buildAdminFilter(req, 'l.');
    const result = await query(`
      SELECT
        l.category AS category_id,
        c.category_name,
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
      WHERE ${filter.where} AND l.stage IN ('Won', 'Lost')
      GROUP BY l.category, c.category_name
      ORDER BY win_rate DESC
    `, filter.values);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.getLeadVolumeByCategory = async (req, res, next) => {
  try {
    const filter = buildAdminFilter(req, 'l.');
    const result = await query(`
      SELECT
        l.category AS category_id,
        c.category_name,
        COUNT(*) AS lead_count
      FROM leads l
      LEFT JOIN business_categories c ON l.category = c.id
      WHERE ${filter.where}
      GROUP BY l.category, c.category_name
      ORDER BY lead_count DESC
    `, filter.values);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.getDashboardKpisMarketing = async (req, res, next) => {
  try {
    const { category, category_id, sub_category, sub_category_id, from, to } = req.query;
    const resolvedCategoryId = category_id || category;
    const resolvedSubCategoryId = sub_category_id || sub_category;
    const isAdmin = req.user.role === 'Admin';
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
    let idx = 0;
    if (!isAdmin) { idx++; sql += ` AND assigned_to = $${idx}`; values.push(req.user.id); }
    if (resolvedCategoryId) { idx++; sql += ` AND category = $${idx}`; values.push(resolvedCategoryId); }
    if (resolvedSubCategoryId) { idx++; sql += ` AND sub_category = $${idx}`; values.push(resolvedSubCategoryId); }
    if (from) { idx++; sql += ` AND created_at::date >= $${idx}::date`; values.push(from); }
    if (to) { idx++; sql += ` AND created_at::date <= $${idx}::date`; values.push(to); }
    const result = await query(sql, values);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.getWonRateByCategoryMarketing = async (req, res, next) => {
  try {
    const { category, category_id, sub_category, sub_category_id, from, to } = req.query;
    const resolvedCategoryId = category_id || category;
    const resolvedSubCategoryId = sub_category_id || sub_category;
    const isAdmin = req.user.role === 'Admin';
    let sql = `
      SELECT
        l.category AS category_id,
        c.category_name AS category_name,
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
    `;
    const values = [];
    let idx = 0;
    if (!isAdmin) { idx++; sql += ` AND l.assigned_to = $${idx}`; values.push(req.user.id); }
    if (resolvedCategoryId) { idx++; sql += ` AND l.category = $${idx}`; values.push(resolvedCategoryId); }
    if (resolvedSubCategoryId) { idx++; sql += ` AND l.sub_category = $${idx}`; values.push(resolvedSubCategoryId); }
    if (from) { idx++; sql += ` AND l.created_at::date >= $${idx}::date`; values.push(from); }
    if (to) { idx++; sql += ` AND l.created_at::date <= $${idx}::date`; values.push(to); }
    sql += ` GROUP BY l.category, c.category_name ORDER BY win_rate DESC`;
    const result = await query(sql, values);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.getLeadVolumeByCategoryMarketing = async (req, res, next) => {
  try {
    const filter = buildAdminFilter(req, 'l.');
    const result = await query(`
      SELECT
        l.category AS category_id,
        c.category_name,
        COUNT(*) AS lead_count
      FROM leads l
      LEFT JOIN business_categories c ON l.category = c.id
      WHERE ${filter.where}
      GROUP BY l.category, c.category_name
      ORDER BY lead_count DESC
    `, filter.values);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.exportAdminLeads = async (req, res, next) => {
  try {
    const { format, category_id, sub_category_id, status, quality, from, to } = req.query;

    const validFormats = ['csv', 'excel', 'pdf'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({ success: false, message: 'Format must be csv, excel, or pdf' });
    }

    const filters = { page: 1, limit: 10000 };
    if (category_id) filters.category = category_id;
    if (sub_category_id) filters.sub_category = sub_category_id;
    if (status) filters.status = status;
    if (quality) filters.priority = quality;
    if (from) filters.from_date = from;
    if (to) filters.to_date = to;
    const result = await Lead.findAllAdmin(filters);

    if (result.data.length === 0) {
      return res.status(404).json({ success: false, message: 'No leads found for the given filters' });
    }
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
      const XLSX = require('xlsx');
      const headers = ['lead_id', 'company_name', 'contact_person', 'mobile_number', 'email', 'city', 'lead_source', 'category', 'sub_category', 'priority', 'stage', 'estimated_value'];
      const rows = result.data.map(lead => headers.map(h => lead[h] != null ? String(lead[h]) : ''));
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=leads.xlsx');
      return res.send(buf);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=leads.pdf');
      doc.pipe(res);

      const headers = ['Lead ID', 'Company', 'Contact', 'Mobile', 'Email', 'Source', 'Priority', 'Stage', 'Value'];
      const cols = ['lead_id', 'company_name', 'contact_person', 'mobile_number', 'email', 'lead_source', 'priority', 'stage', 'estimated_value'];
      const colWidths = [90, 110, 90, 85, 130, 70, 60, 75, 65];
      const tableTop = 50;
      let y = tableTop;

      doc.fontSize(14).font('Helvetica-Bold').text('Leads Export', 40, 15);
      doc.fontSize(8).font('Helvetica').text(`Generated: ${new Date().toISOString()}`, 40, 32);
      y = 48;
      doc.moveTo(40, y).lineTo(40 + colWidths.reduce((a, b) => a + b, 0), y).stroke();

      doc.font('Helvetica-Bold').fontSize(7);
      let x = 40;
      headers.forEach((h, i) => {
        doc.text(h, x + 2, y + 3, { width: colWidths[i] - 4, align: 'left' });
        x += colWidths[i];
      });
      y += 16;
      doc.moveTo(40, y).lineTo(40 + colWidths.reduce((a, b) => a + b, 0), y).stroke();

      doc.font('Helvetica').fontSize(6);
      for (const lead of result.data) {
        if (y > 540) {
          doc.addPage();
          y = 40;
        }
        x = 40;
        cols.forEach((c, i) => {
          const val = lead[c] != null ? String(lead[c]) : '';
          doc.text(val, x + 2, y + 2, { width: colWidths[i] - 4, align: 'left' });
          x += colWidths[i];
        });
        y += 14;
      }

      doc.end();
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
};

exports.exportReport = async (req, res, next) => {
  try {
    const { report, format } = req.query;

    if (report === 'lead-conversion-by-category' || report === 'lead-conversion') {
      const filter = buildAdminFilter(req, 'l.');
      const dbResult = await query(`
        SELECT
          c.category_name,
          COUNT(*) AS total_leads,
          COUNT(*) FILTER (WHERE l.stage = 'Won') AS won,
          COUNT(*) FILTER (WHERE l.stage = 'Lost') AS lost,
          CASE WHEN COUNT(*) > 0
            THEN ROUND(100.0 * COUNT(*) FILTER (WHERE l.stage = 'Won') / COUNT(*), 2) || '%'
            ELSE '0.00%'
          END AS conversion_rate
        FROM leads l
        LEFT JOIN business_categories c ON l.category = c.id
        WHERE ${filter.where}
        GROUP BY c.category_name
        ORDER BY c.category_name
      `, filter.values);

      if (dbResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'No data found for the given filters' });
      }

      const headers = ['category_name', 'total_leads', 'won', 'lost', 'conversion_rate'];
      const rows = dbResult.rows.map(r => headers.map(h => r[h] != null ? String(r[h]) : ''));

      if (format === 'csv') {
        const csvRows = [headers.join(',')];
        csvRows.push(...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')));
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=lead-conversion.csv');
        return res.send(csvRows.join('\n'));
      }

      if (format === 'excel') {
        const XLSX = require('xlsx');
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'LeadConversion');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=lead-conversion.xlsx');
        return res.send(buf);
      }

      return res.json({ success: true, data: dbResult.rows });
    }

    if (report === 'category-breakdown') {
      const filter = buildAdminFilter(req, 'l.');
      const dbResult = await query(`
        SELECT
          c.category_name,
          COUNT(*) AS lead_count,
          COUNT(*) FILTER (WHERE l.stage = 'Won') AS won,
          COUNT(*) FILTER (WHERE l.stage = 'Lost') AS lost,
          COUNT(*) FILTER (WHERE l.stage NOT IN ('Won', 'Lost')) AS active
        FROM leads l
        LEFT JOIN business_categories c ON l.category = c.id
        WHERE ${filter.where}
        GROUP BY c.category_name
        ORDER BY lead_count DESC
      `, filter.values);

      if (dbResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'No data found for the given filters' });
      }

      const headers = ['category_name', 'lead_count', 'won', 'lost', 'active'];
      const rows = dbResult.rows.map(r => headers.map(h => r[h] != null ? String(r[h]) : ''));

      if (format === 'csv') {
        const csvRows = [headers.join(',')];
        csvRows.push(...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')));
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=category-breakdown.csv');
        return res.send(csvRows.join('\n'));
      }

      if (format === 'excel') {
        const XLSX = require('xlsx');
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'CategoryBreakdown');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=category-breakdown.xlsx');
        return res.send(buf);
      }

      return res.json({ success: true, data: dbResult.rows });
    }

    res.status(400).json({ success: false, message: 'Invalid report type' });
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────────────────────
// STORY-4.2.1 | API-6
// GET /admin/dashboard/at-risk
// Returns leads overdue >= overdue_days (default 3) calendar days.
// Admin-only. Sorted descending by days_overdue.
// ─────────────────────────────────────────────────────────────
exports.getAtRiskLeads = async (req, res, next) => {
  try {
    const raw = parseInt(req.query.overdue_days, 10);
    const threshold = Number.isInteger(raw) && raw > 0 ? raw : 3;

    const leadsResult = await query(
      `SELECT
         l.id,
         l.lead_id,
         l.company_name,
         l.contact_person,
         u.name                                                  AS assigned_to,
         (CURRENT_DATE - DATE(l.next_followup_date))::int        AS days_overdue
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.next_followup_date IS NOT NULL
         AND DATE(l.next_followup_date) < CURRENT_DATE
         AND l.stage NOT IN ('Won', 'Lost')
         AND (CURRENT_DATE - DATE(l.next_followup_date)) >= $1
         AND l.deleted_at IS NULL
       ORDER BY days_overdue DESC`,
      [threshold]
    );

    const breakdownResult = await query(
      `SELECT
         u.id                                                         AS user_id,
         u.name                                                       AS user_name,
         COUNT(l.id)::int                                             AS at_risk_count,
         MAX((CURRENT_DATE - DATE(l.next_followup_date))::int)        AS oldest_overdue_days
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.next_followup_date IS NOT NULL
         AND DATE(l.next_followup_date) < CURRENT_DATE
         AND l.stage NOT IN ('Won', 'Lost')
         AND (CURRENT_DATE - DATE(l.next_followup_date)) >= $1
         AND l.deleted_at IS NULL
       GROUP BY u.id, u.name
       ORDER BY oldest_overdue_days DESC`,
      [threshold]
    );

    return res.json({
      success: true,
      message: 'At-risk leads fetched successfully',
      data: {
        total_at_risk: leadsResult.rows.length,
        breakdown:     breakdownResult.rows,
        leads:         leadsResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// STORY-4.2.1 | API-4
// POST /admin/reminders/send-daily
// Idempotent cron trigger: creates in-app notifications for leads
// due on the given date that have not been notified yet.
// Admin-only.
// ─────────────────────────────────────────────────────────────
const YYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;

exports.sendDailyReminders = async (req, res, next) => {
  try {
    const { date } = req.body;

    if (!date || !YYYYMMDD.test(date) || isNaN(new Date(date).getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        body: { error: 'Invalid date format. Use YYYY-MM-DD' },
      });
    }

    // Find active leads due on date that are NOT yet notified today (idempotency)
    const leadsResult = await query(
      `SELECT l.id AS lead_id, l.company_name, l.priority, l.assigned_to AS user_id, u.email, u.name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE DATE(l.next_followup_date) = $1
         AND l.stage NOT IN ('Won', 'Lost')
         AND l.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM notifications n
           WHERE n.lead_id = l.id
             AND n.notification_type = 'lead_reminder'
             AND DATE(n.created_at) = $1
         )`,
      [date]
    );

    const due = leadsResult.rows;

    if (due.length === 0) {
      return res.json({
        success:        true,
        message:        'Daily reminders processed successfully',
        reminders_sent: 0,
        breakdown:      [],
      });
    }

    const map = {};
    for (const lead of due) {
      // 1. In-App Notification
      await query(
        `INSERT INTO notifications (user_id, notification_type, lead_id, message)
         VALUES ($1, 'lead_reminder', $2, $3)`,
        [
          lead.user_id,
          lead.lead_id,
          `Reminder: Follow-up is due today for ${lead.company_name} (${lead.priority}).`,
        ]
      );
      
      // 2. Email Notification (fire-and-forget to avoid blocking)
      if (lead.email) {
        sendDailyReminderEmail(lead.email, lead.name, lead.company_name, lead.priority).catch(err => {
          console.error(`Failed to send daily reminder email to ${lead.email}:`, err);
        });
      }

      if (!map[lead.user_id]) map[lead.user_id] = { user_id: lead.user_id, leads_reminded: 0 };
      map[lead.user_id].leads_reminded += 1;
    }

    return res.json({
      success:        true,
      message:        'Daily reminders processed successfully',
      reminders_sent: due.length,
      breakdown:      Object.values(map),
    });
  } catch (error) {
    next(error);
  }
};
