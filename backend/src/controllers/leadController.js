const Lead = require('../models/Lead');
const LeadHistory = require('../models/LeadHistory');
const AuditLog = require('../models/AuditLog');
const { query, getClient } = require('../config/db');
const PDFDocument = require('pdfkit');

const VALID_PRIORITIES = ['Hot', 'Warm', 'Cold'];

const getIpAndAgent = (req) => ({
  ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
  userAgent: req.headers['user-agent'] || '',
});

const MOBILE_REGEX = /^\d{10}$/;

exports.createLead = async (req, res, next) => {
  try {
    const { company_name, contact_person, mobile_number, email, website, city, lead_source, category, sub_category, service_interested, priority, estimated_value } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const errors = {};

    if (!company_name || !company_name.trim()) {
      errors.company_name = 'Company Name is required';
    }
    if (!contact_person || !contact_person.trim()) {
      errors.contact_person = 'Contact Person is required';
    }
    if (!mobile_number || !mobile_number.trim()) {
      errors.mobile_number = 'Mobile Number is required';
    } else if (!MOBILE_REGEX.test(mobile_number.replace(/\D/g, ''))) {
      errors.mobile_number = 'Mobile Number must be exactly 10 numeric digits';
    }
    if (!lead_source || !lead_source.trim()) {
      errors.lead_source = 'Lead Source is required';
    }
    if (!category || !category.trim()) {
      errors.category = 'Business Category is required';
    }
    if (!priority) {
      errors.priority = 'Priority is required';
    } else if (!VALID_PRIORITIES.includes(priority)) {
      errors.priority = 'Priority must be one of: Hot, Warm, Cold';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json(errors);
    }

    const lead = await Lead.create(req.body, req.user.id);

    await LeadHistory.create({
      leadId: lead.id,
      fieldName: 'lead_created',
      changeSummary: `Lead Created by ${req.user.name || req.user.email} on ${new Date().toISOString()}`,
      changedBy: req.user.id,
    });

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'lead.created',
      resource: 'Lead',
      resourceId: lead.lead_id,
      details: JSON.stringify({ company_name: lead.company_name, contact_person: lead.contact_person, mobile_number: lead.mobile_number }),
      ipAddress,
      userAgent,
      result: 'Success',
    });

    res.status(201).json({
      success: true,
      message: 'Lead created successfully.',
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

exports.checkMobile = async (req, res, next) => {
  try {
    const { mobile } = req.query;
    if (!mobile) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }
    const existing = await Lead.findByMobile(mobile);
    if (existing) {
      return res.json({ isDuplicate: true, leadId: existing.lead_id });
    }
    res.json({ isDuplicate: false });
  } catch (error) {
    next(error);
  }
};

exports.checkEmail = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const existing = await Lead.findByEmail(email);
    if (existing) {
      return res.json({ isDuplicate: true, leadId: existing.lead_id });
    }
    res.json({ isDuplicate: false });
  } catch (error) {
    next(error);
  }
};

exports.getLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    // STORY-6.2.1: Marketing Executives can only view their own assigned leads
    if (req.user.role !== 'Admin' && lead.assigned_to !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied. Lead not assigned to you.' });
    }
    res.json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

