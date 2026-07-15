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
    const result = await algoliaService.searchCategories(q, 'Active', 1, HITS_PER_MODULE, 'category');
    if (!result || !result.hits) return [];
    return result.hits.map((h) => ({
      id: h.id,
      title: h.category_name || h.name,
      subtitle: 'Business Category',
      icon: 'category',
    }));
  } catch {
    return [];
  }
}

async function searchSubCategories(q) {
  try {
    const result = await algoliaService.searchCategories(q, 'Active', 1, HITS_PER_MODULE, 'subcategory');
    if (!result || !result.hits) return [];
    return result.hits.map((h) => ({
      id: h.id,
      title: h.category_name || h.name,
      subtitle: h.parent_category_name ? `Sub-Category · ${h.parent_category_name}` : 'Sub-Category',
      icon: 'label',
    }));
  } catch {
    return [];
  }
}

async function searchServices(q) {
  try {
    const result = await algoliaService.searchServices(q, 'Active', 1, HITS_PER_MODULE);
    if (!result || !result.hits) return [];
    return result.hits.map((h) => ({
      id: h.id,
      title: h.name,
      subtitle: 'Service',
      icon: 'settings',
    }));
  } catch {
    return [];
  }
}

async function searchNotifications(q, userId) {
  try {
    const result = await algoliaService.searchNotifications(q, { user_id: userId }, 1, HITS_PER_MODULE);
    if (!result || !result.hits) return [];
    return result.hits.map((h) => ({
      id: h.id,
      title: h.notification_type || 'Notification',
      subtitle: h.message || '',
      icon: 'notifications',
    }));
  } catch {
    return [];
  }
}

async function searchAuditLogs(q) {
  try {
    const result = await algoliaService.searchAuditLogs(q, {}, 1, HITS_PER_MODULE);
    if (!result || !result.hits) return [];
    return result.hits.map((h) => ({
      id: h.id,
      title: h.action || 'Audit Event',
      subtitle: [h.resource, h.email].filter(Boolean).join(' · '),
      icon: 'history',
    }));
  } catch {
    return [];
  }
}

async function searchFollowups(q, userId, isAdmin) {
  try {
    const filters = {};
    if (!isAdmin && userId) {
      filters.created_by = userId;
    }
    const result = await algoliaService.searchFollowups(q, filters, 1, HITS_PER_MODULE);
    if (!result || !result.hits) return [];
    return result.hits.map((h) => ({
      id: h.id,
      title: `${h.followup_type} – ${h.outcome || 'N/A'}`,
      subtitle: [h.company_name || h.contact_person, h.notes?.substring(0, 60)].filter(Boolean).join(' · '),
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
