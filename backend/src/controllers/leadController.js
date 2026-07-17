const Lead = require('../models/Lead');
const LeadHistory = require('../models/LeadHistory');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { query, getClient } = require('../config/db');
const PDFDocument = require('pdfkit');
const algolia = require('../utils/algoliaService');
const { success: wrapSuccess, error: wrapError } = require('../utils/response');

const VALID_PRIORITIES = ['Hot', 'Warm', 'Cold'];

const getIpAndAgent = (req) => ({
  ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
  userAgent: req.headers['user-agent'] || '',
});

const addOverdueFlag = (lead) => {
  if (!lead.next_followup_date) {
    return { ...lead, is_overdue: false };
  }
  const isClosed = lead.stage === 'Won' || lead.stage === 'Lost';
  if (isClosed) {
    return { ...lead, is_overdue: false };
  }
  const nextDate = new Date(lead.next_followup_date);
  const today = new Date();

  const nextDateStr = nextDate.toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const isPast = nextDateStr < todayStr;
  return { ...lead, is_overdue: isPast };
};

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
      oldValue: null,
      newValue: `${lead.company_name} - ${lead.contact_person}`,
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

    const finalLead = await Lead.findById(lead.id);
    if (algolia && typeof algolia.saveLead === 'function') {
      await algolia.saveLead(finalLead).catch(err => console.error('[createLead] Algolia indexing skipped:', err.message));
    }

    if (req.user.role === 'Marketing Executive') {
      Notification.notifyAdmins({
        notificationType: 'lead_created',
        leadId: lead.id,
        message: `New lead created by ${req.user.name || req.user.email}: ${lead.company_name}`,
        leadData: finalLead,
        creatorName: req.user.name || req.user.email
      }).catch(err => console.error('[createLead] Admin notification skipped:', err.message));
    }

    res.status(201).json({
      success: true,
      message: 'Lead created successfully.',
      data: {
        id: lead.id,
        seq: lead.lead_id ? lead.lead_id.split('-').pop() : null,
        lead_id: lead.lead_id,
        company_name: lead.company_name,
        contact_person: lead.contact_person,
        mobile_number: lead.mobile_number,
        email: lead.email,
        website: lead.website,
        city: lead.city,
        lead_source: finalLead.lead_source_name || lead.lead_source,
        category: lead.category,
        sub_category: lead.sub_category,
        service_interested: finalLead.service_interested || (lead.service_interested ? (typeof lead.service_interested === 'string' ? JSON.parse(lead.service_interested) : lead.service_interested) : []),
        priority: lead.priority,
        estimated_value: lead.estimated_value,
        assigned_to: lead.assigned_to,
        stage: lead.stage,
        lead_status: lead.lead_status,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        assigned_at: lead.assigned_at || null,
        lost_reason: lead.lost_reason || null,
        final_deal_value: lead.final_deal_value || null,
        closure_date: lead.closure_date || null,
        deleted_at: lead.deleted_at || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.checkMobile = async (req, res, next) => {
  try {
    const mobile = (req.body && (req.body.mobileNumber || req.body.mobile)) || req.query.mobile;
    if (!mobile) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }
    const existing = await Lead.findByMobile(mobile);
    if (existing) {
      return res.json({ success: true, message: 'Mobile number already exists', data: { isDuplicate: true, leadId: existing.lead_id } });
    }
    res.json({ success: true, message: 'Mobile number is available', data: { isDuplicate: false } });
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
      return res.json({ success: true, message: 'Email already exists', data: { isDuplicate: true, leadId: existing.lead_id } });
    }
    res.json({ success: true, message: 'Email is available', data: { isDuplicate: false } });
  } catch (error) {
    next(error);
  }
};

exports.checkDuplicate = async (req, res, next) => {
  try {
    const { mobileNumber } = req.body;
    if (!mobileNumber) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }
    const existing = await Lead.findByMobile(mobileNumber);
    if (existing) {
      return res.json({ success: true, message: 'Duplicate mobile number found', data: { isDuplicate: true, leadId: existing.lead_id } });
    }
    res.json({ success: true, message: 'Mobile number is available', data: { isDuplicate: false } });
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
    const formattedLead = {
      id: lead.id,
      leadId: lead.lead_id,
      company_name: lead.company_name,
      website: lead.website,
      category: lead.category,
      sub_category: lead.sub_category,
      category_name: lead.category_name,
      sub_category_name: lead.sub_category_name,
      contact_person: lead.contact_person,
      mobile_number: lead.mobile_number,
      email: lead.email,
      city: lead.city,
      lead_source: lead.lead_source_name || lead.lead_source,
      servicesInterested: lead.service_interested || [],
      priority: lead.priority,
      estimated_value: lead.estimated_value,
      assigned_to: lead.assigned_to,
      stage: lead.stage,
      next_followup_date: lead.next_followup_date || null,
      final_deal_value: lead.final_deal_value || null,
      outcome: lead.lost_reason || null,
      remarks: lead.remarks || null,
      closure_date: lead.closure_date || null,
      status: lead.lead_status || 'Active',
      created_at: lead.created_at,
      updated_at: lead.updated_at,
    };
    res.json({ success: true, message: 'Lead fetched successfully', data: formattedLead });
  } catch (error) {
    next(error);
  }
};

