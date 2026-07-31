const algoliaService = require('../utils/algoliaService');
const { query } = require('../config/db');

const HITS_PER_MODULE = 5;

// ---- PostgreSQL Fallback Functions ----

async function searchLeadsDB(q, userId, isAdmin) {
  try {
    const sql = `SELECT l.id, l.lead_id, l.company_name, l.contact_person, l.city, l.email
      FROM leads l
      WHERE l.deleted_at IS NULL
        AND (l.company_name ILIKE $1 OR l.contact_person ILIKE $1 OR l.mobile_number ILIKE $1
             OR l.email ILIKE $1 OR l.lead_id ILIKE $1)
      ${!isAdmin && userId ? 'AND l.assigned_to = $2' : ''}
      ORDER BY l.created_at DESC
      LIMIT ${HITS_PER_MODULE}`;
    const params = !isAdmin && userId ? [`%${q}%`, userId] : [`%${q}%`];
    const result = await query(sql, params);
    return (result.rows || []).map(r => ({
      id: r.id,
      title: r.company_name || r.contact_person || r.lead_id || 'Untitled Lead',
      subtitle: [r.contact_person, r.city, r.email].filter(Boolean).join(' · '),
      icon: 'work',
    }));
  } catch (err) {
    console.error('[DB Fallback] searchLeadsDB failed:', err.message);
    return [];
  }
}

async function searchUsersDB(q) {
  try {
    const sql = `SELECT id, name, email, role
      FROM users
      WHERE name ILIKE $1 OR email ILIKE $1 OR employee_id ILIKE $1
      ORDER BY "createdAt" DESC
      LIMIT ${HITS_PER_MODULE}`;
    const result = await query(sql, [`%${q}%`]);
    return (result.rows || []).map(r => ({
      id: r.id,
      title: r.name || r.email,
      subtitle: [r.role, r.email].filter(Boolean).join(' · '),
      icon: 'person',
    }));
  } catch (err) {
    console.error('[DB Fallback] searchUsersDB failed:', err.message);
    return [];
  }
}

async function searchCategoriesDB(q) {
  try {
    const sql = `SELECT id, category_name
      FROM business_categories
      WHERE status = 'Active' AND category_name ILIKE $1
      ORDER BY created_at DESC
      LIMIT ${HITS_PER_MODULE}`;
    const result = await query(sql, [`%${q}%`]);
    return (result.rows || []).map(r => ({
      id: r.id,
      title: r.category_name,
      subtitle: 'Business Category',
      icon: 'category',
    }));
  } catch (err) {
    console.error('[DB Fallback] searchCategoriesDB failed:', err.message);
    return [];
  }
}

async function searchSubCategoriesDB(q) {
  try {
    const sql = `SELECT bsc.id, bsc.sub_category_name, bc.category_name
      FROM business_sub_categories bsc
      LEFT JOIN business_categories bc ON bsc.category_id = bc.id
      WHERE bsc.status = 'Active' AND bsc.sub_category_name ILIKE $1
      ORDER BY bsc.created_at DESC
      LIMIT ${HITS_PER_MODULE}`;
    const result = await query(sql, [`%${q}%`]);
    return (result.rows || []).map(r => ({
      id: r.id,
      title: r.sub_category_name || r.category_name,
      subtitle: r.category_name ? `${r.category_name} > Sub-Category` : 'Sub-Category',
      icon: 'label',
    }));
  } catch (err) {
    console.error('[DB Fallback] searchSubCategoriesDB failed:', err.message);
    return [];
  }
}

async function searchServicesDB(q) {
  try {
    const sql = `SELECT id, name
      FROM services
      WHERE status = 'Active' AND name ILIKE $1
      ORDER BY created_at DESC
      LIMIT ${HITS_PER_MODULE}`;
    const result = await query(sql, [`%${q}%`]);
    return (result.rows || []).map(r => ({
      id: r.id,
      title: r.name,
      subtitle: 'Service',
      icon: 'settings',
    }));
  } catch (err) {
    console.error('[DB Fallback] searchServicesDB failed:', err.message);
    return [];
  }
}

