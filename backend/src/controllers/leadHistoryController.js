const LeadHistory = require('../models/LeadHistory');
const Lead = require('../models/Lead');
const { query } = require('../config/db');
const { success: wrapSuccess, error: wrapError } = require('../utils/response');
const fs = require('fs');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CACHE_FILE = 'd:/CRM market/backend/active_filters.json';

function readCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch (err) {}
  return {};
}

function writeCache(cache) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (err) {}
}

function parseFilters(query) {
  const field = query.field || query.field_name || query.fieldName;
  const change_type = query.change_type || query.changeType;
  const is_system_generated = query.is_system_generated || query.isSystemGenerated;
  const from = query.from || query.from_date || query.fromDate;
  const to = query.to || query.to_date || query.toDate;
  const search = query.search || query.searchQuery;
  const page = query.page;
  const limit = query.limit;

  const filters = {};
  if (page) filters.page = parseInt(page);
  if (limit) filters.limit = parseInt(limit);

  if (field) {
    const fields = String(field)
      .split(',')
      .map(f => {
        const cleaned = f.trim().toLowerCase().replace(/[\s_-]+/g, '');
        if (cleaned === 'followuplogged') return 'followup_logged';
        if (cleaned === 'leadcreated') return 'lead_created';
        if (cleaned === 'assignedto') return 'assigned_to';
        if (cleaned === 'leadreopened') return 'Lead Reopened';
        if (cleaned === 'stage') return 'stage';
        if (cleaned === 'status' || cleaned === 'leadstatus') return 'status';
        return f.trim();
      })
      .filter(Boolean);
    if (fields.length === 1) {
      filters.fieldName = fields[0];
    } else if (fields.length > 1) {
      filters.fieldNames = fields;
    }
  }

  if (change_type) {
    const ct = String(change_type).toLowerCase().trim();
    if (ct === 'user') {
      filters.isSystemGenerated = false;
    } else if (ct === 'system') {
      filters.isSystemGenerated = true;
    }
  } else if (is_system_generated !== undefined && is_system_generated !== '') {
    filters.isSystemGenerated = String(is_system_generated) === 'true';
  }

  if (from) filters.from = from;
  if (to) {
    filters.to = String(to).includes('T') ? to : `${to}T23:59:59.999Z`;
  }

  if (search && String(search).trim()) {
    filters.search = String(search).trim();
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
    
    // Cache active filters for this lead
    const cacheKey = `${req.user.id}:${id}`;
    const cachedFilters = { ...filters };
    delete cachedFilters.page;
    delete cachedFilters.limit;
    try {
      const cache = readCache();
      cache[cacheKey] = {
        filters: cachedFilters,
        timestamp: Date.now()
      };
      writeCache(cache);
    } catch (err) {
      console.error('Failed to write filters cache:', err.message);
    }

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
        old_value: meta.old_outcome !== undefined ? String(meta.old_outcome) : h.old_value,
        new_value: meta.new_outcome !== undefined ? String(meta.new_outcome) : h.new_value,
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

    let filters = parseFilters(req.query);
    
    // Fallback to cached active filters if frontend query string is empty
    const queryKeys = Object.keys(req.query).filter(k => k !== 'format' && k !== '_');
    if (queryKeys.length === 0) {
      const cacheKey = `${req.user.id}:${id}`;
      try {
        const cache = readCache();
        const cached = cache[cacheKey];
        if (cached && (Date.now() - cached.timestamp < 30 * 60 * 1000)) {
          filters = { ...cached.filters };
        }
      } catch (err) {
        console.error('Failed to read filters cache:', err.message);
      }
    }
    
    delete filters.page;
    delete filters.limit;

    const result = await LeadHistory.findByLeadId(id, filters);

    if (!result.history || result.history.length === 0) {
      return res.status(404).json({ success: false, message: 'No history found for this lead' });
    }

    const rows = result.history.map(h => {
      let oldVal = h.old_value || '';
      let newVal = h.new_value || '';
      if (h.field_name === 'followup_logged' && h.metadata) {
        const meta = typeof h.metadata === 'string' ? JSON.parse(h.metadata) : h.metadata;
        if (meta.old_outcome !== undefined) oldVal = String(meta.old_outcome);
        if (meta.new_outcome !== undefined) newVal = String(meta.new_outcome);
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

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="lead-history-${id}.csv"`);
    res.status(200).send('\uFEFF' + csvHeaders + csvRows);
  } catch (error) {
    next(error);
  }
};

exports.rejectMutation = (req, res) => {
  res.status(405).json({ success: false, message: 'Method Not Allowed. History is immutable.' });
};
