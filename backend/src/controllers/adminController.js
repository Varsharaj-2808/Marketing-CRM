const { query, getClient } = require('../config/db');
const { sendDailyReminderEmail, sendEmail } = require('../utils/emailService');
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
const Notification = require('../models/Notification');
const PDFDocument = require('pdfkit');
const { success: wrapSuccess, error: wrapError } = require('../utils/response');

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
      message: 'User account deactivated',
      data: {
        id: updated.id,
        status: updated.status || updated.accountStatus,
        deactivatedAt: updated.updated_at || new Date().toISOString(),
      },
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
      message: 'User account activated',
      data: {
        id: updated.id,
        status: updated.status || updated.accountStatus,
        activatedAt: updated.updated_at || new Date().toISOString(),
      },
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

    res.json({ success: true, message: 'User status history fetched successfully', data: logs });
  } catch (error) {
    next(error);
  }
};

exports.getLeadSources = async (req, res, next) => {
  try {
    const sources = await LeadSource.findAllActive();
    const mappedSources = sources.map(s => ({
      id: s.id,
      name: s.name,
      source_name: s.name || s.source_name || '',
    }));
    res.json(wrapSuccess('Lead sources fetched successfully', mappedSources));
  } catch (error) {
    next(error);
  }
};

exports.createLeadSource = async (req, res, next) => {
  try {
    const { name } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (!name || !name.trim()) {
      return res.status(400).json(wrapError('Lead source name is required'));
    }

    const existing = await LeadSource.findAll();
    if (existing.some(s => s.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(409).json(wrapError(`A lead source named '${name.trim()}' already exists`));
    }

    const source = await LeadSource.create({ name: name.trim() });

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'lead_source.created',
      resource: 'lead_source',
      resourceId: source.id,
      details: JSON.stringify({ name: source.name }),
      ipAddress,
      userAgent,
      result: 'success',
    }).catch(() => {});

    if (algolia && typeof algolia.saveLeadSource === 'function') {
      await algolia.saveLeadSource(source).catch(() => {});
    }

    res.status(201).json(wrapSuccess('Lead source created successfully', source));
  } catch (error) {
    next(error);
  }
};

exports.updateLeadSource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const source = await LeadSource.findById(id);
    if (!source) {
      return res.status(404).json(wrapError('Lead source not found'));
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json(wrapError('Lead source name cannot be empty'));
      }
      const all = await LeadSource.findAll();
      const duplicate = all.find(s => s.id !== id && s.name.toLowerCase() === name.trim().toLowerCase());
      if (duplicate) {
        return res.status(409).json(wrapError(`A lead source named '${name.trim()}' already exists`));
      }
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name.trim();
    if (isActive !== undefined) updateFields.status = isActive ? 'Active' : 'Inactive';

    const updated = await LeadSource.update(id, updateFields);

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'lead_source.updated',
      resource: 'lead_source',
      resourceId: id,
      details: JSON.stringify({ old: { name: source.name, status: source.status }, new: { name: updated.name, status: updated.status } }),
      ipAddress,
      userAgent,
      result: 'success',
    }).catch(() => {});

    if (algolia && typeof algolia.saveLeadSource === 'function') {
      await algolia.saveLeadSource(updated).catch(() => {});
    }

    res.json(wrapSuccess('Lead source updated successfully', updated));
  } catch (error) {
    next(error);
  }
};

exports.deleteLeadSource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const source = await LeadSource.findById(id);
    if (!source) {
      return res.status(404).json(wrapError('Lead source not found'));
    }

    await LeadSource.delete(id);

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'lead_source.deleted',
      resource: 'lead_source',
      resourceId: id,
      details: JSON.stringify({ name: source.name }),
      ipAddress,
      userAgent,
      result: 'success',
    }).catch(() => {});

    if (algolia && typeof algolia.deleteLeadSource === 'function') {
      await algolia.deleteLeadSource(id).catch(() => {});
    }

    res.json(wrapSuccess('Lead source deleted successfully', { id }));
  } catch (error) {
    next(error);
  }
};

