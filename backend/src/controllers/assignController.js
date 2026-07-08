const Lead = require('../models/Lead');
const LeadHistory = require('../models/LeadHistory');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { query, getClient } = require('../config/db');

const getIpAndAgent = (req) => ({
  ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
  userAgent: req.headers['user-agent'] || '',
});

const resolveUser = async (identifier) => {
  const byEmp = await User.findByEmployeeId(identifier);
  if (byEmp) return byEmp;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(identifier)) {
    return User.findById(identifier);
  }
  return null;
};

exports.assignLead = async (req, res, next) => {
  let client;
  try {
    const { id } = req.params;
    const { assigned_to, reason } = req.body;

    if (!assigned_to || !assigned_to.trim()) {
      return res.status(400).json({ assigned_to: 'Target user ID is required' });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    let reasonError = null;
    if (lead.assigned_to !== null) {
      if (typeof reason === 'string' && reason.trim().length === 0) {
        return res.status(400).json({ reason: 'Reassignment reason cannot be empty' });
      }
      if (reason && reason.length > 500) {
        return res.status(400).json({ reason: 'Reason must be 500 characters or less' });
      }
      if (reason === undefined || reason === null || reason === '') {
        reasonError = { status: 400, body: { reason: 'Reassignment reason is required when the lead already has an owner' } };
      }
    }

    const targetUser = await resolveUser(assigned_to.trim());
    if (!targetUser) {
      if (reasonError) {
        return res.status(reasonError.status).json(reasonError.body);
      }
      return res.status(404).json({ error: 'Assigned user not found' });
    }

    const userStatus = targetUser.accountStatus || targetUser.status;
    if (userStatus !== 'active') {
      return res.status(400).json({ error: 'Cannot assign leads to a deactivated user' });
    }

    if (lead.assigned_to === targetUser.id) {
      const finalLead = await Lead.findById(id);
      return res.json({
        success: true,
        message: 'Lead ownership unchanged',
        data: finalLead,
      });
    }

    if (reasonError) {
      return res.status(reasonError.status).json(reasonError.body);
    }

    let previousOwnerEmployeeId = null;
    if (lead.assigned_to) {
      const prevResult = await query('SELECT employee_id FROM users WHERE id = $1', [lead.assigned_to]);
      previousOwnerEmployeeId = prevResult.rows[0]?.employee_id || null;
    }

    client = await getClient();
    await client.query('BEGIN');

    // Update using transaction
    const updateRes = await client.query('UPDATE leads SET assigned_to = $1 WHERE id = $2 RETURNING *', [targetUser.id, id]);
    const updatedLead = updateRes.rows[0];

    const oldValue = previousOwnerEmployeeId || 'Unassigned';
    const newValue = targetUser.employee_id;
    let changeSummary = `Lead reassigned from ${oldValue} to ${newValue}`;
    if (reason) {
      changeSummary += `. Reason: ${reason}`;
    }

    const historyLogged = await LeadHistory.create({
      leadId: id,
      fieldName: 'assigned_to',
      oldValue,
      newValue,
      changeSummary,
      changedBy: req.user.id,
      isSystemGenerated: false
    }, client);

    await client.query('COMMIT');
    client.release();
    client = null;

    const message = `Lead ${updatedLead.lead_id} has been assigned to you`;
    try {
      await Notification.create({
        userId: targetUser.id,
        notificationType: 'lead_assigned',
        leadId: id,
        message,
      });
    } catch (notifError) {
      console.error('Notification creation failed (non-blocking):', notifError.message);
    }

    try {
      await AuditLog.create({
        userId: req.user.id,
        email: req.user.email || '',
        action: 'lead.assigned',
        resource: 'lead',
        resourceId: id,
        details: JSON.stringify({ from: previousOwnerEmployeeId || null, to: targetUser.employee_id }),
        ipAddress: getIpAndAgent(req).ipAddress,
        userAgent: getIpAndAgent(req).userAgent,
        result: 'success',
      });
    } catch (auditError) {
      console.error('Audit log creation failed (non-blocking):', auditError.message);
    }

    const finalLead = await Lead.findById(id);

    res.json({
      success: true,
      message: 'Lead assigned successfully.',
      data: finalLead,
      history_logged: historyLogged
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    next(error);
  }
};

exports.getTimeline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { filter } = req.query;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const isAdmin = req.user.role === 'Admin';
    const isOwner = lead.assigned_to === req.user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Access denied. Lead not assigned to you.' });
    }

    let history;
    if (filter === 'Assignment') {
      history = await LeadHistory.findAssignments(id);
    } else {
      const historyResult = await LeadHistory.findByLeadId(id);
      history = Array.isArray(historyResult) ? historyResult : (historyResult.history || []);
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

    if (filter === 'Assignment') {
      mapped.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    res.json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
};