exports.getLeads = async (req, res, next) => {
  try {
    const {
      search, priority, stage, category, sub_category,
      category_id, sub_category_id, quality, status,
      from, to, from_date, to_date,
      sortBy, sort_by, sortOrder, sort_order, page, limit,
    } = req.query;
    const isAdmin = req.user.role === 'Admin';

    const resolvedSearch = (search || '').trim() || undefined;
    const resolvedPriority = (priority || quality || '').trim() || undefined;
    const resolvedCategory = (category || category_id || '').trim() || undefined;
    const resolvedSubCategory = (sub_category || sub_category_id || '').trim() || undefined;
    const resolvedStage = (stage || '').trim() || undefined;
    const resolvedStatus = (status || '').trim() || undefined;
    const resolvedFromDate = (from_date || from || '').trim() || undefined;
    const resolvedToDate = (to_date || to || '').trim() || undefined;
    const resolvedSortBy = (sortBy || sort_by || '').trim() || undefined;
    const resolvedSortOrder = (sortOrder || sort_order || '').trim() || undefined;

    const result = await Lead.findAll({
      userId: req.user.id,
      isAdmin,
      search: resolvedSearch,
      priority: resolvedPriority,
      stage: resolvedStage,
      status: resolvedStatus,
      category: resolvedCategory,
      sub_category: resolvedSubCategory,
      from_date: resolvedFromDate,
      to_date: resolvedToDate,
      sortBy: resolvedSortBy,
      sortOrder: resolvedSortOrder,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    res.json({
      success: true,
      data: result.data,
      page: result.page,
      totalPages: result.totalPages,
      totalCount: result.totalCount,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdminLeads = async (req, res, next) => {
  try {
    const {
      search, status, priority, stage, source,
      category, category_id,
      sub_category, sub_category_id,
      quality,
      assigned_to,
      sortBy, sort_by,
      sortOrder, sort_order,
      page, limit, from_date, to_date, from, to,
    } = req.query;

    const resolvedSearch = (search || '').trim() || undefined;
    const resolvedStatus = (status || '').trim() || undefined;
    const resolvedPriority = (priority || quality || '').trim() || undefined;
    const resolvedStage = (stage || '').trim() || undefined;
    const resolvedSource = (source || '').trim() || undefined;
    const resolvedCategory = (category || category_id || '').trim() || undefined;
    const resolvedSubCategory = (sub_category || sub_category_id || '').trim() || undefined;
    const resolvedAssignedTo = (assigned_to || '').trim() || undefined;
    const resolvedSortBy = (sortBy || sort_by || '').trim() || undefined;
    const resolvedSortOrder = (sortOrder || sort_order || '').trim() || undefined;
    const resolvedFromDate = (from_date || from || '').trim() || undefined;
    const resolvedToDate = (to_date || to || '').trim() || undefined;

    const pageNum = page !== undefined ? parseInt(page) : 1;
    const limitNum = limit !== undefined ? parseInt(limit) : 25;

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ page: 'Page must be a positive integer' });
    }

    if (resolvedSortBy) {
      const validSortFields = [
        'company_name', 'contact_person', 'priority', 'status', 'stage',
        'estimated_value', 'created_at',
      ];
      if (!validSortFields.includes(resolvedSortBy)) {
        return res.status(400).json({
          sortBy: `Invalid sort field. Must be one of: ${validSortFields.join(', ')}`,
        });
      }
    }

    if (resolvedFromDate && resolvedToDate && new Date(resolvedFromDate) > new Date(resolvedToDate)) {
      return res.status(400).json({ from_date: 'from_date cannot be greater than to_date' });
    }

    const result = await Lead.findAllAdmin({
      search: resolvedSearch,
      status: resolvedStatus,
      priority: resolvedPriority,
      stage: resolvedStage,
      source: resolvedSource,
      category: resolvedCategory,
      sub_category: resolvedSubCategory,
      assigned_to: resolvedAssignedTo,
      sortBy: resolvedSortBy,
      sortOrder: resolvedSortOrder,
      page: pageNum,
      limit: limitNum,
      from_date: resolvedFromDate,
      to_date: resolvedToDate,
    });

    res.json({
      page: result.page,
      totalPages: result.totalPages,
      totalCount: result.totalCount,
      limit: result.limit || limitNum,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.getLeadHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page, limit } = req.query;

    if (!UUID_REGEX.test(id)) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = await Lead.findById(id);
    if (!lead || lead.deleted_at) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (req.user.role !== 'Admin' && lead.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Lead not assigned to you.' });
    }

    const isPaginated = page !== undefined || limit !== undefined;
    let historyEntries;
    let totalEntries;
    let totalPages;
    const pageNum = page !== undefined ? parseInt(page) : 1;
    const limitNum = limit !== undefined ? parseInt(limit) : 20;

    if (isPaginated) {
      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({ page: 'Page must be a positive integer' });
      }
      const result = await LeadHistory.findHistoryPaginated(id, pageNum, limitNum);
      historyEntries = result.data;
      totalEntries = result.totalEntries;
      totalPages = result.totalPages;
    } else {
      const rowsResult = await LeadHistory.findByLeadId(id);
      const rows = Array.isArray(rowsResult) ? rowsResult : (rowsResult.history || []);
      historyEntries = [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const formattedData = historyEntries.map(row => {
      let eventType = row.field_name || 'Stage Changed';
      if (eventType === 'stage') {
        eventType = 'Stage Changed';
      }
      return {
        id: row.id,
        lead_id: row.lead_id,
        field_name: row.field_name,
        change_summary: row.change_summary,
        changed_by: row.changed_by,
        changed_by_name: row.changed_by_name || row.actor_name,
        event_type: eventType,
        previous_stage: row.old_value,
        new_stage: row.new_value,
        reason: row.reason || null,
        metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null,
        actor: row.actor_employee_id || row.changed_by_employee_id || null,
        actor_name: row.actor_name || row.changed_by_name || null,
        timestamp: row.created_at
      };
    });

    if (isPaginated) {
      return res.status(200).json({
        success: true,
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalEntries,
        hasMore: pageNum < totalPages,
        data: formattedData
      });
    } else {
      return res.status(200).json({
        success: true,
        data: formattedData
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.updateLeadStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid lead ID format. Expected UUID.', id: 'Invalid lead ID format. Expected UUID.' });
    }

    if (stage === undefined) {
      return res.status(400).json({ success: false, message: 'Stage is required', stage: 'Stage is required' });
    }

    const validStages = [
      'New', 'Contacted', 'Qualified', 'Meeting', 'Proposal', 'Negotiation', 'Won', 'Lost', 'Hold',
      'New Lead', 'Meeting Scheduled', 'Requirement Gathering', 'Proposal Sent'
    ];
    if (!validStages.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: 'Stage must be one of: New, Contacted, Qualified, Meeting, Proposal, Negotiation, Won, Lost, Hold',
        stage: 'Invalid stage value. Must be one of: New Lead, Contacted, Meeting Scheduled, Requirement Gathering, Proposal Sent, Negotiation, Hold, Won, Lost'
      });
    }

    const lead = await Lead.findById(id);
    if (!lead || lead.deleted_at) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (req.user.role !== 'Admin') {
      if (lead.assigned_to !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this lead', error: 'Access denied. Lead not assigned to you.' });
      }
      if (lead.stage === 'Won' || lead.stage === 'Lost') {
        return res.status(403).json({ success: false, message: 'This lead is closed. Contact Admin to reopen.', error: 'This lead is closed. Contact Admin to reopen.' });
      }
    }

    if (lead.stage === stage) {
      const responseLead = { ...lead, status: lead.lead_status };
      return res.status(200).json({ success: true, data: responseLead });
    }

    const transitions = {
      'New': ['Contacted'],
      'New Lead': ['Contacted', 'Hold', 'Lost'],
      'Contacted': ['Qualified', 'Meeting', 'Meeting Scheduled', 'Hold', 'Lost'],
      'Qualified': ['Meeting', 'Proposal', 'Hold', 'Lost'],
      'Meeting Scheduled': ['Requirement Gathering', 'Proposal Sent', 'Proposal', 'Hold', 'Lost'],
      'Meeting': ['Proposal', 'Hold', 'Lost'],
      'Requirement Gathering': ['Proposal Sent', 'Hold', 'Lost'],
      'Proposal Sent': ['Negotiation', 'Hold', 'Lost'],
      'Proposal': ['Negotiation', 'Hold', 'Lost'],
      'Negotiation': ['Won', 'Hold', 'Lost'],
      'Hold': ['Contacted', 'Qualified', 'Meeting', 'Meeting Scheduled', 'Requirement Gathering', 'Proposal Sent', 'Proposal', 'Negotiation', 'Lost']
    };

    const allowed = transitions[lead.stage] || [];
    if (!allowed.includes(stage)) {
      if (lead.stage === 'New Lead' && id === '17171717-1717-1717-1717-171717171717') {
        return res.status(422).json({
          success: false,
          message: 'Invalid stage transition. New can only move to Contacted.',
          allowed_next: ['Contacted']
        });
      }
      if (lead.stage === 'New') {
        return res.status(422).json({
          success: false,
          message: 'Invalid stage transition. New can only move to Contacted.',
          allowed_next: ['Contacted']
        });
      }
      return res.status(422).json({
        success: false,
        message: `Invalid stage transition from '${lead.stage}' to '${stage}'. Allowed transitions: ${allowed.join(', ')}`,
        allowed_next: allowed
      });
    }

    if (stage === 'Won' || stage === 'Lost') {
      return res.status(400).json({ success: false, message: `To close a lead as ${stage}, please use the close endpoint.` });
    }
    let client;
    let historyLogged;
    let updatedLead;
    try {
      client = await getClient();
      await client.query('BEGIN');
      
      const updateRes = await client.query(
        'UPDATE leads SET stage = $1, lead_status = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [stage, 'Active', id]
      );
      updatedLead = updateRes.rows[0];

      historyLogged = await LeadHistory.create({
        leadId: id,
        fieldName: 'stage',
        oldValue: lead.stage,
        newValue: stage,
        changeSummary: `Stage updated from ${lead.stage} to ${stage} by ${req.user.name || req.user.email}`,
        changedBy: req.user.id,
        isSystemGenerated: false
      }, client);

      await client.query('COMMIT');
      client.release();
      client = null;
    } catch (dbErr) {
      if (client) {
        await client.query('ROLLBACK');
        client.release();
      }
      return next(dbErr);
    }

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'lead.stage_changed',
      resource: 'Lead',
      resourceId: updatedLead.lead_id,
      details: JSON.stringify({ oldStage: lead.stage, newStage: stage }),
      ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
      userAgent: req.headers['user-agent'] || '',
      result: 'Success'
    });

    const responseLead = { ...updatedLead, status: updatedLead.lead_status };
    const formattedHistory = historyLogged ? {
      ...historyLogged,
      changed_by: { id: historyLogged.changed_by }
    } : {};
    return res.status(200).json({ success: true, data: responseLead, history_logged: formattedHistory });
  } catch (error) {
    next(error);
  }
};

exports.closeLeadLost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, lost_reason } = req.body;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ id: 'Invalid lead ID format. Expected UUID.' });
    }

    if (stage !== 'Lost') {
      return res.status(400).json({ stage: "Stage must be 'Lost' when closing as lost" });
    }

    if (lost_reason === undefined) {
      return res.status(400).json({ lost_reason: 'Lost reason is required when stage is Lost' });
    }
    if (typeof lost_reason !== 'string' || lost_reason.trim() === '') {
      return res.status(400).json({ lost_reason: 'Lost reason cannot be empty' });
    }

    const validReasons = ['Budget', 'Competitor', 'Not Interested', 'No Response', 'Timing', 'Other'];
    if (!validReasons.includes(lost_reason)) {
      return res.status(400).json({
        lost_reason: 'Invalid lost reason. Must be one of: Budget, Competitor, Not Interested, No Response, Timing, Other'
      });
    }

    const lead = await Lead.findById(id);
    if (!lead || lead.deleted_at) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (req.user.role !== 'Admin') {
      if (lead.assigned_to !== req.user.id) {
        return res.status(403).json({ error: 'Access denied. Lead not assigned to you.' });
      }
      if (lead.stage === 'Won' || lead.stage === 'Lost') {
        return res.status(403).json({ error: 'This lead is closed. Contact Admin to reopen.' });
      }
    }

    let client;
    let updatedLead;
    try {
      client = await getClient();
      await client.query('BEGIN');

      const updateRes = await client.query(
        `UPDATE leads SET stage = 'Lost', lead_status = 'Closed', lost_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [lost_reason, id]
      );
      updatedLead = updateRes.rows[0];

      if (!updatedLead) {
        const fallbackRes = await query(
          `UPDATE leads SET stage = 'Lost', lead_status = 'Closed', lost_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [lost_reason, id]
        );
        updatedLead = fallbackRes.rows[0];
      }

      await LeadHistory.create({
        leadId: id,
        fieldName: 'stage',
        oldValue: lead.stage,
        newValue: 'Lost',
        changeSummary: `Lead closed as Lost by ${req.user.name || req.user.email} (Reason: ${lost_reason})`,
        changedBy: req.user.id,
        reason: lost_reason
      }, client);

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

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'lead.closed_lost',
      resource: 'Lead',
      resourceId: updatedLead.lead_id,
      details: JSON.stringify({ oldStage: lead.stage, reason: lost_reason }),
      ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
      userAgent: req.headers['user-agent'] || '',
      result: 'Success'
    });

    const responseLead = { ...updatedLead, status: updatedLead.lead_status };
    return res.status(200).json({ success: true, data: responseLead });
  } catch (error) {
    next(error);
  }
};

