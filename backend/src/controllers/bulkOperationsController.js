const { query, getClient } = require('../config/db');
const Lead = require('../models/Lead');
const LeadHistory = require('../models/LeadHistory');
const AuditLog = require('../models/AuditLog');
const path = require('path');
const fs = require('fs');

const getIpAndAgent = (req) => ({
  ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
  userAgent: req.headers['user-agent'] || '',
});

exports.bulkSelect = async (req, res, next) => {
  try {
    const { lead_ids } = req.body;

    if (!Array.isArray(lead_ids)) {
      return res.status(400).json({ lead_ids: 'Must be an array of lead ID strings' });
    }

    for (const id of lead_ids) {
      if (typeof id !== 'string') {
        return res.status(400).json({ lead_ids: 'Each lead ID must be a string' });
      }
    }

    const uniqueIds = [...new Set(lead_ids)];

    res.json({
      selected: true,
      count: uniqueIds.length,
      lead_ids: uniqueIds,
    });
  } catch (error) {
    next(error);
  }
};

exports.bulkAssign = async (req, res, next) => {
  const { lead_ids, assigned_to, reason } = req.body;
  const { ipAddress, userAgent } = getIpAndAgent(req);

  try {
    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ lead_ids: 'At least one lead ID is required' });
    }

    if (!assigned_to || !assigned_to.trim()) {
      return res.status(400).json({ assigned_to: 'Target user ID is required' });
    }

    for (const id of lead_ids) {
      if (typeof id !== 'string') {
        return res.status(400).json({ lead_ids: 'Each lead ID must be a string' });
      }
    }

    const userResult = await query('SELECT id, role, "accountStatus" FROM users WHERE id = $1', [assigned_to]);
    const targetUser = userResult.rows[0];
    if (!targetUser) {
      return res.status(404).json({ error: 'Assigned user not found' });
    }

    const userStatus = targetUser.accountStatus;
    if (userStatus !== 'active') {
      return res.status(400).json({ error: 'Cannot assign leads to a deactivated user' });
    }

    const uniqueIds = [...new Set(lead_ids)];

    const leadPlaceholders = uniqueIds.map((_, i) => `$${i + 1}`).join(', ');
    const leadResult = await query(
      `SELECT id, lead_id, assigned_to FROM leads WHERE id IN (${leadPlaceholders})`,
      uniqueIds
    );

    const foundIds = new Set(leadResult.rows.map(r => r.id));
    const missingIds = uniqueIds.filter(id => !foundIds.has(id));

    if (missingIds.length > 0) {
      return res.status(404).json({ error: `Lead(s) not found: ${missingIds.join(', ')}` });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const lead of leadResult.rows) {
        await client.query(
          'UPDATE leads SET assigned_to = $1, updated_at = NOW() WHERE id = $2',
          [assigned_to, lead.id]
        );

        const oldAssignedTo = lead.assigned_to || 'Unassigned';
        let changeSummary = `Lead reassigned from ${oldAssignedTo} to ${targetUser.name || assigned_to}`;
        if (reason) {
          changeSummary += `. Reason: ${reason}`;
        }

        const historyResult = await client.query(
          `INSERT INTO lead_history (lead_id, field_name, old_value, new_value, change_summary, changed_by)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [lead.id, 'assigned_to', oldAssignedTo, assigned_to, changeSummary, req.user.id]
        );
      }

      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'BULK_ASSIGN',
      resource: 'Lead',
      resourceId: uniqueIds.join(', '),
      details: JSON.stringify({ lead_ids: uniqueIds, assigned_to, reason: reason || null, count: uniqueIds.length }),
      ipAddress,
      userAgent,
      result: 'Success',
    });

    res.json({
      assigned: true,
      count: uniqueIds.length,
    });
  } catch (error) {
    next(error);
  }
};

exports.exportLeads = async (req, res, next) => {
  try {
    const { lead_ids, format } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (!format || !format.trim()) {
      return res.status(400).json({ format: 'Export format is required' });
    }

    const validFormats = ['xlsx', 'csv'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({ format: "Format must be 'xlsx' or 'csv'" });
    }

    let leads;
    if (lead_ids && lead_ids.length > 0) {
      if (lead_ids.some(id => typeof id !== 'string')) {
        return res.status(400).json({ lead_ids: 'Each lead ID must be a string' });
      }

      const uniqueIds = [...new Set(lead_ids)];
      const placeholders = uniqueIds.map((_, i) => `$${i + 1}`).join(', ');
      const leadResult = await query(
        `SELECT l.*, u.name as assigned_to_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE l.id IN (${placeholders})`,
        uniqueIds
      );

      const foundIds = new Set(leadResult.rows.map(r => r.id));
      const missingIds = uniqueIds.filter(id => !foundIds.has(id));

      if (missingIds.length > 0) {
        return res.status(404).json({ error: `Lead(s) not found: ${missingIds.join(', ')}` });
      }

      leads = leadResult.rows;
    } else {
      const leadResult = await query(
        `SELECT l.*, u.name as assigned_to_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id ORDER BY l.created_at DESC`
      );
      leads = leadResult.rows;
    }

    const exportsDir = path.join(__dirname, '..', '..', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `leads-${timestamp}-${randomStr}.${format}`;
    const filePath = path.join(exportsDir, fileName);

    const headers = [
      'Lead ID', 'Company Name', 'Contact Person', 'Mobile', 'Email',
      'Lead Source', 'Category', 'Priority', 'Stage', 'Estimated Value',
      'Assigned To', 'Created At', 'Updated At',
    ];

    if (format === 'csv') {
      const csvRows = [headers.join(',')];

      for (const lead of leads) {
        const row = [
          lead.lead_id || '',
          escapeCsvField(lead.company_name || ''),
          escapeCsvField(lead.contact_person || ''),
          lead.mobile_number || '',
          escapeCsvField(lead.email || ''),
          escapeCsvField(lead.lead_source || ''),
          escapeCsvField(lead.category || ''),
          lead.priority || '',
          lead.stage || '',
          lead.estimated_value != null ? lead.estimated_value : '',
          escapeCsvField(lead.assigned_to_name || ''),
          lead.created_at ? new Date(lead.created_at).toISOString() : '',
          lead.updated_at ? new Date(lead.updated_at).toISOString() : '',
        ];
        csvRows.push(row.join(','));
      }

      fs.writeFileSync(filePath, '\uFEFF' + csvRows.join('\n'), 'utf8');
    } else {
      const XLSX = require('xlsx');

      const data = leads.map(lead => ({
        'Lead ID': lead.lead_id || '',
        'Company Name': lead.company_name || '',
        'Contact Person': lead.contact_person || '',
        'Mobile': lead.mobile_number || '',
        'Email': lead.email || '',
        'Lead Source': lead.lead_source || '',
        'Category': lead.category || '',
        'Priority': lead.priority || '',
        'Stage': lead.stage || '',
        'Estimated Value': lead.estimated_value != null ? lead.estimated_value : '',
        'Assigned To': lead.assigned_to_name || '',
        'Created At': lead.created_at ? new Date(lead.created_at).toISOString() : '',
        'Updated At': lead.updated_at ? new Date(lead.updated_at).toISOString() : '',
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
      XLSX.writeFile(workbook, filePath);
    }

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'LEADS_EXPORTED',
      resource: 'Lead',
      resourceId: leads.map(l => l.lead_id).join(', '),
      details: JSON.stringify({ format, count: leads.length }),
      ipAddress,
      userAgent,
      result: 'Success',
    });

    res.json({
      download_url: `/exports/${fileName}`,
    });
  } catch (error) {
    next(error);
  }
};

function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
