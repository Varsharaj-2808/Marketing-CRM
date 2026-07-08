const LeadHistory = require('../models/LeadHistory');
const Lead = require('../models/Lead');
const { query } = require('../config/db');

exports.getFieldHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { field_name, page = 1, limit = 50 } = req.query;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (req.user.role === 'Marketing Executive' && lead.assigned_to !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to view this lead's history" });
    }

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit)
    };
    if (field_name) {
      filters.fieldName = field_name;
    }

    const result = await LeadHistory.findByLeadId(id, filters);

    res.json({
      success: true,
      data: {
        lead_id: id,
        total_changes: result.total_changes,
        history: result.history
      },
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total_pages: Math.ceil(result.total_changes / filters.limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.exportFieldHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format } = req.query;

    if (format !== 'csv') {
      return res.status(400).json({ success: false, message: 'Format must be csv' });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const result = await LeadHistory.findByLeadId(id);

    if (!result.history || result.history.length === 0) {
      return res.status(404).json({ success: false, message: 'No history found for this lead' });
    }

    const headers = 'field_name,old_value,new_value,change_summary,changed_by,changed_at,reason\n';
    const rows = result.history.map(h =>
      `"${h.field_name || ''}","${(h.old_value || '').replace(/"/g, '""')}","${(h.new_value || '').replace(/"/g, '""')}","${(h.change_summary || '').replace(/"/g, '""')}","${h.changed_by || ''}","${h.changed_at || ''}","${(h.reason || '').replace(/"/g, '""')}"`
    ).join('\n');

    const csv = headers + rows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="lead-history-${id}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

exports.rejectMutation = (req, res) => {
  res.status(405).json({ success: false, message: 'Method Not Allowed. History is immutable.' });
};