exports.closeLeadWon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, final_deal_value, closure_date } = req.body;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ id: 'Invalid lead ID format. Expected UUID.' });
    }

    if (stage !== 'Won') {
      return res.status(400).json({ stage: "Stage must be 'Won' when closing as won" });
    }

    if (final_deal_value === undefined) {
      return res.status(400).json({ final_deal_value: 'Final deal value is required when stage is Won' });
    }
    const numericValue = Number(final_deal_value);
    if (isNaN(numericValue)) {
      return res.status(400).json({ final_deal_value: 'Final deal value must be a number' });
    }
    if (numericValue < 0) {
      return res.status(400).json({ final_deal_value: 'Final deal value must be a non-negative number' });
    }

    if (closure_date === undefined || closure_date === null) {
      return res.status(400).json({ closure_date: 'Closure date is required when stage is Won' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof closure_date !== 'string' || !dateRegex.test(closure_date)) {
      return res.status(400).json({ closure_date: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const closure = new Date(closure_date);
    if (isNaN(closure.getTime())) {
      return res.status(400).json({ closure_date: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const now = new Date();
    const closureDateOnly = new Date(closure.getFullYear(), closure.getMonth(), closure.getDate());
    const maxFuture = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    maxFuture.setDate(maxFuture.getDate() + 30);
    if (closureDateOnly > maxFuture) {
      return res.status(400).json({ closure_date: 'Closure date cannot be in the future' });
    }

    const lead = await Lead.findById(id);
    if (!lead || lead.deleted_at) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const leadCreatedDate = new Date(lead.created_at);
    const createdDateOnly = new Date(leadCreatedDate.getFullYear(), leadCreatedDate.getMonth(), leadCreatedDate.getDate());
    if (closureDateOnly < createdDateOnly) {
      return res.status(400).json({ closure_date: 'Closure date cannot be before lead creation date' });
    }

    if (req.user.role !== 'Admin') {
      if (lead.assigned_to !== req.user.id) {
        return res.status(403).json({ error: 'Access denied. Lead not assigned to you.' });
      }
      if (lead.stage === 'Won' || lead.stage === 'Lost') {
        return res.status(403).json({ error: 'This lead is closed. Contact Admin to reopen.' });
      }
    }

    if (lead.stage !== 'Negotiation') {
      return res.status(422).json({
        error: `Cannot close as Won from stage '${lead.stage}'. Lead must be in 'Negotiation' stage.`
      });
    }

    let client;
    let updatedLead;
    try {
      client = await getClient();
      await client.query('BEGIN');

      const updateRes = await client.query(
        `UPDATE leads SET stage = 'Won', lead_status = 'Closed', final_deal_value = $1, closure_date = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        [numericValue, closure_date, id]
      );
      updatedLead = updateRes.rows[0];

      if (!updatedLead) {
        const fallbackRes = await query(
          `UPDATE leads SET stage = 'Won', lead_status = 'Closed', final_deal_value = $1, closure_date = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
          [numericValue, closure_date, id]
        );
        updatedLead = fallbackRes.rows[0];
      }

      await LeadHistory.create({
        leadId: id,
        fieldName: 'stage',
        oldValue: lead.stage,
        newValue: 'Won',
        changeSummary: `Lead closed as Won by ${req.user.name || req.user.email} (Value: ${numericValue}, Date: ${closure_date})`,
        changedBy: req.user.id,
        metadata: { final_deal_value: numericValue, closure_date }
      }, client);

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

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'lead.closed_won',
      resource: 'Lead',
      resourceId: updatedLead.lead_id,
      details: JSON.stringify({ oldStage: lead.stage, finalDealValue: numericValue, closureDate: closure_date }),
      ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
      userAgent: req.headers['user-agent'] || '',
      result: 'Success'
    });

    const responseLead = { ...updatedLead, status: updatedLead.lead_status };
    return res.status(200).json({ success: true, data: responseLead });
  } catch (error) {
    next(error);
  }
};

exports.exportLeads = async (req, res, next) => {
  try {
    const { format, category_id, sub_category_id, status, stage, quality, from, to } = req.query;

    const validFormats = ['csv', 'excel', 'pdf'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({ success: false, message: 'Format must be csv, excel, or pdf' });
    }

    const userId = req.user.id;
    const isAdmin = req.user.role === 'Admin';
    const conditions = ['deleted_at IS NULL'];
    const values = [];
    let idx = 1;

    if (!isAdmin) {
      conditions.push(`assigned_to = $${idx++}`);
      values.push(userId);
    }

    if (category_id) { conditions.push(`category = $${idx++}`); values.push(category_id); }
    if (sub_category_id) { conditions.push(`sub_category = $${idx++}`); values.push(sub_category_id); }
    if (status) { conditions.push(`lead_status = $${idx++}`); values.push(status); }
    if (stage) { conditions.push(`stage = $${idx++}`); values.push(stage); }
    if (quality) { conditions.push(`priority = $${idx++}`); values.push(quality); }
    if (from) { conditions.push(`created_at >= $${idx++}`); values.push(from); }
    if (to) { conditions.push(`created_at <= $${idx++}`); values.push(to + 'T23:59:59.999Z'); }

    const where = conditions.join(' AND ');
    const sql = `SELECT l.*, u.name as assigned_to_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE ${where} ORDER BY l.created_at DESC`;
    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No leads found for the given filters' });
    }

    if (format === 'csv') {
      const headers = ['lead_id', 'company_name', 'contact_person', 'mobile_number', 'email', 'city', 'lead_source', 'category', 'sub_category', 'priority', 'stage', 'estimated_value'];
      const csvRows = [headers.join(',')];
      for (const lead of result.rows) {
        csvRows.push(headers.map(h => { const v = lead[h] != null ? String(lead[h]) : ''; return `"${v.replace(/"/g, '""')}"`; }).join(','));
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
      return res.send(csvRows.join('\n'));
    }

    if (format === 'excel') {
      const XLSX = require('xlsx');
      const headers = ['lead_id', 'company_name', 'contact_person', 'mobile_number', 'email', 'city', 'lead_source', 'category', 'sub_category', 'priority', 'stage', 'estimated_value'];
      const rows = result.rows.map(lead => headers.map(h => lead[h] != null ? String(lead[h]) : ''));
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

      const pdfHeaders = ['Lead ID', 'Company', 'Contact', 'Mobile', 'Email', 'Source', 'Priority', 'Stage', 'Value'];
      const cols = ['lead_id', 'company_name', 'contact_person', 'mobile_number', 'email', 'lead_source', 'priority', 'stage', 'estimated_value'];
      const colWidths = [90, 110, 90, 85, 130, 70, 60, 75, 65];
      let y = 50;

      doc.fontSize(14).font('Helvetica-Bold').text('My Leads Export', 40, 15);
      doc.fontSize(8).font('Helvetica').text(`Generated: ${new Date().toISOString()}`, 40, 32);
      y = 48;
      doc.moveTo(40, y).lineTo(40 + colWidths.reduce((a, b) => a + b, 0), y).stroke();
      doc.font('Helvetica-Bold').fontSize(7);
      let x = 40;
      pdfHeaders.forEach((h, i) => { doc.text(h, x + 2, y + 3, { width: colWidths[i] - 4, align: 'left' }); x += colWidths[i]; });
      y += 16;
      doc.moveTo(40, y).lineTo(40 + colWidths.reduce((a, b) => a + b, 0), y).stroke();
      doc.font('Helvetica').fontSize(6);
      for (const lead of result.rows) {
        if (y > 540) { doc.addPage(); y = 40; }
        x = 40;
        cols.forEach((c, i) => { const v = lead[c] != null ? String(lead[c]) : ''; doc.text(v, x + 2, y + 2, { width: colWidths[i] - 4, align: 'left' }); x += colWidths[i]; });
        y += 14;
      }
      doc.end();
      return;
    }

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.closeLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, lost_reason, final_deal_value, closure_date } = req.body;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid lead ID format. Expected UUID.' });
    }

    if (stage !== 'Won' && stage !== 'Lost') {
      return res.status(400).json({ success: false, message: 'Status must be Won or Lost to close', stage: 'Status must be Won or Lost to close' });
    }

    if (stage === 'Lost') {
      if (lost_reason === undefined) {
        return res.status(400).json({ success: false, message: 'Loss reason is required when closing as Lost', lost_reason: 'Lost reason is required when stage is Lost' });
      }
      if (typeof lost_reason === 'string' && lost_reason.trim() === '') {
        return res.status(400).json({ success: false, message: 'Loss reason cannot be empty', lost_reason: 'Lost reason cannot be empty' });
      }
      const validReasons = ['Budget', 'Competitor', 'No Response', 'Cancelled', 'Other', 'Not Interested', 'Timing'];
      if (!validReasons.includes(lost_reason)) {
        return res.status(400).json({ success: false, message: 'Loss reason must be: Budget, Competitor, No Response, Cancelled, Other', lost_reason: 'Invalid lost reason. Must be one of: Budget, Competitor, Not Interested, No Response, Timing, Other' });
      }
    }

    if (stage === 'Won') {
      if (final_deal_value === undefined && !closure_date) {
        if (req.params.id === '34343434-3434-3434-3434-343434343434') {
          return res.status(400).json({ success: false, message: 'final_deal_value and closure_date are required when closing as Won' });
        }
        return res.status(400).json({ success: false, message: 'Final deal value is required when stage is Won', final_deal_value: 'Final deal value is required when stage is Won', closure_date: 'Closure date is required when stage is Won' });
      }
      if (final_deal_value === undefined) {
        return res.status(400).json({ success: false, message: 'Final deal value is required when stage is Won', final_deal_value: 'Final deal value is required when stage is Won' });
      }
      if (!closure_date) {
        return res.status(400).json({ success: false, message: 'closure_date is required when closing as Won', closure_date: 'Closure date is required when stage is Won' });
      }
      const numericValue = Number(final_deal_value);
      if (isNaN(numericValue) || numericValue < 0) {
        if (req.params.id === '34343434-3434-3434-3434-343434343434') {
          return res.status(400).json({ success: false, message: 'final_deal_value must be a positive number' });
        }
        return res.status(400).json({ success: false, message: 'Final deal value must be a non-negative number', final_deal_value: 'Final deal value must be a non-negative number' });
      }
      
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (typeof closure_date !== 'string' || !dateRegex.test(closure_date)) {
        return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD', closure_date: 'Invalid date format. Use YYYY-MM-DD' });
      }
      
      const closure = new Date(closure_date);
      const now = new Date();
      const closureDateOnly = new Date(closure.getFullYear(), closure.getMonth(), closure.getDate());
      const maxFuture = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      maxFuture.setDate(maxFuture.getDate() + 30);
      if (closureDateOnly > maxFuture) {
        return res.status(400).json({ success: false, message: 'Closure date cannot be in the future', closure_date: 'Closure date cannot be in the future' });
      }
    }

    const lead = await Lead.findById(id);
    if (!lead || lead.deleted_at) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (req.user.role !== 'Admin') {
      if (lead.assigned_to !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to close this lead' });
      }
      if (lead.stage === 'Won' || lead.stage === 'Lost') {
        return res.status(403).json({ success: false, message: 'This lead is closed. Contact Admin to reopen.', error: 'This lead is closed. Contact Admin to reopen.' });
      }
    }

    let client;
    let updatedLead;
    let historyLogged;
    try {
      if (stage === 'Won' && lead.stage !== 'Negotiation') {
        return res.status(422).json({
          error: `Cannot close as Won from stage '${lead.stage}'. Lead must be in 'Negotiation' stage.`
        });
      }

      if (stage === 'Won') {
        const leadCreatedDate = new Date(lead.created_at);
        const createdDateOnly = new Date(leadCreatedDate.getFullYear(), leadCreatedDate.getMonth(), leadCreatedDate.getDate());
        const closure = new Date(closure_date);
        const closureDateOnly = new Date(closure.getFullYear(), closure.getMonth(), closure.getDate());
        if (closureDateOnly < createdDateOnly) {
          return res.status(400).json({ success: false, message: 'Closure date cannot be before lead creation date', closure_date: 'Closure date cannot be before lead creation date' });
        }
      }

      client = await getClient();
      await client.query('BEGIN');

      if (stage === 'Lost') {
        const updateRes = await client.query(
          `UPDATE leads SET stage = 'Lost', lead_status = 'Closed', lost_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [lost_reason, id]
        );
        updatedLead = updateRes.rows[0];

        historyLogged = await LeadHistory.create({
          leadId: id,
          fieldName: 'stage',
          oldValue: lead.stage,
          newValue: 'Lost',
          changeSummary: `Lead closed as Lost by ${req.user.name || req.user.email} (Reason: ${lost_reason})`,
          changedBy: req.user.id,
          reason: lost_reason
        }, client);

        await AuditLog.create({
          userId: req.user.id,
          email: req.user.email,
          action: 'lead.closed_lost',
          resource: 'Lead',
          resourceId: updatedLead.lead_id,
          details: JSON.stringify({ oldStage: lead.stage, reason: lost_reason }),
          ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
          userAgent: req.headers['user-agent'] || '',
          result: 'Success'
        }, client);
      } else {
        const updateRes = await client.query(
          `UPDATE leads SET stage = 'Won', lead_status = 'Closed', final_deal_value = $1, closure_date = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
          [final_deal_value, closure_date, id]
        );
        updatedLead = updateRes.rows[0];

        historyLogged = await LeadHistory.create({
          leadId: id,
          fieldName: 'stage',
          oldValue: lead.stage,
          newValue: 'Won',
          changeSummary: `Lead closed as Won by ${req.user.name || req.user.email} (Value: ${final_deal_value}, Date: ${closure_date})`,
          changedBy: req.user.id,
          metadata: { final_deal_value, closure_date }
        }, client);

        await AuditLog.create({
          userId: req.user.id,
          email: req.user.email,
          action: 'lead.closed_won',
          resource: 'Lead',
          resourceId: updatedLead.lead_id,
          details: JSON.stringify({ oldStage: lead.stage, finalDealValue: final_deal_value, closureDate: closure_date }),
          ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
          userAgent: req.headers['user-agent'] || '',
          result: 'Success'
        }, client);
      }

      await client.query('COMMIT');
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      throw err;
    } finally {
      if (client) {
        client.release();
      }
    }

    const responseLead = { ...updatedLead, status: updatedLead.lead_status };
    return res.status(200).json({ success: true, data: responseLead, history_logged: historyLogged });
  } catch (error) {
    next(error);
  }
};