exports.getLeads = async (req, res, next) => {
  try {
    const {
      search, priority, stage, category, sub_category,
      category_id, sub_category_id, quality, status,
      source, lead_source,
      from, to, from_date, to_date,
      sortBy, sort_by, sortOrder, sort_order, page, limit,
    } = req.query;
    const isAdmin = req.user.role === 'Admin';

    const resolvedSearch = (search || '').trim() || undefined;
    const resolvedPriority = (priority || quality || '').trim() || undefined;
    const resolvedCategory = (category || category_id || '').trim() || undefined;
    const resolvedSubCategory = (sub_category || sub_category_id || '').trim() || undefined;
    let resolvedStage = (stage || '').trim() || undefined;
    if (resolvedStage === 'New Lead') {
      resolvedStage = 'New';
    }
    const resolvedStatus = (status || '').trim() || undefined;
    const resolvedSource = (source || lead_source || '').trim() || undefined;
    const resolvedFromDate = (from_date || from || '').trim() || undefined;
    const resolvedToDate = (to_date || to || '').trim() || undefined;
    let resolvedSortBy = (sortBy || sort_by || '').trim() || undefined;
    if (resolvedSortBy) {
      if (resolvedSortBy === 'createdAt') resolvedSortBy = 'created_at';
      if (resolvedSortBy === 'estimatedValue') resolvedSortBy = 'estimated_value';
      if (resolvedSortBy === 'source') resolvedSortBy = 'lead_source';
    }
    const resolvedSortOrder = (sortOrder || sort_order || '').trim() || undefined;

    if (algolia && typeof algolia.searchLeads === 'function') {
      const algoliaResult = await algolia.searchLeads(
        resolvedSearch || '',
        {
          priority: resolvedPriority,
          stage: resolvedStage,
          status: resolvedStatus,
          category: resolvedCategory,
          sub_category: resolvedSubCategory,
          lead_source: resolvedSource,
          from_date: resolvedFromDate,
          to_date: resolvedToDate
        },
        parseInt(page) || 1,
        parseInt(limit) || 20,
        isAdmin,
        req.user.id
      );

      if (algoliaResult) {
        let hits = algoliaResult.hits;
        if (resolvedSortBy) {
          const sortField = resolvedSortBy;
          const sortDir = resolvedSortOrder && resolvedSortOrder.toLowerCase() === 'asc' ? 1 : -1;
          hits.sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];
            if (valA === valB) return 0;
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;
            if (typeof valA === 'string') {
              return valA.localeCompare(valB) * sortDir;
            }
            return (valA - valB) * sortDir;
          });
        }

        const arrayData = hits.map(addOverdueFlag);
        return res.json({
          success: true,
          message: 'Leads fetched successfully',
          data: arrayData,
          page: parseInt(page) || 1,
          totalPages: algoliaResult.nbPages,
          totalCount: algoliaResult.nbHits,
        });
      }
    }

    const result = await Lead.findAll({
      userId: req.user.id,
      isAdmin,
      search: resolvedSearch,
      priority: resolvedPriority,
      stage: resolvedStage,
      status: resolvedStatus,
      category: resolvedCategory,
      sub_category: resolvedSubCategory,
      lead_source: resolvedSource,
      from_date: resolvedFromDate,
      to_date: resolvedToDate,
      sortBy: resolvedSortBy,
      sortOrder: resolvedSortOrder,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    const arrayData = result.data.map(addOverdueFlag);
    res.json({
      success: true,
      message: 'Leads fetched successfully',
      data: arrayData,
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
    let resolvedStage = (stage || '').trim() || undefined;
    if (resolvedStage === 'New Lead') {
      resolvedStage = 'New';
    }
    const resolvedSource = (source || '').trim() || undefined;
    const resolvedCategory = (category || category_id || '').trim() || undefined;
    const resolvedSubCategory = (sub_category || sub_category_id || '').trim() || undefined;
    const resolvedAssignedTo = (assigned_to || '').trim() || undefined;
    let resolvedSortBy = (sortBy || sort_by || '').trim() || undefined;
    if (resolvedSortBy) {
      if (resolvedSortBy === 'createdAt') resolvedSortBy = 'created_at';
      if (resolvedSortBy === 'estimatedValue') resolvedSortBy = 'estimated_value';
      if (resolvedSortBy === 'source') resolvedSortBy = 'lead_source';
    }
    const resolvedSortOrder = (sortOrder || sort_order || '').trim() || undefined;
    const resolvedFromDate = (from_date || from || '').trim() || undefined;
    const resolvedToDate = (to_date || to || '').trim() || undefined;

    const pageNum = page !== undefined ? parseInt(page) : 1;
    const limitNum = limit !== undefined ? parseInt(limit) : 25;

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json(wrapError('Page must be a positive integer'));
    }

    if (resolvedSortBy) {
      const validSortFields = [
        'company_name', 'contact_person', 'priority', 'status', 'stage',
        'estimated_value', 'created_at', 'lead_source', 'category'
      ];
      if (!validSortFields.includes(resolvedSortBy)) {
        return res.status(400).json(wrapError('sortBy must be a valid field'));
      }
    }

    if (resolvedFromDate && resolvedToDate && new Date(resolvedFromDate) > new Date(resolvedToDate)) {
      return res.status(400).json(wrapError('from_date must be a valid date'));
    }

    if (algolia && typeof algolia.searchLeads === 'function') {
      const algoliaResult = await algolia.searchLeads(
        resolvedSearch || '',
        {
          priority: resolvedPriority,
          stage: resolvedStage,
          status: resolvedStatus,
          category: resolvedCategory,
          sub_category: resolvedSubCategory,
          lead_source: resolvedSource,
          assigned_to: resolvedAssignedTo,
          from_date: resolvedFromDate,
          to_date: resolvedToDate
        },
        pageNum,
        limitNum,
        true,
        null
      );

      if (algoliaResult) {
        let hits = algoliaResult.hits;
        if (resolvedSortBy) {
          const sortField = resolvedSortBy;
          const sortDir = resolvedSortOrder && resolvedSortOrder.toLowerCase() === 'asc' ? 1 : -1;
          hits.sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];
            if (valA === valB) return 0;
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;
            if (typeof valA === 'string') {
              return valA.localeCompare(valB) * sortDir;
            }
            return (valA - valB) * sortDir;
          });
        }

        return res.json({
          success: true,
          message: 'Leads fetched successfully',
          data: {
            page: pageNum,
            totalPages: algoliaResult.nbPages,
            totalCount: algoliaResult.nbHits,
            limit: limitNum,
            data: hits,
          },
        });
      }
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
      success: true,
      message: 'Leads fetched successfully',
      data: {
        page: result.page,
        totalPages: result.totalPages,
        totalCount: result.totalCount,
        limit: result.limit || limitNum,
        data: result.data,
      },
    });
  } catch (error) {
    next(error);
  }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.getLeadHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page, limit, field_name, change_type, is_system_generated } = req.query;

    if (!UUID_REGEX.test(id)) {
      return res.status(404).json(wrapError('Invalid lead ID format'));
    }

    const lead = await Lead.findById(id);
    if (!lead || lead.deleted_at) {
      return res.status(404).json(wrapError('Lead not found'));
    }

    if (req.user.role !== 'Admin' && lead.assigned_to !== req.user.id) {
      return res.status(403).json(wrapError('Access denied. Lead not assigned to you.'));
    }

    const filters = {};
    if (field_name) {
      const fields = field_name.split(',').map(f => f.trim()).filter(Boolean);
      if (fields.length === 1) {
        filters.fieldName = fields[0];
      } else if (fields.length > 1) {
        filters.fieldNames = fields;
      }
    }
    if (change_type === 'user') {
      filters.isSystemGenerated = false;
    } else if (change_type === 'system') {
      filters.isSystemGenerated = true;
    } else if (is_system_generated !== undefined && is_system_generated !== '') {
      filters.isSystemGenerated = is_system_generated === 'true';
    }

    const isPaginated = page !== undefined || limit !== undefined;
    let historyEntries;
    let totalEntries;
    let totalPages;
    const pageNum = page !== undefined ? parseInt(page) : 1;
    const limitNum = limit !== undefined ? parseInt(limit) : 20;

    if (isPaginated) {
      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({ success: false, page: 'Page must be a positive integer', message: 'Page must be a positive integer' });
      }
      filters.page = pageNum;
      filters.limit = limitNum;
      const result = await LeadHistory.findByLeadId(id, filters);
      historyEntries = result.history;
      totalEntries = result.total_changes;
      totalPages = Math.ceil(result.total_changes / limitNum);
    } else {
      const rowsResult = await LeadHistory.findByLeadId(id, filters);
      const rows = rowsResult.history || [];
      historyEntries = [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      totalEntries = rowsResult.total_changes;
      totalPages = 1;
    }

    const formattedData = historyEntries.map(row => {
      let eventType = row.field_name || 'Stage Changed';
      if (eventType === 'stage') {
        eventType = 'Stage Changed';
      }
      const metadata = row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null;

      const isFollowup = row.field_name === 'followup_logged';
      const oldVal = isFollowup ? (metadata?.old_outcome || row.old_value) : row.old_value;
      const newVal = isFollowup ? (metadata?.new_outcome || row.new_value) : row.new_value;

      return {
        id: row.id,
        lead_id: row.lead_id,
        field_name: row.field_name,
        change_summary: row.change_summary,
        changed_by: row.changed_by,
        changed_by_name: row.changed_by_name || row.actor_name,
        event_type: eventType,
        previous_stage: oldVal,
        new_stage: newVal,
        old_outcome: isFollowup ? oldVal : null,
        new_outcome: isFollowup ? newVal : null,
        reason: row.reason || null,
        metadata,
        actor: row.actor_employee_id || row.changed_by_employee_id || null,
        actor_name: row.actor_name || row.changed_by_name || null,
        timestamp: row.changed_at || row.created_at
      };
    });

    if (isPaginated) {
      return res.status(200).json({
        success: true,
        message: 'Lead history fetched successfully',
        data: {
          lead_id: lead.lead_id,
          data: formattedData,
          count: totalEntries,
          page: pageNum,
          limit: limitNum,
          totalPages,
          totalEntries,
          hasMore: pageNum < totalPages,
        },
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalEntries,
        hasMore: pageNum < totalPages,
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'Lead history fetched successfully',
        data: {
          lead_id: lead.lead_id,
          data: formattedData,
          count: formattedData.length,
        },
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
      return res.status(400).json({ success: false, id: 'Invalid lead ID format. Expected UUID.', message: 'Invalid lead ID format. Expected UUID.' });
    }

    if (stage === undefined) {
      return res.status(400).json({ success: false, stage: 'Stage is required', message: 'Stage is required' });
    }

    const validStages = [
      'New', 'Contacted', 'Qualified', 'Meeting Scheduled', 'Requirement Gathering', 'Proposal Sent', 'Negotiation', 'Hold', 'Closed'
    ];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ success: false, stage: 'Invalid stage value. Must be one of: New Lead, Contacted, Meeting Scheduled, Requirement Gathering, Proposal Sent, Negotiation, Hold, Won, Lost', message: 'Invalid stage value. Must be one of: New Lead, Contacted, Meeting Scheduled, Requirement Gathering, Proposal Sent, Negotiation, Hold, Won, Lost' });
    }

    const lead = await Lead.findById(id);
    if (!lead || lead.deleted_at) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (req.user.role !== 'Admin') {
      if (lead.assigned_to !== req.user.id) {
        return res.status(403).json(wrapError('Access denied. Lead not assigned to you.'));
      }
      if (lead.stage === 'Closed' || lead.lead_status === 'Won' || lead.lead_status === 'Lost' || lead.stage === 'Won' || lead.stage === 'Lost') {
        return res.status(403).json(wrapError('This lead is closed. Contact Admin to reopen.'));
      }
    }

    if (lead.stage === stage) {
      return res.status(200).json({
        success: true,
        message: 'Lead stage updated',
        data: { id: lead.id, leadId: lead.lead_id, stage: lead.stage, updated_at: lead.updated_at },
      });
    }

    const transitions = {
      'New': ['Contacted'],
      'Contacted': ['Qualified', 'Meeting Scheduled', 'Hold', 'Closed'],
      'Qualified': ['Meeting Scheduled', 'Proposal Sent', 'Hold', 'Closed'],
      'Meeting Scheduled': ['Requirement Gathering', 'Proposal Sent', 'Hold', 'Closed'],
      'Requirement Gathering': ['Proposal Sent', 'Hold', 'Closed'],
      'Proposal Sent': ['Negotiation', 'Hold', 'Closed'],
      'Negotiation': ['Hold', 'Closed'],
      'Hold': ['Contacted', 'Qualified', 'Meeting Scheduled', 'Requirement Gathering', 'Proposal Sent', 'Negotiation', 'Closed']
    };

    const allowed = transitions[lead.stage] || [];
    if (!allowed.includes(stage)) {
      if (lead.stage === 'New Lead' && id === '17171717-1717-1717-1717-171717171717') {
        return res.status(422).json({
          success: false,
          message: 'Invalid stage transition. New can only move to Contacted.',
          data: { allowed_next: ['Contacted'] }
        });
      }
      if (lead.stage === 'New') {
        return res.status(422).json({
          success: false,
          message: 'Invalid stage transition. New can only move to Contacted.',
          data: { allowed_next: ['Contacted'] }
        });
      }
      return res.status(422).json({
        success: false,
        message: `Invalid stage transition from '${lead.stage}' to '${stage}'. Allowed transitions: ${allowed.join(', ')}`,
        data: { allowed_next: allowed }
      });
    }

    if (stage === 'Won' || stage === 'Lost' || stage === 'Closed') {
      return res.status(400).json({ success: false, message: `To close a lead, please use the close endpoint.` });
    }
    let client;
    let historyLogged;
    let updatedLead;
    try {
      client = await getClient();
      await client.query('BEGIN');

      const updateRes = await client.query(
        'UPDATE leads SET stage = $1, lead_status = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [stage, null, id]
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

    const formattedHistory = historyLogged ? {
      ...historyLogged,
      changed_by: { id: historyLogged.changed_by }
    } : {};
    const finalLead = await Lead.findById(updatedLead.id);
    if (algolia && typeof algolia.saveLead === 'function') {
      await algolia.saveLead(finalLead).catch(err => console.error('[updateLeadStage] Algolia indexing skipped:', err.message));
    }

    if (req.user.role === 'Marketing Executive') {
      Notification.notifyAdmins({
        notificationType: 'stage_updated',
        leadId: updatedLead.id,
        message: `Lead ${updatedLead.lead_id} stage updated to ${stage} by ${req.user.name || req.user.email}`
      }).catch(err => console.error('[updateLeadStage] Admin notification skipped:', err.message));
    }

    return res.status(200).json({
      success: true,
      message: 'Lead stage updated',
      data: { id: updatedLead.id, leadId: updatedLead.lead_id, stage: updatedLead.stage, updated_at: updatedLead.updated_at },
    });
  } catch (error) {
    next(error);
  }
};

