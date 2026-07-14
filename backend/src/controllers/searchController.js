const algoliaService = require('../utils/algoliaService');
const { query } = require('../config/db');

const HITS_PER_MODULE = 5;

async function searchLeads(q, userId, isAdmin) {
  try {
    const result = await algoliaService.searchLeads(q, {}, 1, HITS_PER_MODULE, isAdmin, userId);
    if (!result || !result.hits) return [];
    return result.hits.map((h) => ({
      id: h.id,
      title: h.company_name || h.contact_person || h.lead_id || 'Untitled Lead',
      subtitle: [h.contact_person, h.city, h.email].filter(Boolean).join(' · '),
      icon: 'work',
    }));
  } catch {
    return [];
  }
}

async function searchUsers(q) {
  try {
    const result = await algoliaService.searchUsers(q, {}, 1, HITS_PER_MODULE);
    if (!result || !result.hits) return [];
    return result.hits.map((h) => ({
      id: h.id,
      title: h.name || h.email,
      subtitle: [h.role, h.email].filter(Boolean).join(' · '),
      icon: 'person',
    }));
  } catch {
    return [];
  }
}

async function searchCategories(q) {
  try {
    const result = await query(
      `SELECT id, category_name FROM business_categories WHERE category_name ILIKE $1 LIMIT $2`,
      [`%${q}%`, HITS_PER_MODULE]
    );
    return result.rows.map((r) => ({
      id: r.id,
      title: r.category_name,
      subtitle: 'Business Category',
      icon: 'category',
    }));
  } catch {
    return [];
  }
}

async function searchSubCategories(q) {
  try {
    const result = await query(
      `SELECT sc.id, sc.sub_category_name, c.category_name
       FROM business_sub_categories sc
       LEFT JOIN business_categories c ON sc.category_id = c.id
       WHERE sc.sub_category_name ILIKE $1 LIMIT $2`,
      [`%${q}%`, HITS_PER_MODULE]
    );
    return result.rows.map((r) => ({
      id: r.id,
      title: r.sub_category_name,
      subtitle: r.category_name ? `Sub-Category · ${r.category_name}` : 'Sub-Category',
      icon: 'label',
    }));
  } catch {
    return [];
  }
}

async function searchServices(q) {
  try {
    const result = await query(
      `SELECT id, name FROM services WHERE name ILIKE $1 LIMIT $2`,
      [`%${q}%`, HITS_PER_MODULE]
    );
    return result.rows.map((r) => ({
      id: r.id,
      title: r.name,
      subtitle: 'Service',
      icon: 'settings',
    }));
  } catch {
    return [];
  }
}

async function searchNotifications(q, userId) {
  try {
    const result = await query(
      `SELECT id, notification_type, message FROM notifications
       WHERE user_id = $1 AND (message ILIKE $2 OR notification_type ILIKE $2)
       LIMIT $3`,
      [userId, `%${q}%`, HITS_PER_MODULE]
    );
    return result.rows.map((r) => ({
      id: r.id,
      title: r.notification_type || 'Notification',
      subtitle: r.message || '',
      icon: 'notifications',
    }));
  } catch {
    return [];
  }
}

async function searchAuditLogs(q) {
  try {
    const result = await query(
      `SELECT id, action, resource, details, email FROM audit_logs
       WHERE action ILIKE $1 OR resource ILIKE $1 OR details ILIKE $1 OR email ILIKE $1
       ORDER BY created_at DESC LIMIT $2`,
      [`%${q}%`, HITS_PER_MODULE]
    );
    return result.rows.map((r) => ({
      id: r.id,
      title: r.action || 'Audit Event',
      subtitle: [r.resource, r.email].filter(Boolean).join(' · '),
      icon: 'history',
    }));
  } catch {
    return [];
  }
}

async function searchFollowups(q, userId, isAdmin) {
  try {
    let sql = `
      SELECT f.id, f.followup_type, f.outcome, f.notes, f.lead_id,
             l.company_name, l.contact_person
      FROM followups f
      LEFT JOIN leads l ON f.lead_id = l.id
      WHERE (f.notes ILIKE $1 OR f.followup_type ILIKE $1 OR f.outcome ILIKE $1)
    `;
    const params = [`%${q}%`];
    let idx = 2;
    if (!isAdmin && userId) {
      sql += ` AND f.created_by = $${idx++}`;
      params.push(userId);
    }
    sql += ` ORDER BY f.created_at DESC LIMIT $${idx}`;
    params.push(HITS_PER_MODULE);

    const result = await query(sql, params);
    return result.rows.map((r) => ({
      id: r.id,
      title: `${r.followup_type} – ${r.outcome || 'N/A'}`,
      subtitle: [r.company_name || r.contact_person, r.notes?.substring(0, 60)].filter(Boolean).join(' · '),
      icon: 'phone',
    }));
  } catch {
    return [];
  }
}

exports.globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ data: {} });
    }

    const trimmed = q.trim();
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'Admin' || req.user?.role === 'admin';

    const [leads, users, categories, subCategories, services, notifications, auditLogs, followups] =
      await Promise.all([
        searchLeads(trimmed, userId, isAdmin),
        searchUsers(trimmed),
        searchCategories(trimmed),
        searchSubCategories(trimmed),
        searchServices(trimmed),
        searchNotifications(trimmed, userId),
        searchAuditLogs(trimmed),
        searchFollowups(trimmed, userId, isAdmin),
      ]);

    return res.json({
      data: {
        Leads: leads,
        Users: users,
        Categories: [...categories, ...subCategories],
        Services: services,
        Notifications: notifications,
        'Audit Logs': auditLogs,
        'Follow Ups': followups,
      },
    });
  } catch (err) {
    next(err);
  }
};
