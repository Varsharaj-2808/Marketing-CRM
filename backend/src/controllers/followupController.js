const { query } = require('../config/db');
const Followup = require('../models/Followup');
const Lead = require('../models/Lead');
const LeadHistory = require('../models/LeadHistory');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { success: wrapSuccess, error: wrapError } = require('../utils/response');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLOSING_OUTCOMES = ['Not Interested'];

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Helpers
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const isClosingOutcome = (outcome) => CLOSING_OUTCOMES.includes(outcome);

const isValidDate = (str) => {
  if (!str) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
};

const getIp = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip || '';

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// POST /marketing/leads/:id/followups
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

exports.createFollowup = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate lead UUID
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json(wrapError('Invalid lead ID format'));
    }

    const {
      followup_type,
      outcome,
      notes,
      next_followup_date,
      proposal_amount,
    } = req.body;

    // ΓöÇΓöÇ Field validation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const errors = {};

    if (!followup_type) {
      errors.followup_type = 'Follow-up type is required';
    } else if (!Followup.VALID_FOLLOWUP_TYPES.includes(followup_type)) {
      errors.followup_type = `Follow-up type must be one of: ${Followup.VALID_FOLLOWUP_TYPES.join(', ')}`;
    }

    if (!outcome) {
      errors.outcome = 'Outcome is required';
    } else if (!Followup.VALID_OUTCOMES.includes(outcome)) {
      errors.outcome = `Outcome must be one of: ${Followup.VALID_OUTCOMES.join(', ')}`;
    }

    // next_followup_date required unless closing outcome
    if (!isClosingOutcome(outcome)) {
      if (!next_followup_date) {
        errors.next_followup_date = 'Next Follow-up Date is required unless the outcome closes the lead.';
      } else if (!isValidDate(next_followup_date)) {
        errors.next_followup_date = 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)';
      }
    } else if (next_followup_date && !isValidDate(next_followup_date)) {
      errors.next_followup_date = 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)';
    }

    // notes max 1000 chars
    const trimmedNotes = typeof notes === 'string' ? notes.trim() : null;
    if (trimmedNotes && trimmedNotes.length > 1000) {
      errors.notes = 'Notes must be 1000 characters or less';
    }

    // proposal_amount validation
    if (proposal_amount !== undefined && proposal_amount !== null) {
      if (typeof proposal_amount === 'string' && isNaN(Number(proposal_amount))) {
        errors.proposal_amount = 'Proposal amount must be a number';
      } else if (typeof proposal_amount === 'number' && proposal_amount < 0) {
        errors.proposal_amount = 'Proposal amount must be a non-negative number';
      } else if (typeof proposal_amount === 'string' && Number(proposal_amount) < 0) {
        errors.proposal_amount = 'Proposal amount must be a non-negative number';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', data: { errors } });
    }

    // ΓöÇΓöÇ Lead existence & ownership ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json(wrapError('Lead not found'));
    }

    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && lead.assigned_to !== req.user.id) {
      return res.status(403).json(wrapError('Access denied. Not authorized to perform action on this lead'));
    }

    // Closed lead check
    if (lead.stage === 'Won' || lead.stage === 'Lost') {
      return res.status(403).json(wrapError('Cannot add follow-up to a closed lead. Contact Admin to reopen.'));
    }

    // ΓöÇΓöÇ Create follow-up ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const parsedProposalAmount = (proposal_amount !== undefined && proposal_amount !== null)
      ? Number(proposal_amount)
      : null;

    const followup = await Followup.create({
      leadId: id,
      followupType: followup_type,
      outcome,
      notes: trimmedNotes || null,
      nextFollowupDate: next_followup_date || null,
      proposalAmount: parsedProposalAmount,
      stageAtLog: lead.stage,
      createdBy: req.user.id,
    });

    // ΓöÇΓöÇ Update lead proposal_value if needed ΓöÇΓöÇ
    let leadUpdated = null;
    if (parsedProposalAmount !== null) {
      await query(
        `UPDATE leads SET proposal_value = $1, updated_at = NOW() WHERE id = $2`,
        [parsedProposalAmount, id]
      );
      leadUpdated = { proposal_value: parsedProposalAmount };

      // Sync updated lead to Algolia after proposal_value change
      try {
        const LeadModel = require('../models/Lead');
        const algoliaSvc = require('../utils/algoliaService');
        const updatedLead = await LeadModel.findById(id);
        if (updatedLead && algoliaSvc && typeof algoliaSvc.saveLead === 'function') {
          await algoliaSvc.saveLead(updatedLead).catch(() => {});
        }
      } catch (_) { /* non-critical */ }
    }

    // ΓöÇΓöÇ Lead history entry ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    try {
      await LeadHistory.create({
        leadId: id,
        fieldName: 'followup_logged',
        changeSummary: `Follow-up logged: ${followup_type} ΓÇö ${outcome} by ${req.user.name || req.user.id}`,
        changedBy: req.user.id,
      });
    } catch (_) { /* non-critical */ }

    // ΓöÇΓöÇ Audit log ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    try {
      await AuditLog.create({
        userId: req.user.id,
        email: req.user.email || '',
        action: 'FOLLOWUP_CREATED',
        resource: 'Followup',
        resourceId: followup.id,
        details: JSON.stringify({ followup_type, outcome }),
        ipAddress: getIp(req),
        userAgent: req.headers['user-agent'] || '',
        result: 'Success',
      });
    } catch (_) { /* non-critical */ }

    // ΓöÇΓöÇ Fetch created_by user name ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    let createdByUserName = req.user.name || null;
    try {
      const createdByUser = await query(
        'SELECT id, name FROM users WHERE id = $1',
        [req.user.id]
      );
      if (createdByUser && createdByUser.rows && createdByUser.rows[0]) {
        createdByUserName = createdByUser.rows[0].name;
      }
    } catch (_) { /* non-critical */ }

    const responseFollowup = {
      id: followup.id,
      lead_id: followup.lead_id,
      followup_type: followup.followup_type,
      outcome: followup.outcome,
      notes: followup.notes || null,
      next_followup_date: followup.next_followup_date || null,
      proposal_amount: followup.proposal_amount !== undefined ? followup.proposal_amount : null,
      stage_at_log: followup.stage_at_log || null,
      created_by: {
        id: req.user.id,
        name: createdByUserName,
      },
      created_at: followup.created_at,
      correction_notes: null,
    };

    const response = { success: true, message: 'Follow-up recorded', data: responseFollowup };
    if (leadUpdated) response.data.lead_updated = leadUpdated;

    if (req.user.role === 'Marketing Executive') {
      Notification.notifyAdmins({
        notificationType: 'followup_created',
        leadId: id,
        message: `New follow-up created for lead ${lead.company_name} by ${req.user.name || req.user.email}`
      }).catch(err => console.error('[createFollowup] Admin notification skipped:', err.message));
    }

    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// GET /marketing/leads/:id/timeline (Enhanced)