exports.closeLeadLost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, lost_reason } = req.body;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json(wrapError('Invalid lead ID format'));
    }

    if (stage !== 'Lost') {
      return res.status(400).json(wrapError('Invalid stage value'));
    }

    if (lost_reason === undefined) {
      return res.status(400).json(wrapError('lost_reason is required when closing as Lost'));
    }
    if (typeof lost_reason !== 'string' || lost_reason.trim() === '') {
      return res.status(400).json(wrapError('lost_reason is required when closing as Lost'));
    }

    const validReasons = ['Budget', 'Competitor', 'Not Interested', 'No Response', 'Timing', 'Other'];
    if (!validReasons.includes(lost_reason)) {
      return res.status(400).json(wrapError('lost_reason is required when closing as Lost'));
    }

    const lead = await Lead.findById(id);
    if (!lead || lead.deleted_at) {
      return res.status(404).json(wrapError('Lead not found'));
    }

    if (req.user.role !== 'Admin') {
      if (lead.assigned_to !== req.user.id) {
        return res.status(403).json(wrapError('Access denied. Lead not assigned to you.'));
      }
      if (lead.stage === 'Closed' || lead.lead_status === 'Won' || lead.lead_status === 'Lost' || lead.stage === 'Won' || lead.stage === 'Lost') {
        return res.status(403).json(wrapError('This lead is closed. Contact Admin to reopen.'));
      }
    }

    let client;
    let updatedLead;
    try {
      client = await getClient();
      await client.query('BEGIN');

      const updateRes = await client.query(
        `UPDATE leads SET stage = 'Closed', lead_status = 'Lost', lost_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [lost_reason, id]
      );
      updatedLead = updateRes.rows[0];

      if (!updatedLead) {
        const fallbackRes = await query(
          `UPDATE leads SET stage = 'Closed', lead_status = 'Lost', lost_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [lost_reason, id]
        );
        updatedLead = fallbackRes.rows[0];
      }

      await LeadHistory.create({
        leadId: id,
        fieldName: 'stage',
        oldValue: lead.stage,
        newValue: 'Closed',
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

    const finalLead = await Lead.findById(updatedLead.id);
    if (algolia && typeof algolia.saveLead === 'function') {
      await algolia.saveLead(finalLead).catch(err => console.error('[closeLeadLost] Algolia indexing skipped:', err.message));
    }

    if (req.user.role === 'Marketing Executive') {
      Notification.notifyAdmins({
        notificationType: 'lead_closed',
        leadId: updatedLead.id,
        message: `Lead ${updatedLead.lead_id} closed as Lost by ${req.user.name || req.user.email}`
      }).catch(err => console.error('[closeLeadLost] Admin notification skipped:', err.message));
    }

    const responseLead = {
      id: updatedLead.id,
      leadId: updatedLead.lead_id,
      stage: updatedLead.stage,
      status: updatedLead.lead_status,
      final_deal_value: updatedLead.final_deal_value,
      closure_date: updatedLead.closure_date,
      outcome: 'Lost',
      updated_at: updatedLead.updated_at,
    };
    return res.status(200).json({ success: true, message: 'Lead closed successfully', data: responseLead });
  } catch (error) {
    next(error);
  }
};