async function searchNotificationsDB(q, userId) {
  try {
    const sql = `SELECT id, notification_type, message
      FROM notifications
      WHERE user_id = $1 AND message ILIKE $2
      ORDER BY created_at DESC
      LIMIT ${HITS_PER_MODULE}`;
    const result = await query(sql, [userId, `%${q}%`]);
    return (result.rows || []).map(r => ({
      id: r.id,
      title: r.notification_type || 'Notification',
      subtitle: r.message || '',
      icon: 'notifications',
    }));
  } catch (err) {
    console.error('[DB Fallback] searchNotificationsDB failed:', err.message);
    return [];
  }
}

async function searchAuditLogsDB(q) {
  try {
    const sql = `SELECT id, action, resource, email
      FROM audit_logs
      WHERE action ILIKE $1 OR resource ILIKE $1 OR details ILIKE $1 OR email ILIKE $1
      ORDER BY "createdAt" DESC
      LIMIT ${HITS_PER_MODULE}`;
    const result = await query(sql, [`%${q}%`]);
    return (result.rows || []).map(r => ({
      id: r.id,
      title: r.action || 'Audit Event',
      subtitle: [r.resource, r.email].filter(Boolean).join(' · '),
      icon: 'history',
    }));
  } catch (err) {
    console.error('[DB Fallback] searchAuditLogsDB failed:', err.message);
    return [];
  }
}

async function searchFollowupsDB(q, userId, isAdmin) {
  try {
    const whereClause = !isAdmin && userId
      ? `WHERE (f.notes ILIKE $1 OR f.followup_type ILIKE $1) AND f.created_by = $2`
      : `WHERE f.notes ILIKE $1 OR f.followup_type ILIKE $1`;
    const params = !isAdmin && userId ? [`%${q}%`, userId] : [`%${q}%`];
    const sql = `SELECT f.id, f.followup_type, f.outcome, f.notes, l.company_name, l.contact_person
      FROM followups f
      LEFT JOIN leads l ON f.lead_id = l.id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT ${HITS_PER_MODULE}`;
    const result = await query(sql, params);
    return (result.rows || []).map(r => ({
      id: r.id,
      title: `${r.followup_type} – ${r.outcome || 'N/A'}`,
      subtitle: [r.company_name || r.contact_person, r.notes?.substring(0, 60)].filter(Boolean).join(' · '),
      icon: 'phone',
    }));
  } catch (err) {
    console.error('[DB Fallback] searchFollowupsDB failed:', err.message);
    return [];
  }
}

// ---- Algolia Search Helpers with DB Fallback ----

async function searchLeads(q, userId, isAdmin) {
  try {
    const result = await algoliaService.searchLeads(q, {}, 1, HITS_PER_MODULE, isAdmin, userId);
    if (!result || !result.hits || result.hits.length === 0) {
      console.log('[Fallback] Using database for searchLeads');
      return searchLeadsDB(q, userId, isAdmin);
    }
    return result.hits.map((h) => ({
      id: h.id,
      title: h.company_name || h.contact_person || h.lead_id || 'Untitled Lead',
      subtitle: [h.contact_person, h.city, h.email].filter(Boolean).join(' · '),
      icon: 'work',
    }));
  } catch {
    console.log('[Fallback] Using database for searchLeads');
    return searchLeadsDB(q, userId, isAdmin);
  }
}

async function searchUsers(q) {
  try {
    const result = await algoliaService.searchUsers(q, {}, 1, HITS_PER_MODULE);
    if (!result || !result.hits || result.hits.length === 0) {
      console.log('[Fallback] Using database for searchUsers');
      return searchUsersDB(q);
    }
    return result.hits.map((h) => ({
      id: h.id,
      title: h.name || h.email,
      subtitle: [h.role, h.email].filter(Boolean).join(' · '),
      icon: 'person',
    }));
  } catch {
    console.log('[Fallback] Using database for searchUsers');
    return searchUsersDB(q);
  }
}