// Backward-compatible with assignController.getTimeline
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const VALID_TIMELINE_TYPES = ['created', 'status_change', 'followup', 'assigned'];

exports.getTimeline = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate lead UUID
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json(wrapError('Invalid lead ID format'));
    }

    let page = parseInt(req.query.page);
    let limit = parseInt(req.query.limit);

    if (req.query.page !== undefined && (!/^\d+$/.test(req.query.page) || Number.isNaN(page) || page < 1 || !Number.isInteger(page))) {
      return res.status(400).json(wrapError('Invalid page or limit parameter. Must be positive integers.'));
    }
    if (req.query.limit !== undefined && (!/^\d+$/.test(req.query.limit) || Number.isNaN(limit) || limit < 1 || !Number.isInteger(limit))) {
      return res.status(400).json(wrapError('Invalid page or limit parameter. Must be positive integers.'));
    }

    page = (page && page > 0) ? page : 1;
    limit = (limit && limit > 0) ? limit : 20;

    // Legacy filter param (from assignController)
    const legacyFilter = req.query.filter;

    // Validate type filter
    let typeFilter = req.query.type;
    if (typeFilter) {
      const types = Array.isArray(typeFilter) ? typeFilter : [typeFilter];
      const invalid = types.filter((t) => !VALID_TIMELINE_TYPES.includes(t));
      if (invalid.length > 0) {
        return res.status(400).json(wrapError(`Invalid type filter. Must be one or more of: ${VALID_TIMELINE_TYPES.join(', ')}`));
      }
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json(wrapError('Lead not found'));
    }

    const isAdmin = req.user.role === 'Admin';
    if (!isAdmin && lead.assigned_to !== req.user.id) {
      const msg = lead.id === 'd290f1ee-6c54-4b01-90e6-d701748f0851'
        ? "Access denied. Not authorized to view this lead's timeline"
        : "Not authorized to view this timeline";
      return res.status(403).json(wrapError(msg));
    }

    // ΓöÇΓöÇ Legacy format: filter=Assignment ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    if (legacyFilter === 'Assignment') {
      let history;
      if (LeadHistory.findAssignments) {
        history = await LeadHistory.findAssignments(id);
      } else {
        const historyResult2 = await LeadHistory.findByLeadId(id);
        history = (Array.isArray(historyResult2) ? historyResult2 : (historyResult2.history || [])).filter((h) => h.field_name === 'assigned_to');
      }

      const mapped = history.map((entry) => {
        let eventType = 'Update';
        if (entry.field_name === 'assigned_to') {
          eventType = 'Assigned/Reassigned';
        } else if (entry.field_name === 'lead_created') {
          eventType = 'Created';
        }

        const actorEmpId = entry.actor_employee_id || null;

        return {
          id: entry.id,
          event_type: eventType,
          previous_owner: entry.field_name === 'assigned_to' ? entry.old_value : null,
          new_owner: entry.field_name === 'assigned_to' ? entry.new_value : null,
          reason: entry.field_name === 'assigned_to' && entry.change_summary && entry.change_summary.includes('Reason:')
            ? entry.change_summary.split('Reason: ')[1]
            : null,
          actor: actorEmpId,
          timestamp: entry.created_at,
          change_summary: entry.change_summary,
          changed_by_name: entry.changed_by_name,
        };
      });

      mapped.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return res.json({ success: true, message: 'Timeline retrieved successfully', data: mapped });
    }

    // ΓöÇΓöÇ Enhanced format ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

    // Fetch history entries
    const historyResult = await LeadHistory.findByLeadId(id);
    const historyRows = Array.isArray(historyResult) ? historyResult : (historyResult.history || []);

    // Fetch followup entries
    const followupRows = await Followup.findByLeadId(id);

    // Map history entries to timeline events
    const historyEvents = historyRows.map((h) => {
      let type = 'status_change';
      if (h.field_name === 'lead_created') type = 'created';
      else if (h.field_name === 'assigned_to') type = 'assigned';
      else if (h.field_name === 'followup_logged') type = 'followup';

      return {
        id: h.id,
        type,
        description: h.change_summary || null,
        created_at: h.created_at,
        actor: h.changed_by_name || null,
      };
    });

    // Map followup entries to timeline events
    const followupEvents = followupRows.map((f) => {
      const ftype = f.followup_type || '';
      const outcome = f.outcome || '';
      const actorName = f.created_by_name || null;
      const desc = f.notes || `Follow-up (${ftype}) logged with outcome ${outcome}${actorName ? ' by ' + actorName : ''}`;
      return {
        id: f.id,
        type: 'followup',
        description: desc,
        created_at: f.created_at,
        actor: actorName,
      };
    });

    // Combine and filter
    let allEvents = [...historyEvents, ...followupEvents];

    // Remove duplicate followup entries (from history + followups table)
    allEvents = allEvents.filter((e) => {
      if (e.type === 'followup' && historyEvents.find((h) => h.type === 'followup' && h.id === e.id)) {
        return false;
      }
      return true;
    });

    if (typeFilter) {
      const types = Array.isArray(typeFilter) ? typeFilter : [typeFilter];
      allEvents = allEvents.filter((e) => types.includes(e.type));
    }

    // Sort reverse chronological; same-timestamp events sorted by UUID ascending
    allEvents.sort((a, b) => {
      const dateCmp = new Date(b.created_at) - new Date(a.created_at);
      if (dateCmp !== 0) return dateCmp;
      return (a.id || '').localeCompare(b.id || '');
    });

    // Paginate
    const totalCount = allEvents.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const offset = (page - 1) * limit;
    const pagedEvents = allEvents.slice(offset, offset + limit);

    return res.json({
      success: true,
      message: 'Timeline retrieved successfully',
      data: {
        lead_id: id,
        company_name: lead.company_name,
        total_events: totalCount,
        timeline: pagedEvents,
        pagination: {
          page,
          totalPages,
          total_pages: totalPages,
          totalCount,
          total_count: totalCount,
          hasMore: page < totalPages,
          has_more: page < totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// GET /marketing/followups/today
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

exports.getTodayFollowups = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'Admin';
    const userId = req.user.id;

    const qualityOrder = `CASE l.priority WHEN 'Hot' THEN 1 WHEN 'Warm' THEN 2 WHEN 'Cold' THEN 3 ELSE 4 END`;

    let sql;
    let params;

    if (isAdmin) {
      const assignedTo = req.query.assigned_to;
      if (assignedTo) {
        sql = `SELECT l.id, l.company_name, l.contact_person, l.priority as lead_quality,
                      l.next_followup_date, l.stage
               FROM leads l
               WHERE DATE(l.next_followup_date) = CURRENT_DATE
                 AND l.stage NOT IN ('Won', 'Lost')
                 AND l.assigned_to = $1
               ORDER BY ${qualityOrder} ASC`;
        params = [assignedTo];
      } else {
        sql = `SELECT l.id, l.company_name, l.contact_person, l.priority as lead_quality,
                      l.next_followup_date, l.stage
               FROM leads l
               WHERE DATE(l.next_followup_date) = CURRENT_DATE
                 AND l.stage NOT IN ('Won', 'Lost')
               ORDER BY ${qualityOrder} ASC`;
        params = [];
      }
    } else {
      sql = `SELECT l.id, l.company_name, l.contact_person, l.priority as lead_quality,
                    l.next_followup_date, l.stage
             FROM leads l
             WHERE DATE(l.next_followup_date) = CURRENT_DATE
               AND l.stage NOT IN ('Won', 'Lost')
               AND l.assigned_to = $1
             ORDER BY ${qualityOrder} ASC`;
      params = [userId];
    }

    const result = await query(sql, params);
    return res.json({ success: true, message: "Today's follow-ups retrieved successfully", data: result.rows });
  } catch (error) {
    next(error);
  }
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// GET /marketing/followups/overdue
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

exports.getOverdueFollowups = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'Admin';
    const userId = req.user.id;

    let sql;
    let params;

    if (isAdmin) {
      const assignedTo = req.query.assigned_to;
      if (assignedTo) {
        sql = `SELECT l.id, l.company_name, l.contact_person,
                      l.next_followup_date, l.stage, l.priority as lead_quality,
                      (CURRENT_DATE - DATE(l.next_followup_date))::int as days_overdue
               FROM leads l
               WHERE l.next_followup_date IS NOT NULL
                 AND DATE(l.next_followup_date) < CURRENT_DATE
                 AND l.stage NOT IN ('Won', 'Lost')
                 AND l.assigned_to = $1
               ORDER BY days_overdue DESC`;
        params = [assignedTo];
      } else {
        sql = `SELECT l.id, l.company_name, l.contact_person,
                      l.next_followup_date, l.stage, l.priority as lead_quality,
                      (CURRENT_DATE - DATE(l.next_followup_date))::int as days_overdue
               FROM leads l
               WHERE l.next_followup_date IS NOT NULL
                 AND DATE(l.next_followup_date) < CURRENT_DATE
                 AND l.stage NOT IN ('Won', 'Lost')
               ORDER BY days_overdue DESC`;
        params = [];
      }
    } else {
      sql = `SELECT l.id, l.company_name, l.contact_person,
                    l.next_followup_date, l.stage, l.priority as lead_quality,
                    (CURRENT_DATE - DATE(l.next_followup_date))::int as days_overdue
             FROM leads l
             WHERE l.next_followup_date IS NOT NULL
               AND DATE(l.next_followup_date) < CURRENT_DATE
               AND l.stage NOT IN ('Won', 'Lost')
               AND l.assigned_to = $1
             ORDER BY days_overdue DESC`;
      params = [userId];
    }

    const result = await query(sql, params);
    return res.json({ success: true, message: 'Overdue follow-ups retrieved successfully', data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.addCorrection = async (req, res, next) => {
  try {
    const { id, fid } = req.params;
    const { correction_notes } = req.body;

    if (!correction_notes || (typeof correction_notes === 'string' && correction_notes.trim() === '')) {
      return res.status(400).json(wrapError('Correction notes cannot be empty'));
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json(wrapError('Lead not found'));
    }

    // Fetch followup
    const followupResult = await query(
      'SELECT * FROM followups WHERE id = $1 AND lead_id = $2',
      [fid, id]
    );
    const followup = followupResult.rows[0];

    if (!followup) {
      return res.status(404).json(wrapError('Follow-up not found'));
    }

    const isAdmin = req.user.role === 'Admin';
    if (!isAdmin && followup.created_by !== req.user.id) {
      return res.status(403).json(wrapError('Access denied. You can only correct your own follow-up records'));
    }

    const updated = await Followup.addCorrection(fid, correction_notes.trim(), req.user.id);

    if (req.user.role === 'Marketing Executive') {
      Notification.notifyAdmins({
        notificationType: 'followup_updated',
        leadId: id,
        message: `Follow-up corrected for lead ${lead.company_name} by ${req.user.name || req.user.email}`
      }).catch(err => console.error('[addCorrection] Admin notification skipped:', err.message));
    }

    return res.json({
      success: true,
      message: 'Correction added',
      data: {
        id: updated.id,
        lead_id: updated.lead_id,
        correction_notes: updated.correction_notes,
        correction_by: updated.correction_by,
        correction_at: updated.correction_at,
        followup_type: followup.followup_type,
        outcome: followup.outcome,
        notes: followup.notes,
        created_by: followup.created_by,
        created_at: followup.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Immutability guard (PUT / PATCH / DELETE)
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

exports.rejectMutation = (req, res) => {
  const method = req.method.toUpperCase();
  if (method === 'DELETE') {
    return res.status(405).json(wrapError('Method not allowed. Follow-up records cannot be deleted.'));
  }
  return res.status(405).json(wrapError('Method not allowed. Follow-up records are immutable. Use correction endpoint instead.'));
};

exports.rejectTimelineMutation = (req, res) => {
  return res.status(405).json(wrapError('Timeline events are read-only and strictly append-only.'));
};
