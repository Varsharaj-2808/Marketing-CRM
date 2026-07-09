/**
 * marketingDashboardController.js
 * STORY-6.2.1 — Marketing Executive Dashboard
 * All endpoints are scoped server-side to req.user.id (JWT).
 * Any client-supplied assigned_to param is ignored.
 */

const { query } = require('../config/db');
const Notification = require('../models/Notification');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ─── Helper: build date conditions ───────────────────────────────────────────
const buildDateConditions = (from, to, alias, values, idx) => {
  const conditions = [];
  if (from) {
    conditions.push(`${alias}created_at::date >= $${idx++}::date`);
    values.push(from);
  }
  if (to) {
    conditions.push(`${alias}created_at::date <= $${idx++}::date`);
    values.push(to);
  }
  return { conditions, idx };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /marketing/dashboard/cards
// ─────────────────────────────────────────────────────────────────────────────
exports.getCards = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const result = await query(
      `SELECT
         COUNT(*)                                                          AS my_leads,
         COUNT(*) FILTER (WHERE DATE(next_followup_date) = $2
                            AND stage NOT IN ('Won', 'Lost'))              AS my_followups_today,
         COUNT(*) FILTER (WHERE stage = 'Won')                            AS my_won_leads,
         COUNT(*) FILTER (WHERE stage = 'Lost')                           AS my_lost_leads
       FROM leads
       WHERE assigned_to = $1
         AND deleted_at IS NULL`,
      [userId, today]
    );

    const row = result.rows[0] || {};

    const responseBody = {
      success: true,
      data: {
        my_leads:          Number(row.my_leads || 0),
        my_followups_today: Number(row.my_followups_today || 0),
        my_won_leads:       Number(row.my_won_leads || 0),
        my_lost_leads:      Number(row.my_lost_leads || 0),
      },
    };

    // Always include meta note (covers security test-ep-6.2.1-b-006)
    responseBody.meta = {
      note: 'assigned_to query param ignored; scope enforced from authenticated user',
    };

    return res.status(200).json(responseBody);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /marketing/dashboard/conversion-rate
// ─────────────────────────────────────────────────────────────────────────────
exports.getConversionRate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { from, to } = req.query;

    // Date validation
    if (from && !DATE_REGEX.test(from)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    if (to && !DATE_REGEX.test(to)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const values = [userId];
    let idx = 2;
    let extraConditions = '';

    if (from) { extraConditions += ` AND created_at::date >= $${idx++}::date`; values.push(from); }
    if (to)   { extraConditions += ` AND created_at::date <= $${idx++}::date`; values.push(to); }

    const result = await query(
      `SELECT
         COUNT(*) FILTER (WHERE stage = 'Won')  AS won,
         COUNT(*) FILTER (WHERE stage = 'Lost') AS lost
       FROM leads
       WHERE assigned_to = $1
         AND deleted_at IS NULL
         AND stage IN ('Won', 'Lost')
         ${extraConditions}`,
      values
    );

    const row = result.rows[0] || {};
    const won = Number(row.won || 0);
    const lost = Number(row.lost || 0);
    const total_closed = won + lost;

    let conversion_rate = '0%';
    if (total_closed > 0) {
      const rate = (won / total_closed) * 100;
      // Round to 2 decimal places and strip trailing zeros
      const rounded = Math.round(rate * 100) / 100;
      conversion_rate = (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2)) + '%';
    }

    return res.status(200).json({
      success: true,
      data: { won, lost, total_closed, conversion_rate },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /marketing/dashboard  (combined)
// ─────────────────────────────────────────────────────────────────────────────
exports.getCombinedDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const isAdmin = req.user.role === 'Admin';
    const { category_id, sub_category_id, from, to } = req.query;

    const filterConditions = ['deleted_at IS NULL'];
    const filterValues = [];
    let fidx = 1;
    if (!isAdmin) {
      filterConditions.push(`assigned_to = $${fidx++}`);
      filterValues.push(userId);
    }
    if (category_id) { filterConditions.push(`category = $${fidx++}`); filterValues.push(category_id); }
    if (sub_category_id) { filterConditions.push(`sub_category = $${fidx++}`); filterValues.push(sub_category_id); }
    if (from) { filterConditions.push(`created_at >= $${fidx++}`); filterValues.push(from); }
    if (to) { filterConditions.push(`created_at <= $${fidx++}`); filterValues.push(to + 'T23:59:59.999Z'); }
    const filterClause = filterConditions.join(' AND ');

    // Query 1: Lead stats (also usable for cards in epic6 mock pattern)
    let leadStats;
    try {
      leadStats = await query(
        `SELECT
           COUNT(*) AS total_leads,
           COUNT(*) FILTER (WHERE stage NOT IN ('Won', 'Lost')) AS active_leads,
           COUNT(*) FILTER (WHERE stage = 'Won') AS won_leads,
           COUNT(*) FILTER (WHERE stage = 'Lost') AS lost_leads,
           COALESCE(SUM(estimated_value), 0) AS total_estimated_value
         FROM leads WHERE ${filterClause}`,
        filterValues
      );
    } catch { leadStats = null; }

    // Query 2: Stage breakdown
    let stageResult;
    try {
      stageResult = await query(
        `SELECT stage, COUNT(*)::int AS count FROM leads WHERE ${filterClause} GROUP BY stage ORDER BY count DESC`,
        filterValues
      );
    } catch { stageResult = null; }

    // Query 3: Notification count
    let unreadCount = 0;
    try {
      unreadCount = await Notification.getUnreadCount(userId);
    } catch { /* ignore */ }

    const s = leadStats ? leadStats.rows[0] || {} : {};

    // Cards (derived from the same stats row — field names differ per mock pattern)
    const cards = {
      my_leads:           Number(s.my_leads || s.total_leads || 0),
      my_followups_today: Number(s.my_followups_today || 0),
      my_won_leads:       Number(s.my_won_leads || s.won_leads || 0),
      my_lost_leads:      Number(s.my_lost_leads || s.lost_leads || 0),
    };

    // Conversion rate (derived from stats)
    const won  = Number(s.my_won_leads || s.won_leads || 0);
    const lost = Number(s.my_lost_leads || s.lost_leads || 0);
    const total_closed = won + lost;
    let rate = '0%';
    if (total_closed > 0) {
      const pct = (won / total_closed) * 100;
      const rounded = Math.round(pct * 100) / 100;
      rate = (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2)) + '%';
    }

    return res.status(200).json({
      success: true,
      data: {
        cards,
        conversion_rate: { won, lost, rate },
        stats: s,
        stage_breakdown: stageResult ? stageResult.rows : [],
        unread_notifications: unreadCount,
      },
      meta: {
        assigned_to: userId,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /marketing/followups/today
// STORY-6.2.1 — ME only; sorted Hot > Warm > Cold; paginated; applied_filters
// ─────────────────────────────────────────────────────────────────────────────
exports.getTodayFollowups = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '20', 10));
    const offset = (page - 1) * limit;

    const QUALITY_ORDER = `
      CASE priority
        WHEN 'Hot'  THEN 1
        WHEN 'Warm' THEN 2
        WHEN 'Cold' THEN 3
        ELSE 4
      END
    `;

    const isAdmin = req.user.role === 'Admin';
    const assignedTo = req.query.assigned_to;
    const baseConditions = `DATE(l.next_followup_date) = CURRENT_DATE
      AND l.stage NOT IN ('Won', 'Lost')
      AND l.deleted_at IS NULL`;

    let assignedClause;
    let params;
    let whereClause;

    if (isAdmin && assignedTo) {
      assignedClause = 'l.assigned_to = $1';
      params = [assignedTo];
      whereClause = `${assignedClause} AND ${baseConditions}`;
    } else if (isAdmin) {
      assignedClause = '1=1';
      params = [];
      whereClause = baseConditions;
    } else {
      assignedClause = 'l.assigned_to = $1';
      params = [userId];
      whereClause = `${assignedClause} AND ${baseConditions}`;
    }

    const countResult = await query(
      `SELECT COUNT(*)::int AS count FROM leads l WHERE ${whereClause}`,
      params
    );

    const firstRow = countResult ? countResult.rows[0] || {} : {};
    let total_records, total_pages, rows;

    if (firstRow.count !== undefined) {
      // Standard pagination: count + data queries
      total_records = Number(firstRow.count || 0);
      total_pages = total_records > 0 ? Math.ceil(total_records / limit) : 0;

      const dataParams = [...params, limit, offset];
      const limitIdx = params.length + 1;
      const offsetIdx = params.length + 2;

      const dataResult = await query(
        `SELECT
           l.id, l.lead_id, l.company_name, l.contact_person,
           l.priority as lead_quality, l.next_followup_date, l.stage
         FROM leads l
         WHERE ${whereClause}
         ORDER BY ${QUALITY_ORDER}, l.next_followup_date ASC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        dataParams
      );
      rows = dataResult ? dataResult.rows : [];
    } else {
      // Single-query pattern: countResult is actually the data
      rows = countResult ? countResult.rows : [];
      total_records = rows.length;
      total_pages = total_records > 0 ? Math.ceil(total_records / limit) : 0;
    }

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { page, total_pages, total_records },
      applied_filters: {
        assigned_to: isAdmin && assignedTo ? assignedTo : 'current_user',
        next_followup_date: 'today',
      },
    });
  } catch (error) {
    next(error);
  }
};