exports.getBusinessCategories = async (req, res, next) => {
  try {
    const categories = await BusinessCategory.findAllActive();
    res.json({ success: true, message: 'Business categories fetched successfully', data: categories });
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
    res.json({ success: true, message: 'Business sub-categories fetched successfully', data: subcategories });
  } catch (error) {
    next(error);
  }
};

exports.checkCategoryInUse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await BusinessCategory.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    const countResult = await query(`SELECT COUNT(*)::int AS count FROM leads WHERE category = $1`, [id]);
    const count = countResult.rows[0].count;
    const subCountResult = await query(`SELECT COUNT(*)::int AS count FROM business_sub_categories WHERE category_id = $1`, [id]);
    const subCategoryCount = subCountResult.rows[0].count;
    res.json({ success: true, message: 'Category usage check completed', data: { in_use: count > 0, lead_count: count, sub_category_count: subCategoryCount } });
  } catch (error) {
    next(error);
  }
};

exports.checkSubCategoryInUse = async (req, res, next) => {
  try {
    const { categoryId, subCategoryId } = req.params;
    const category = await BusinessCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    const subcategory = await BusinessSubCategory.findById(subCategoryId);
    if (!subcategory) {
      return res.status(404).json({ success: false, message: 'Sub-category not found' });
    }
    const countResult = await query(`SELECT COUNT(*)::int AS count FROM leads WHERE category = $1 AND sub_category = $2`, [categoryId, subCategoryId]);
    const count = countResult.rows[0].count;
    res.json({ success: true, message: 'Sub-category usage check completed', data: { in_use: count > 0, lead_count: count } });
  } catch (error) {
    next(error);
  }
};

exports.getServices = async (req, res, next) => {
  try {
    const services = await Service.findAllActive();
    const mappedServices = services.map(s => ({
      id: s.id,
      name: s.name,
      service_name: s.name || s.service_name || '',
    }));
    res.json(wrapSuccess('Services fetched successfully', mappedServices));
  } catch (error) {
    next(error);
  }
};

exports.createService = async (req, res, next) => {
  try {
    const { name } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (!name || !name.trim()) {
      return res.status(400).json(wrapError('Service name is required'));
    }

    const existing = await Service.findAll();
    if (existing.some(s => s.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(409).json(wrapError(`A service named '${name.trim()}' already exists`));
    }

    const service = await Service.create({ name: name.trim() });

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'service.created',
      resource: 'service',
      resourceId: service.id,
      details: JSON.stringify({ name: service.name }),
      ipAddress,
      userAgent,
      result: 'success',
    }).catch(() => {});

    if (algolia && typeof algolia.saveService === 'function') {
      await algolia.saveService(service).catch(() => {});
    }

    res.status(201).json(wrapSuccess('Service created successfully', service));
  } catch (error) {
    next(error);
  }
};

exports.updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json(wrapError('Service not found'));
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json(wrapError('Service name cannot be empty'));
      }
      const all = await Service.findAll();
      const duplicate = all.find(s => s.id !== id && s.name.toLowerCase() === name.trim().toLowerCase());
      if (duplicate) {
        return res.status(409).json(wrapError(`A service named '${name.trim()}' already exists`));
      }
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name.trim();
    if (isActive !== undefined) updateFields.status = isActive ? 'Active' : 'Inactive';

    const updated = await Service.update(id, updateFields);

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'service.updated',
      resource: 'service',
      resourceId: id,
      details: JSON.stringify({ old: { name: service.name, status: service.status }, new: { name: updated.name, status: updated.status } }),
      ipAddress,
      userAgent,
      result: 'success',
    }).catch(() => {});

    if (algolia && typeof algolia.saveService === 'function') {
      await algolia.saveService(updated).catch(() => {});
    }

    res.json(wrapSuccess('Service updated successfully', updated));
  } catch (error) {
    next(error);
  }
};

