const LeadHistory = require('../models/LeadHistory');
const Lead = require('../models/Lead');
const { query } = require('../config/db');
const { success: wrapSuccess, error: wrapError } = require('../utils/response');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseFilters(query) {
  const { field_name, change_type, is_system_generated, page, limit } = query;
  const filters = {};
  if (page) filters.page = parseInt(page);
  if (limit) filters.limit = parseInt(limit);

  if (field_name) {
    const fields = field_name.split(',').map(f => f.trim()).filter(Boolean);
    if (fields.length === 1) {
      filters.fieldName = fields[0];
    } else if (fields.length > 1) {
      filters.fieldNames = fields;
    }
  }

  if (change_type) {
    if (change_type === 'user') {
      filters.isSystemGenerated = false;
    } else if (change_type === 'system') {
      filters.isSystemGenerated = true;
    }
  } else if (is_system_generated !== undefined && is_system_generated !== '') {
    filters.isSystemGenerated = is_system_generated === 'true';
  }

  return filters;
}

exports.getFieldHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid lead ID' });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (req.user.role === 'Marketing Executive' && lead.assigned_to !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to view this lead's history" });
    }

    const filters = parseFilters(req.query);
    if (!filters.page) filters.page = parseInt(req.query.page) || 1;
    if (!filters.limit) filters.limit = parseInt(req.query.limit) || 50;

    const result = await LeadHistory.findByLeadId(id, filters);

    const history = result.history.map(h => {
      if (h.field_name !== 'followup_logged') return h;
      let meta = h.metadata;
      if (!meta) return h;
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch (_) { return h; }
      }
      return {
        ...h,
        old_value: meta.old_outcome || h.old_value,
        new_value: meta.new_outcome || h.new_value,
      };
    });

    res.json({
      success: true,
      message: 'Field history fetched successfully',
      data: {
        lead_id: id,
        total_changes: result.total_changes,
        history,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total_pages: Math.ceil(result.total_changes / filters.limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.exportFieldHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format, field_name, change_type, is_system_generated } = req.query;

    if (format !== 'csv' && format !== 'excel') {
      return res.status(400).json({ success: false, message: 'Format must be csv or excel' });
    }

    if (!UUID_REGEX.test(id)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (req.user.role === 'Marketing Executive' && lead.assigned_to !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to export this lead's history" });
    }

    const filters = parseFilters(req.query);

    const result = await LeadHistory.findByLeadId(id, filters);

    if (!result.history || result.history.length === 0) {
      return res.status(404).json({ success: false, message: 'No history found for this lead' });
    }

    const rows = result.history.map(h => {
      let oldVal = h.old_value || '';
      let newVal = h.new_value || '';
      if (h.field_name === 'followup_logged' && h.metadata) {
        const meta = typeof h.metadata === 'string' ? JSON.parse(h.metadata) : h.metadata;
        if (meta.old_outcome) oldVal = meta.old_outcome;
        if (meta.new_outcome) newVal = meta.new_outcome;
      }
      return {
        field_name: h.field_name || '',
        old_value: oldVal,
        new_value: newVal,
        change_summary: h.change_summary || '',
        changed_by_name: h.changed_by_name || '',
        changed_at: h.changed_at || '',
        reason: h.reason || '',
      };
    });

    if (format === 'excel') {
      const XLSX = require('xlsx');
      const headers = ['field_name', 'old_value', 'new_value', 'change_summary', 'changed_by_name', 'changed_at', 'reason'];
      const friendlyHeaders = ['Field', 'Old Value', 'New Value', 'Change Summary', 'Changed By', 'Changed At', 'Reason'];
      const sheetData = [friendlyHeaders, ...rows.map(r => headers.map(h => String(r[h] || '')))];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Lead History');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="lead-history-${id}.xlsx"`);
      return res.status(200).send(buf);
    }

    const csvHeaders = 'field_name,old_value,new_value,change_summary,changed_by_name,changed_at,reason\n';
    const csvRows = rows.map(r =>
      `"${r.field_name}","${r.old_value.replace(/"/g, '""')}","${r.new_value.replace(/"/g, '""')}","${r.change_summary.replace(/"/g, '""')}","${r.changed_by_name}","${r.changed_at}","${r.reason.replace(/"/g, '""')}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="lead-history-${id}.csv"`);
    res.status(200).send(csvHeaders + csvRows);
  } catch (error) {
    next(error);
  }
};

exports.rejectMutation = (req, res) => {
  res.status(405).json({ success: false, message: 'Method Not Allowed. History is immutable.' });
};