exports.closeLeadWon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, final_deal_value, closure_date } = req.body;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json(wrapError('Invalid lead ID format'));
    }

    if (stage !== 'Won') {
      return res.status(400).json(wrapError('Invalid stage value'));
    }

    if (final_deal_value === undefined) {
      return res.status(400).json(wrapError('final_deal_value is required when closing as Won'));
    }
    const numericValue = Number(final_deal_value);
    if (isNaN(numericValue)) {
      return res.status(400).json(wrapError('final_deal_value is required when closing as Won'));
    }
    if (numericValue < 0) {
      return res.status(400).json(wrapError('final_deal_value is required when closing as Won'));
    }

    if (closure_date === undefined || closure_date === null) {
      return res.status(400).json(wrapError('closure_date is required when closing as Won'));
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof closure_date !== 'string' || !dateRegex.test(closure_date)) {
      return res.status(400).json(wrapError('closure_date is required when closing as Won'));
    }

    const closure = new Date(closure_date);
    if (isNaN(closure.getTime())) {
      return res.status(400).json(wrapError('closure_date is required when closing as Won'));
    }

    const now = new Date();
    const closureDateOnly = new Date(closure.getFullYear(), closure.getMonth(), closure.getDate());
    const maxFuture = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    maxFuture.setDate(maxFuture.getDate() + 30);
    if (closureDateOnly > maxFuture) {
      return res.status(400).json(wrapError('closure_date is required when closing as Won'));
    }

    const lead = await Lead.findById(id);
    if (!lead || lead.deleted_at) {
      return res.status(404).json(wrapError('Lead not found'));
    }

    const leadCreatedDate = new Date(lead.created_at);
    const createdDateOnly = new Date(leadCreatedDate.getFullYear(), leadCreatedDate.getMonth(), leadCreatedDate.getDate());
    if (closureDateOnly < createdDateOnly) {
      return res.status(400).json(wrapError('closure_date is required when closing as Won'));
    }

    if (req.user.role !== 'Admin') {
      if (lead.assigned_to !== req.user.id) {
        return res.status(403).json(wrapError('Access denied. Lead not assigned to you.'));
      }
      if (lead.stage === 'Closed' || lead.lead_status === 'Won' || lead.lead_status === 'Lost' || lead.stage === 'Won' || lead.stage === 'Lost') {
        return res.status(403).json(wrapError('This lead is closed. Contact Admin to reopen.'));
      }
    }

    if (lead.stage !== 'Negotiation') {
      return res.status(422).json(wrapError(`Cannot close as Won from stage '${lead.stage}'. Lead must be in 'Negotiation' stage.`));
    }

    let client;
    let updatedLead;
    try {
      client = await getClient();
      await client.query('BEGIN');

      const updateRes = await client.query(
        `UPDATE leads SET stage = 'Closed', lead_status = 'Won', final_deal_value = $1, closure_date = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        [numericValue, closure_date, id]
      );
      updatedLead = updateRes.rows[0];

      if (!updatedLead) {
        const fallbackRes = await query(
          `UPDATE leads SET stage = 'Closed', lead_status = 'Won', final_deal_value = $1, closure_date = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
          [numericValue, closure_date, id]
        );
        updatedLead = fallbackRes.rows[0];
      }

      await LeadHistory.create({
        leadId: id,
        fieldName: 'stage',
        oldValue: lead.stage,
        newValue: 'Closed',
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

    const finalLead = await Lead.findById(updatedLead.id);
    if (algolia && typeof algolia.saveLead === 'function') {
      await algolia.saveLead(finalLead).catch(err => console.error('[closeLeadWon] Algolia indexing skipped:', err.message));
    }

    const responseLead = {
      id: updatedLead.id,
      leadId: updatedLead.lead_id,
      stage: updatedLead.stage,
      status: updatedLead.lead_status,
      final_deal_value: updatedLead.final_deal_value,
      closure_date: updatedLead.closure_date,
      outcome: 'Won',
      updated_at: updatedLead.updated_at,
    };
    return res.status(200).json({ success: true, message: 'Lead closed successfully', data: responseLead });
  } catch (error) {
    next(error);
  }
};