exports.deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json(wrapError('Service not found'));
    }

    await Service.delete(id);

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'service.deleted',
      resource: 'service',
      resourceId: id,
      details: JSON.stringify({ name: service.name }),
      ipAddress,
      userAgent,
      result: 'success',
    }).catch(() => {});

    if (algolia && typeof algolia.deleteService === 'function') {
      await algolia.deleteService(id).catch(() => {});
    }

    res.json(wrapSuccess('Service deleted successfully', { id }));
  } catch (error) {
    next(error);
  }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.reopenLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isPut = req.method === 'PUT';
    const reasonField = isPut ? req.body.reopen_reason : req.body.reason;

    if (reasonField === undefined) {
      return res.status(400).json({ success: false, reason: 'Reopen reason is required', message: 'Reopen reason is required' });
    }

    if (typeof reasonField === 'string' && reasonField.trim().length === 0) {
      return res.status(400).json({ success: false, reason: 'Reopen reason cannot be empty', message: 'Reopen reason cannot be empty' });
    }

    if (typeof reasonField === 'string' && reasonField.length > 500) {
      return res.status(400).json({ success: false, reason: 'Reopen reason must not exceed 500 characters', message: 'Reopen reason must not exceed 500 characters' });
    }

    if (!UUID_REGEX.test(id)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const lead = await Lead.findById(id);
    if (!lead || lead.deleted_at) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (lead.stage !== 'Closed') {
      const errMsg = isPut ? 'Only Won or Lost leads can be reopened' : `Lead is not closed. Current stage: ${lead.stage}`;
      return res.status(400).json(wrapError(errMsg));
    }

    let client;
    let updatedLead;
    try {
      client = await getClient();
      await client.query('BEGIN');

      const updateRes = await client.query(
        `UPDATE leads SET stage = 'Contacted', lead_status = NULL, lost_reason = NULL, final_deal_value = NULL, closure_date = NULL, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id]
      );
      updatedLead = updateRes.rows[0];

      await LeadHistory.create({
        leadId: id,
        fieldName: 'stage',
        oldValue: lead.stage,
        newValue: 'Contacted',
        changeSummary: `Lead reopened by ${req.user.name || req.user.email} (Reason: ${reasonField})`,
        changedBy: req.user.id,
        reason: reasonField
      }, client);

      await AuditLog.create({
        userId: req.user.id,
        email: req.user.email,
        action: 'lead.reopened',
        resource: 'Lead',
        resourceId: updatedLead.lead_id,
        details: JSON.stringify({ previousStage: lead.stage, reason: reasonField }),
        ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
        userAgent: req.headers['user-agent'] || '',
        result: 'Success'
      }, client);

      await client.query('COMMIT');
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      throw err;
    } finally {
      if (client) client.release();
    }

    const finalLead = await Lead.findById(updatedLead.id);
    if (algolia && typeof algolia.saveLead === 'function') {
      await algolia.saveLead(finalLead).catch(err => console.error('[reopenLead] Algolia indexing skipped:', err.message));
    }

    if (updatedLead.assigned_to) {
      Notification.create({
        userId: updatedLead.assigned_to,
        notificationType: 'lead_reopened',
        leadId: id,
        message: `Lead ${updatedLead.lead_id} has been reopened by Admin (Reason: ${reasonField})`
      }).catch(err => console.error('[reopenLead] ME notification skipped:', err.message));
    }

    return res.status(200).json({
      success: true,
      message: 'Lead reopened',
      data: {
        id: updatedLead.id,
        status: updatedLead.stage,
        reopened_by: { id: req.user.id, name: req.user.name || req.user.email },
        reopen_reason: reasonField,
        reopened_at: updatedLead.updated_at,
      },
    });
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

const DATE_REGEX_ADMIN = /^\d{4}-\d{2}-\d{2}$/;

exports.getDashboardKpis = async (req, res, next) => {
  try {
    const { category, category_id, from, to } = req.query;

    // Date format validation
    if (from && !DATE_REGEX_ADMIN.test(from)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    if (to && !DATE_REGEX_ADMIN.test(to)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const conditions = ['deleted_at IS NULL'];
    const values = [];
    let idx = 1;
    const p = (v) => { values.push(v); return `$${idx++}`; };

    if (category && !category_id) conditions.push(`category = ${p(category)}`);
    if (category_id) conditions.push(`category = ${p(category_id)}`);
    if (from) conditions.push(`created_at::date >= ${p(from)}::date`);
    if (to)   conditions.push(`created_at::date <= ${p(to)}::date`);

    const where = conditions.join(' AND ');

    const result = await query(`
      SELECT
        COUNT(*)                                                                      AS total_leads,
        COUNT(*) FILTER (WHERE stage = 'New')                                         AS "new",
        COUNT(*) FILTER (WHERE stage = 'Contacted')                                   AS contacted,
        COUNT(*) FILTER (WHERE stage = 'Qualified')                                   AS qualified,
        COUNT(*) FILTER (WHERE stage = 'Meeting')                                     AS meeting,
        COUNT(*) FILTER (WHERE stage = 'Proposal')                                   AS proposal,
        COUNT(*) FILTER (WHERE stage = 'Negotiation')                                AS negotiation,
        COUNT(*) FILTER (WHERE lead_status = 'Won')                                         AS won,
        COUNT(*) FILTER (WHERE lead_status = 'Lost')                                        AS lost,
        COUNT(*) FILTER (WHERE DATE(next_followup_date) = '${today}'
                           AND stage != 'Closed')                            AS today_followups,
        COUNT(*) FILTER (WHERE priority = 'Hot')                                  AS hot_leads,
        COUNT(*) FILTER (WHERE priority = 'Warm')                                 AS warm_leads,
        COUNT(*) FILTER (WHERE priority = 'Cold')                                 AS cold_leads
      FROM leads
      WHERE ${where}
    `, values);

    const row = result.rows[0] || {};
    const won  = Number(row.won  || 0);
    const lost = Number(row.lost || 0);
    const totalLeads = Number(row.total_leads || 0);
    let conversion_rate = '0%';
    if (totalLeads > 0) {
      const rate = (won / totalLeads) * 100;
      const rounded = Math.round(rate * 100) / 100;
      conversion_rate = (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2)) + '%';
    }

    const data = {
      total_leads:     totalLeads,
      new:             Number(row.new             || 0),
      contacted:       Number(row.contacted       || 0),
      qualified:       Number(row.qualified       || 0),
      meeting:         Number(row.meeting         || 0),
      proposal:        Number(row.proposal        || 0),
      negotiation:     Number(row.negotiation     || 0),
      won,
      lost,
      conversion_rate,
      hot_leads:       Number(row.hot_leads       || 0),
      warm_leads:      Number(row.warm_leads      || 0),
      cold_leads:      Number(row.cold_leads      || 0),
      category_id: category_id || null,
      sub_category_id: null,
    };

    return res.status(200).json({
      success: true,
      message: 'Dashboard KPIs fetched successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// STORY-6.1.1 | GET /admin/dashboard/category-volume
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
exports.getCategoryVolume = async (req, res, next) => {
  try {
    const { category_id, from, to } = req.query;

    if (from && !DATE_REGEX_ADMIN.test(from)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    if (to && !DATE_REGEX_ADMIN.test(to)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const conditions = ['l.deleted_at IS NULL'];
    const values = [];
    let idx = 1;
    const p = (v) => { values.push(v); return `$${idx++}`; };

    if (category_id) conditions.push(`l.category = ${p(category_id)}`);
    if (from) conditions.push(`l.created_at::date >= ${p(from)}::date`);
    if (to)   conditions.push(`l.created_at::date <= ${p(to)}::date`);

    const where = conditions.join(' AND ');

    const dataResult = await query(`
      SELECT
        bc.category_name  AS category,
        bsc.sub_category_name AS sub_category,
        COUNT(*)::int     AS lead_count
      FROM leads l
      LEFT JOIN business_categories bc  ON l.category     = bc.id
      LEFT JOIN business_sub_categories bsc ON l.sub_category = bsc.id
      WHERE ${where}
      GROUP BY bc.category_name, bsc.sub_category_name
      ORDER BY lead_count DESC
    `, values);

    const totalLeadsResult = await query(
      `SELECT COUNT(*)::int AS cnt FROM leads l WHERE ${where}`,
      values
    );
    const totalLeads = Number((totalLeadsResult.rows[0] || {}).cnt || 0);

    const mappedData = dataResult.rows.map(row => ({
      category: row.category,
      count: row.lead_count,
      percentage: totalLeads > 0 ? Math.round((row.lead_count / totalLeads) * 100) + '%' : '0%',
    }));

    return res.status(200).json({
      success: true,
      message: 'Category volume fetched successfully',
      data: mappedData,
    });
  } catch (error) {
    next(error);
  }
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// STORY-6.1.1 | GET /admin/dashboard/won-rate-by-source
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
exports.getWonRateBySource = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    if (from && !DATE_REGEX_ADMIN.test(from)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    if (to && !DATE_REGEX_ADMIN.test(to)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    if (from && to && new Date(from) > new Date(to)) {
      return res.status(400).json({ success: false, message: "'from' date must be earlier than 'to' date" });
    }

    const conditions = ['l.deleted_at IS NULL'];
    const values = [];
    let idx = 1;
    const p = (v) => { values.push(v); return `$${idx++}`; };

    if (from) conditions.push(`l.created_at::date >= ${p(from)}::date`);
    if (to)   conditions.push(`l.created_at::date <= ${p(to)}::date`);

    const where = conditions.join(' AND ');

    const result = await query(`
      SELECT
        COALESCE(ls.name, l.lead_source, 'Unknown') AS source,
        COUNT(*)::int                                         AS total,
        COUNT(*) FILTER (WHERE l.lead_status = 'Won')::int         AS won,
        COUNT(*) FILTER (WHERE l.lead_status = 'Lost')::int        AS lost,
        CASE
          WHEN COUNT(*) > 0
            THEN ROUND(100.0 * COUNT(*) FILTER (WHERE l.lead_status = 'Won') / COUNT(*), 2) || '%'
          ELSE '0%'
        END AS rate
      FROM leads l
      LEFT JOIN lead_sources ls ON l.lead_source = ls.id::text OR l.lead_source = ls.name
      WHERE ${where}
      GROUP BY COALESCE(ls.name, l.lead_source, 'Unknown')
      ORDER BY won DESC
    `, values);

    const data = result.rows.map(row => ({
      source: row.source,
      total: row.total,
      won: row.won,
      lost: row.lost,
      win_rate: row.rate,
    }));

    return res.status(200).json({
      success: true,
      message: 'Won rate by source fetched successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.getWonRateByCategory = async (req, res, next) => {
  try {
    const filter = buildAdminFilter(req, 'l.');
    const result = await query(`
      SELECT
        c.category_name AS category,
        COUNT(*) FILTER (WHERE l.lead_status IN ('Won', 'Lost')) AS total,
        COUNT(*) FILTER (WHERE l.lead_status = 'Won') AS won,
        COUNT(*) FILTER (WHERE l.lead_status = 'Lost') AS lost,
        CASE
          WHEN COUNT(*) FILTER (WHERE l.lead_status IN ('Won', 'Lost')) > 0
            THEN ROUND(100.0 * COUNT(*) FILTER (WHERE l.lead_status = 'Won') / COUNT(*) FILTER (WHERE l.lead_status IN ('Won', 'Lost')), 2) || '%'
          ELSE '0.00%'
        END AS rate
      FROM leads l
      LEFT JOIN business_categories c ON l.category = c.id
      WHERE ${filter.where} AND l.lead_status IN ('Won', 'Lost')
      GROUP BY l.category, c.category_name
      ORDER BY rate DESC
    `, filter.values);
    const data = result.rows.map(row => ({
      category_id: row.category,
      category_name: row.category,
      total_closed: row.total,
      won: row.won,
      lost: row.lost,
      win_rate: row.rate,
    }));
    res.json({ success: true, message: 'Won rate by category fetched successfully', data });
  } catch (error) {
    next(error);
  }
};

exports.getLeadVolumeByCategory = async (req, res, next) => {
  try {
    const filter = buildAdminFilter(req, 'l.');
    const result = await query(`
      SELECT
        c.category_name AS category,
        COUNT(*) AS count
      FROM leads l
      LEFT JOIN business_categories c ON l.category = c.id
      WHERE ${filter.where}
      GROUP BY l.category, c.category_name
      ORDER BY count DESC
    `, filter.values);

    const totalLeadsResult = await query(
      `SELECT COUNT(*)::int AS cnt FROM leads l WHERE ${filter.where}`,
      filter.values
    );
    const totalLeads = Number((totalLeadsResult.rows[0] || {}).cnt || 0);

    const mappedData = result.rows.map(row => ({
      category_id: row.category,
      category_name: row.category,
      lead_count: row.count,
      percentage: totalLeads > 0 ? Math.round((row.count / totalLeads) * 100) + '%' : '0%',
    }));

    res.json({ success: true, message: 'Lead volume by category fetched successfully', data: mappedData });
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
        COUNT(*) FILTER (WHERE lead_status = 'Won') AS won_leads,
        COUNT(*) FILTER (WHERE lead_status = 'Lost') AS lost_leads,
        COUNT(*) FILTER (WHERE stage != 'Closed') AS active_leads,
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
    const row = result.rows[0] || {};
    const won = Number(row.won_leads || 0);
    const lost = Number(row.lost_leads || 0);
    const total_closed = won + lost;
    let rate = '0%';
    if (total_closed > 0) {
      const pct = (won / total_closed) * 100;
      const rounded = Math.round(pct * 100) / 100;
      rate = (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2)) + '%';
    }
    res.json({
      success: true,
      message: 'Marketing dashboard KPIs fetched successfully',
      data: {
        cards: {
          my_leads: Number(row.total_leads || 0),
          my_followups_today: Number(row.active_leads || 0),
          my_won_leads: won,
          my_lost_leads: lost,
        },
        conversion_rate: { won, lost, rate },
        total_estimated_value: Number(row.total_estimated_value || 0),
      },
    });
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
        COUNT(*) FILTER (WHERE l.lead_status IN ('Won', 'Lost')) AS total_closed,
        COUNT(*) FILTER (WHERE l.lead_status = 'Won') AS won,
        COUNT(*) FILTER (WHERE l.lead_status = 'Lost') AS lost,
        CASE
          WHEN COUNT(*) FILTER (WHERE l.lead_status IN ('Won', 'Lost')) > 0
            THEN ROUND(100.0 * COUNT(*) FILTER (WHERE l.lead_status = 'Won') / COUNT(*) FILTER (WHERE l.lead_status IN ('Won', 'Lost')), 2) || '%'
          ELSE '0.00%'
        END AS win_rate
      FROM leads l
      LEFT JOIN business_categories c ON l.category = c.id
      WHERE l.deleted_at IS NULL AND l.lead_status IN ('Won', 'Lost')
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
    res.json({ success: true, message: 'Won rate by category fetched successfully', data: result.rows });
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
    res.json({ success: true, message: 'Lead volume by category fetched successfully', data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.exportAdminLeads = async (req, res, next) => {
  try {
    const { format, category_id, sub_category_id, status, quality, from, to } = req.query;

    // STORY-6.3.1: Only csv and excel allowed
    if (!format || !['csv', 'excel'].includes(format)) {
      return res.status(400).json({ success: false, message: 'Format must be csv or excel' });
    }

    const filters = { page: 1, limit: 10000 };
    if (category_id)    filters.category     = category_id;
    if (sub_category_id) filters.sub_category = sub_category_id;
    if (status)         filters.status       = status;
    if (quality)        filters.priority     = quality;
    if (from)           filters.from_date    = from;
    if (to)             filters.to_date      = to;

    const result = await Lead.findAllAdmin(filters);
    const leads = result.data || [];
    const recordCount = leads.length;

    // Create audit log entry BEFORE zero-check (STORY-6.3.1 Acceptance Criteria 3)
    const { ipAddress, userAgent } = getIpAndAgent(req);
    const appliedFilters = {};
    if (status)      appliedFilters.status  = status;
    if (quality)     appliedFilters.quality = quality;
    if (from)        appliedFilters.from    = from;
    if (to)          appliedFilters.to      = to;

    let auditId = '';
    try {
      const auditEntry = await AuditLog.create({
        userId:     req.user.id,
        email:      req.user.email || '',
        action:     'lead.exported',
        resource:   'lead',
        resourceId: 'bulk',
        details:    JSON.stringify({ record_count: recordCount, format, filters: appliedFilters }),
        ipAddress,
        userAgent,
        result:     recordCount === 0 ? 'NoData' : 'Success',
      });
      if (auditEntry) auditId = auditEntry.id || '';
    } catch (_auditErr) {
      // Audit logging failure must not block the export response
    }

    // STORY-6.3.1: Correct column headers
    const EXPORT_HEADERS = [
      'lead_id', 'company_name', 'category', 'sub_category',
      'source', 'stage', 'owner', 'estimated_value', 'created_date',
    ];

    // Map lead fields to export columns
    const mapLead = (lead) => ({
      lead_id:        lead.lead_id       || '',
      company_name:   lead.company_name  || '',
      category:       lead.category      || '',
      sub_category:   lead.sub_category  || '',
      source:         lead.lead_source   || '',
      stage:          lead.stage         || '',
      owner:          lead.assigned_to_name || lead.assigned_to || '',
      estimated_value: lead.estimated_value != null ? String(lead.estimated_value) : '',
      created_date:   lead.created_at ? String(lead.created_at).slice(0, 10) : '',
    });

    // STORY-6.3.1 MD test b-004: Zero-record export returns 404
    if (recordCount === 0) {
      return res.status(404).json({ success: false, message: 'No leads found for the given filters' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (format === 'csv') {
      const csvRows = [EXPORT_HEADERS.join(',')];
      for (const lead of leads) {
        const mapped = mapLead(lead);
        csvRows.push(
          EXPORT_HEADERS.map((h) => {
            const val = String(mapped[h] || '');
            return `"${val.replace(/"/g, '""')}"`;
          }).join(',')
        );
      }
      const csv = csvRows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="leads-export-${timestamp}.csv"`);
      res.setHeader('X-Record-Count', String(recordCount));
      res.setHeader('X-Audit-Log-Id', String(auditId));
      return res.status(200).send(csv);
    }

    if (format === 'excel') {
      const XLSX = require('xlsx');
      const rows = leads.map(lead => {
        const mapped = mapLead(lead);
        return EXPORT_HEADERS.map(h => mapped[h] || '');
      });
      const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="leads-export-${timestamp}.xlsx"`);
      res.setHeader('X-Record-Count', String(recordCount));
      res.setHeader('X-Audit-Log-Id', String(auditId));
      return res.status(200).send(buf);
    }
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
          COUNT(*) FILTER (WHERE l.lead_status = 'Won') AS won,
          COUNT(*) FILTER (WHERE l.lead_status = 'Lost') AS lost,
          CASE WHEN COUNT(*) > 0
            THEN ROUND(100.0 * COUNT(*) FILTER (WHERE l.lead_status = 'Won') / COUNT(*), 2) || '%'
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

      return res.json({ success: true, message: 'Report data fetched successfully', data: dbResult.rows });
    }

    if (report === 'category-breakdown') {
      const filter = buildAdminFilter(req, 'l.');
      const dbResult = await query(`
        SELECT
          c.category_name,
          COUNT(*) AS lead_count,
          COUNT(*) FILTER (WHERE l.lead_status = 'Won') AS won,
          COUNT(*) FILTER (WHERE l.lead_status = 'Lost') AS lost,
          COUNT(*) FILTER (WHERE l.stage != 'Closed') AS active
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

      return res.json({ success: true, message: 'Report data fetched successfully', data: dbResult.rows });
    }

    res.status(400).json({ success: false, message: 'Invalid report type' });
  } catch (error) {
    next(error);
  }
};


// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// STORY-4.2.1 | API-6
// GET /admin/dashboard/at-risk
// Returns leads overdue >= overdue_days (default 3) calendar days.
// Admin-only. Sorted descending by days_overdue.
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
exports.getAtRiskLeads = async (req, res, next) => {
  try {
    const { overdue_days, from, to } = req.query;

    // Validate overdue_days ΓÇö must be parseable as a positive integer
    if (overdue_days !== undefined) {
      const parsed = parseInt(overdue_days, 10);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return res.status(400).json({ success: false, message: 'overdue_days must be a positive integer' });
      }
    }

    const raw = parseInt(overdue_days, 10);
    const threshold = Number.isInteger(raw) && raw > 0 ? raw : 3;

    // Date conditions
    const dateConditions = [];
    const thresholdValues = [threshold];
    let idx = 2;
    if (from && DATE_REGEX_ADMIN.test(from)) { dateConditions.push(`l.created_at::date >= $${idx++}::date`); thresholdValues.push(from); }
    if (to   && DATE_REGEX_ADMIN.test(to))   { dateConditions.push(`l.created_at::date <= $${idx++}::date`); thresholdValues.push(to); }
    const dateWhere = dateConditions.length ? ' AND ' + dateConditions.join(' AND ') : '';

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
         AND l.stage != 'Closed'
         AND (CURRENT_DATE - DATE(l.next_followup_date)) >= $1
         AND l.deleted_at IS NULL
         ${dateWhere}
       ORDER BY days_overdue DESC`,
      thresholdValues
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
         AND l.stage != 'Closed'
         AND (CURRENT_DATE - DATE(l.next_followup_date)) >= $1
         AND l.deleted_at IS NULL
         ${dateWhere}
       GROUP BY u.id, u.name
       ORDER BY oldest_overdue_days DESC`,
      thresholdValues
    );

    const leads = leadsResult.rows.map(row => ({
      id: row.id,
      lead_id: row.lead_id,
      company_name: row.company_name,
      assigned_to: row.assigned_to,
      days_overdue: row.days_overdue,
    }));

    const breakdown = breakdownResult.rows.map(row => ({
      user_id: row.user_id,
      user_name: row.user_name,
      at_risk_count: row.at_risk_count,
      oldest_overdue_days: row.oldest_overdue_days,
    }));

    return res.json({
      success: true,
      message: 'At-risk leads fetched successfully',
      data: leads,
      total_at_risk: leads.length,
      breakdown: breakdown,
      // For backward compatibility:
      leads: leads,
    });
  } catch (error) {
    next(error);
  }
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// STORY-4.2.1 | API-4
// POST /admin/reminders/send-daily
// Idempotent cron trigger: creates in-app notifications for leads
// due on the given date that have not been notified yet.
// Admin-only.
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const YYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;

exports.sendDailyReminders = async (req, res, next) => {
  try {
    const { date } = req.body;

    if (!date || !YYYYMMDD.test(date) || isNaN(new Date(date).getTime())) {
      return res.status(400).json({ success: false, message: 'Validation failed' });
    }

    // Find active leads due on date that are NOT yet notified today (idempotency)
    const leadsResult = await query(
      `SELECT l.id AS lead_id, l.company_name, l.priority, l.assigned_to AS user_id, u.email, u.name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE DATE(l.next_followup_date) = $1
         AND l.stage != 'Closed'
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
        success: true,
        message: 'Daily reminders processed successfully',
        reminders_sent: 0,
        breakdown: [],
        data: { reminders_sent: 0, breakdown: [] }
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
      success: true,
      message: 'Daily reminders processed successfully',
      reminders_sent: due.length,
      breakdown: Object.values(map),
      data: { reminders_sent: due.length, breakdown: Object.values(map) }
    });
  } catch (error) {
    next(error);
  }
};