async function searchCategories(q) {
  try {
    const result = await algoliaService.searchCategories(q, 'Active', 1, HITS_PER_MODULE, 'category');
    if (!result || !result.hits || result.hits.length === 0) {
      console.log('[Fallback] Using database for searchCategories');
      return searchCategoriesDB(q);
    }
    return result.hits.map((h) => ({
      id: h.id,
      title: h.category_name || h.name,
      subtitle: 'Business Category',
      icon: 'category',
    }));
  } catch {
    console.log('[Fallback] Using database for searchCategories');
    return searchCategoriesDB(q);
  }
}

async function searchSubCategories(q) {
  try {
    const result = await algoliaService.searchCategories(q, 'Active', 1, HITS_PER_MODULE, 'subcategory');
    if (!result || !result.hits || result.hits.length === 0) {
      console.log('[Fallback] Using database for searchSubCategories');
      return searchSubCategoriesDB(q);
    }
    return result.hits.map((h) => ({
      id: h.id,
      title: h.subcategory_name || h.sub_category_name || h.category_name || h.name,
      subtitle: h.parent_category_name ? `${h.parent_category_name} > Sub-Category` : 'Sub-Category',
      icon: 'label',
    }));
  } catch {
    console.log('[Fallback] Using database for searchSubCategories');
    return searchSubCategoriesDB(q);
  }
}

async function searchServices(q) {
  try {
    const result = await algoliaService.searchServices(q, 'Active', 1, HITS_PER_MODULE);
    if (!result || !result.hits || result.hits.length === 0) {
      console.log('[Fallback] Using database for searchServices');
      return searchServicesDB(q);
    }
    return result.hits.map((h) => ({
      id: h.id,
      title: h.name,
      subtitle: 'Service',
      icon: 'settings',
    }));
  } catch {
    console.log('[Fallback] Using database for searchServices');
    return searchServicesDB(q);
  }
}

async function searchNotifications(q, userId) {
  try {
    const result = await algoliaService.searchNotifications(q, { user_id: userId }, 1, HITS_PER_MODULE);
    if (!result || !result.hits || result.hits.length === 0) {
      console.log('[Fallback] Using database for searchNotifications');
      return searchNotificationsDB(q, userId);
    }
    return result.hits.map((h) => ({
      id: h.id,
      title: h.notification_type || 'Notification',
      subtitle: h.message || '',
      icon: 'notifications',
    }));
  } catch {
    console.log('[Fallback] Using database for searchNotifications');
    return searchNotificationsDB(q, userId);
  }
}

async function searchAuditLogs(q) {
  try {
    const result = await algoliaService.searchAuditLogs(q, {}, 1, HITS_PER_MODULE);
    if (!result || !result.hits || result.hits.length === 0) {
      console.log('[Fallback] Using database for searchAuditLogs');
      return searchAuditLogsDB(q);
    }
    return result.hits.map((h) => ({
      id: h.id,
      title: h.action || 'Audit Event',
      subtitle: [h.resource, h.email].filter(Boolean).join(' · '),
      icon: 'history',
    }));
  } catch {
    console.log('[Fallback] Using database for searchAuditLogs');
    return searchAuditLogsDB(q);
  }
}

async function searchFollowups(q, userId, isAdmin) {
  try {
    const filters = {};
    if (!isAdmin && userId) {
      filters.created_by = userId;
    }
    const result = await algoliaService.searchFollowups(q, filters, 1, HITS_PER_MODULE);
    if (!result || !result.hits || result.hits.length === 0) {
      console.log('[Fallback] Using database for searchFollowups');
      return searchFollowupsDB(q, userId, isAdmin);
    }
    return result.hits.map((h) => ({
      id: h.id,
      title: `${h.followup_type} – ${h.outcome || 'N/A'}`,
      subtitle: [h.company_name || h.contact_person, h.notes?.substring(0, 60)].filter(Boolean).join(' · '),
      icon: 'phone',
    }));
  } catch {
    console.log('[Fallback] Using database for searchFollowups');
    return searchFollowupsDB(q, userId, isAdmin);
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