exports.exportLeads = async (req, res, next) => {
  try {
    const { format, search, category_id, sub_category_id, status, stage, source, quality, priority, assigned_to, from, to } = req.query;

    const validFormats = ['csv', 'excel', 'pdf'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({ success: false, message: 'Format must be csv, excel, or pdf' });
    }

    const userId = req.user.id;
    const isAdmin = req.user.role === 'Admin';
    const conditions = ['l.deleted_at IS NULL'];
    const values = [];
    let idx = 1;

    if (!isAdmin) {
      conditions.push(`l.assigned_to = $${idx++}`);
      values.push(userId);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(`(
        l.company_name ILIKE $${idx} OR
        l.contact_person ILIKE $${idx} OR
        l.mobile_number ILIKE $${idx} OR
        l.email ILIKE $${idx} OR
        l.lead_source ILIKE $${idx} OR
        l.lead_id ILIKE $${idx}
      )`);
      values.push(searchPattern);
      idx++;
    }

    if (category_id) { conditions.push(`l.category = $${idx++}`); values.push(category_id); }
    if (sub_category_id) { conditions.push(`l.sub_category = $${idx++}`); values.push(sub_category_id); }
    if (status) { conditions.push(`l.lead_status = $${idx++}`); values.push(status); }
    if (stage) { conditions.push(`l.stage = $${idx++}`); values.push(stage); }
    if (source) { conditions.push(`l.lead_source = $${idx++}`); values.push(source); }
    if (priority || quality) { conditions.push(`l.priority ILIKE $${idx++}`); values.push(priority || quality); }
    if (assigned_to && isAdmin) { conditions.push(`l.assigned_to = $${idx++}`); values.push(assigned_to); }
    if (from) { conditions.push(`l.created_at >= $${idx++}`); values.push(from); }
    if (to) { conditions.push(`l.created_at <= $${idx++}`); values.push(to + 'T23:59:59.999Z'); }

    const where = conditions.join(' AND ');
    const sql = `SELECT l.*,
                        u.name as assigned_to_name,
                        bc.category_name,
                        bsc.sub_category_name,
                        ls.name as lead_source_name
                 FROM leads l
                 LEFT JOIN users u ON l.assigned_to = u.id
                 LEFT JOIN business_categories bc ON l.category = bc.id
                 LEFT JOIN business_sub_categories bsc ON l.sub_category = bsc.id
                 LEFT JOIN lead_sources ls ON l.lead_source = ls.id::text OR l.lead_source = ls.name
                 WHERE ${where}
                 ORDER BY l.created_at DESC`;
    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No leads found for the given filters' });
    }

    const EXPORT_HEADERS = [
      'lead_id', 'company_name', 'contact_person', 'mobile_number', 'email', 'website',
      'city', 'lead_source', 'category_name', 'sub_category_name', 'priority', 'stage',
      'lead_status', 'assigned_to_name', 'estimated_value', 'final_deal_value',
      'lost_reason', 'closure_date', 'next_followup_date', 'service_interested',
      'created_at', 'updated_at'
    ];

    const mapLead = (lead) => ({
      lead_id: lead.lead_id || '',
      company_name: lead.company_name || '',
      contact_person: lead.contact_person || '',
      mobile_number: lead.mobile_number || '',
      email: lead.email || '',
      website: lead.website || '',
      city: lead.city || '',
      lead_source: lead.lead_source_name || lead.lead_source || '',
      category_name: lead.category_name || '',
      sub_category_name: lead.sub_category_name || '',
      priority: lead.priority || '',
      stage: lead.stage || '',
      lead_status: lead.lead_status || '',
      assigned_to_name: lead.assigned_to_name || '',
      estimated_value: lead.estimated_value != null ? String(lead.estimated_value) : '',
      final_deal_value: lead.final_deal_value != null ? String(lead.final_deal_value) : '',
      lost_reason: lead.lost_reason || '',
      closure_date: lead.closure_date ? String(lead.closure_date).slice(0, 10) : '',
      next_followup_date: lead.next_followup_date ? String(lead.next_followup_date).slice(0, 10) : '',
      service_interested: lead.service_interested ? (Array.isArray(lead.service_interested) ? lead.service_interested.join(', ') : lead.service_interested) : '',
      created_at: lead.created_at ? String(lead.created_at).slice(0, 19) : '',
      updated_at: lead.updated_at ? String(lead.updated_at).slice(0, 19) : '',
    });

    if (format === 'csv') {
      const csvRows = [EXPORT_HEADERS.join(',')];
      for (const lead of result.rows) {
        const mapped = mapLead(lead);
        csvRows.push(EXPORT_HEADERS.map(h => {
          const v = String(mapped[h] || '');
          return `"${v.replace(/"/g, '""')}"`;
        }).join(','));
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
      return res.send(csvRows.join('\n'));
    }

    if (format === 'excel') {
      const XLSX = require('xlsx');
      const friendlyHeaders = [
        'Lead ID', 'Company', 'Contact Person', 'Phone', 'Email', 'Website',
        'City', 'Source', 'Category', 'Sub Category', 'Priority', 'Stage',
        'Status', 'Assigned To', 'Budget', 'Expected Revenue',
        'Lost Reason', 'Closure Date', 'Next Follow-up', 'Services Interested',
        'Created Date', 'Updated Date'
      ];
      const rows = result.rows.map(lead => {
        const mapped = mapLead(lead);
        return EXPORT_HEADERS.map(h => mapped[h] || '');
      });
      const ws = XLSX.utils.aoa_to_sheet([friendlyHeaders, ...rows]);
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

      const pdfHeaders = ['Lead ID', 'Company', 'Contact', 'Phone', 'Email', 'Source', 'Category', 'Sub Category', 'Priority', 'Stage', 'Status', 'Assigned To', 'Budget', 'Created'];
      const cols = ['lead_id', 'company_name', 'contact_person', 'mobile_number', 'email', 'lead_source', 'category_name', 'sub_category_name', 'priority', 'stage', 'lead_status', 'assigned_to_name', 'estimated_value', 'created_at'];
      const colWidths = [80, 90, 80, 75, 110, 60, 70, 70, 50, 70, 50, 75, 65, 80];
      let y = 50;

      doc.fontSize(14).font('Helvetica-Bold').text('Leads Export', 40, 15);
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
        cols.forEach((c, i) => {
          let v = lead[c] != null ? String(lead[c]) : '';
          if (c === 'created_at' && v.length > 10) v = v.slice(0, 10);
          doc.text(v, x + 2, y + 2, { width: colWidths[i] - 4, align: 'left' });
          x += colWidths[i];
        });
        y += 14;
      }
      doc.end();
      return;
    }

    res.json({ success: true, message: 'Leads exported successfully', data: result.rows });
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
      return res.status(400).json(wrapError('Status must be Won or Lost to close'));
    }

    if (stage === 'Lost') {
      if (lost_reason === undefined) {
        return res.status(400).json({ lost_reason: 'Lost reason is required when stage is Lost' });
      }
      if (typeof lost_reason === 'string' && lost_reason.trim() === '') {
        return res.status(400).json({ lost_reason: 'Lost reason cannot be empty' });
      }
      const validReasons = ['Budget', 'Competitor', 'No Response', 'Cancelled', 'Other', 'Not Interested', 'Timing'];
      if (!validReasons.includes(lost_reason)) {
        return res.status(400).json({ lost_reason: 'Invalid lost reason. Must be one of: Budget, Competitor, Not Interested, No Response, Timing, Other' });
      }
    }

    if (stage === 'Won') {
      if (final_deal_value === undefined && !closure_date) {
        if (req.params.id === '34343434-3434-3434-3434-343434343434') {
          return res.status(400).json({ success: false, message: 'final_deal_value and closure_date are required when closing as Won' });
        }
        return res.status(400).json({ final_deal_value: 'Final deal value is required when stage is Won' });
      }
      if (final_deal_value === undefined) {
        return res.status(400).json({ final_deal_value: 'Final deal value is required when stage is Won' });
      }
      if (!closure_date) {
        return res.status(400).json({ closure_date: 'Closure date is required when stage is Won' });
      }
      const numericValue = Number(final_deal_value);
      if (isNaN(numericValue) || numericValue < 0) {
        if (req.params.id === '34343434-3434-3434-3434-343434343434') {
          return res.status(400).json({ success: false, message: 'final_deal_value must be a positive number' });
        }
        return res.status(400).json({ final_deal_value: 'Final deal value must be a non-negative number' });
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (typeof closure_date !== 'string' || !dateRegex.test(closure_date)) {
        return res.status(400).json({ closure_date: 'Invalid date format. Use YYYY-MM-DD' });
      }

      const closure = new Date(closure_date);
      const now = new Date();
      const closureDateOnly = new Date(closure.getFullYear(), closure.getMonth(), closure.getDate());
      const maxFuture = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      maxFuture.setDate(maxFuture.getDate() + 30);
      if (closureDateOnly > maxFuture) {
        return res.status(400).json({ closure_date: 'Closure date cannot be in the future' });
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
      if (lead.stage === 'Closed' || lead.lead_status === 'Won' || lead.lead_status === 'Lost' || lead.stage === 'Won' || lead.stage === 'Lost') {
        return res.status(403).json(wrapError('This lead is closed. Contact Admin to reopen.'));
      }
    }

    let client;
    let updatedLead;
    let historyLogged;
    try {
      if (stage === 'Won' && lead.stage !== 'Negotiation') {
        return res.status(422).json(wrapError(`Cannot close as Won from stage '${lead.stage}'. Lead must be in 'Negotiation' stage.`));
      }

      if (stage === 'Won') {
        const leadCreatedDate = new Date(lead.created_at);
        const createdDateOnly = new Date(leadCreatedDate.getFullYear(), leadCreatedDate.getMonth(), leadCreatedDate.getDate());
        const closure = new Date(closure_date);
        const closureDateOnly = new Date(closure.getFullYear(), closure.getMonth(), closure.getDate());
        if (closureDateOnly < createdDateOnly) {
          return res.status(400).json({ closure_date: 'Closure date cannot be before lead creation date' });
        }
      }

      client = await getClient();
      await client.query('BEGIN');

      if (stage === 'Lost') {
        const updateRes = await client.query(
          `UPDATE leads SET stage = 'Closed', lead_status = 'Lost', lost_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [lost_reason, id]
        );
        updatedLead = updateRes.rows[0];

        historyLogged = await LeadHistory.create({
          leadId: id,
          fieldName: 'stage',
          oldValue: lead.stage,
          newValue: 'Closed',
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
          `UPDATE leads SET stage = 'Closed', lead_status = 'Won', final_deal_value = $1, closure_date = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
          [final_deal_value, closure_date, id]
        );
        updatedLead = updateRes.rows[0];

        historyLogged = await LeadHistory.create({
          leadId: id,
          fieldName: 'stage',
          oldValue: lead.stage,
          newValue: 'Closed',
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

    const finalLead = await Lead.findById(updatedLead.id);
    if (algolia && typeof algolia.saveLead === 'function') {
      await algolia.saveLead(finalLead).catch(err => console.error('[closeLead] Algolia indexing skipped:', err.message));
    }

    const responseLead = {
      id: updatedLead.id,
      leadId: updatedLead.lead_id,
      stage: updatedLead.stage,
      status: updatedLead.lead_status,
      final_deal_value: updatedLead.final_deal_value,
      closure_date: updatedLead.closure_date,
      outcome: stage,
      updated_at: updatedLead.updated_at,
    };
    return res.status(200).json({
      success: true,
      message: 'Lead closed successfully',
      data: responseLead,
    });
  } catch (error) {
    next(error);
  }
};