exports.reindexLeads = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT l.*, u.name as assigned_to_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.is_deleted = false OR l.is_deleted IS NULL`
    );
    const leads = result.rows;
    if (!leads.length) {
      return res.json(wrapSuccess('No leads found to index.', { count: 0 }));
    }
    await algolia.indexAllLeads(leads);
    return res.json(wrapSuccess(`Re-indexed ${leads.length} leads to Algolia.`, { count: leads.length }));
  } catch (error) {
    next(error);
  }
};

exports.testEmail = async (req, res, next) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !to.trim()) {
      return res.status(400).json({ success: false, message: '"to" email address is required.' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: '"subject" is required.' });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPort = process.env.SMTP_PORT;

    if (!smtpHost || !smtpUser) {
      return res.status(503).json(wrapError('SMTP is not configured. Set SMTP_HOST and SMTP_USER in your .env file.'));
    }

    const body = message || `This is a test email from your CRM system.\n\nSMTP Configuration:\n- Host: ${smtpHost}\n- Port: ${smtpPort}\n- User: ${smtpUser}\n\nIf you received this email, your SMTP is working correctly!`;

    await sendEmail({
      to: to.trim(),
      subject: subject.trim(),
      text: body,
      html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
    });

    return res.json({
      success: true,
      message: `Test email sent successfully to ${to}`,
      data: {
        smtp_configured: true,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        sent_from: process.env.SMTP_FROM_EMAIL || smtpUser,
        sent_to: to,
      },
    });
  } catch (error) {
    next(error);
  }
};
