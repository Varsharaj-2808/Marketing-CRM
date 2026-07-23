const { algoliasearch } = require('algoliasearch');

const appId = process.env.ALGOLIA_APP_ID || '';
const writeKey = process.env.ALGOLIA_WRITE_KEY || '';
const searchKey = process.env.ALGOLIA_SEARCH_KEY || '';
const adminKey = process.env.ALGOLIA_ADMIN_KEY || '';

let writeClient = null;
let searchClient = null;
let adminClient = null;

if (appId && writeKey) {
  writeClient = algoliasearch(appId, writeKey);
}
if (appId && searchKey) {
  searchClient = algoliasearch(appId, searchKey);
}
if (appId && adminKey) {
  adminClient = algoliasearch(appId, adminKey);
} else if (appId && writeKey) {
  adminClient = algoliasearch(appId, writeKey);
}

// ---- Circuit Breaker ----
let algoliaBlocked = false;
let blockExpiry = 0;
let isRecovering = false;
const BLOCK_COOLDOWN_MS = 5 * 60 * 1000;

function isCurrentlyBlocked() {
  if (!algoliaBlocked) return false;
  if (Date.now() >= blockExpiry) {
    algoliaBlocked = false;
    blockExpiry = 0;
    console.log('[Algolia] Cooldown expired — retrying Algolia.');
    recoverAndReindex().catch(err => console.error('[Algolia] Recovery re-index failed:', err.message));
    return false;
  }
  return true;
}

function markBlocked() {
  if (!algoliaBlocked) {
    console.log('[Algolia] Algolia is currently unavailable. Switching to PostgreSQL fallback. Will retry in 5 minutes.');
  }
  algoliaBlocked = true;
  blockExpiry = Date.now() + BLOCK_COOLDOWN_MS;
}

function isBlockedError(err) {
  if (!err || !err.message) return false;
  const msg = err.message.toLowerCase();
  return msg.includes('blocked') || msg.includes('this operation cannot be processed')
    || msg.includes('forbidden') || msg.includes('unauthorized')
    || (err.statusCode === 403) || (err.statusCode === 429);
}

// ---- Recovery Re-Index ----
async function recoverAndReindex() {
  if (isRecovering) {
    console.log('[Algolia Recovery] Already in progress, skipping.');
    return;
  }
  isRecovering = true;
  const startTime = Date.now();
  console.log('[Algolia Recovery] Starting full re-index from PostgreSQL...');

  try {
    const { query } = require('../config/db');

    // 1. Users
    try {
      const userRes = await query(`SELECT id, "employee_id", name, email, mobile, role, "accountStatus" as status, department, "createdAt", "updatedAt" FROM users`);
      const users = userRes.rows;
      if (users.length > 0) {
        const cli = getWriteClient();
        const objects = users.map(u => ({
          objectID: u.id, id: u.id, employee_id: u.employee_id,
          name: u.name, employee_name: u.name, email: u.email, mobile: u.mobile,
          role: u.role, status: u.status, department: u.department, designation: u.designation || null,
          createdAt: u.createdAt, updatedAt: u.updatedAt,
        }));
        await cli.saveObjects({ indexName: USERS_INDEX, objects });
        console.log(`[Algolia Recovery] Users: ${users.length} indexed.`);
      }
      const userIDs = new Set(users.map(u => u.id));
      const algoliaUsers = await browseAllIndex(getSearchClient(), USERS_INDEX);
      const orphanedUsers = algoliaUsers.filter(id => !userIDs.has(id));
      if (orphanedUsers.length > 0) {
        const cli = getWriteClient();
        await cli.deleteObjects({ indexName: USERS_INDEX, objectIDs: orphanedUsers });
        console.log(`[Algolia Recovery] Users: ${orphanedUsers.length} orphaned records deleted.`);
      }
    } catch (err) {
      console.error('[Algolia Recovery] Users failed:', err.message);
    }

    // 2. Leads
    try {
      const leadRes = await query(
        `SELECT l.*, u.name as assigned_to_name, u.employee_id as assigned_employee_id,
                bc.category_name, bsc.sub_category_name, ls.name as lead_source_name
         FROM leads l
         LEFT JOIN users u ON l.assigned_to = u.id
         LEFT JOIN business_categories bc ON l.category = bc.id
         LEFT JOIN business_sub_categories bsc ON l.sub_category = bsc.id
         LEFT JOIN lead_sources ls ON l.lead_source = ls.id::text OR l.lead_source = ls.name`
      );
      const leads = leadRes.rows;
      if (leads.length > 0) {
        const resolvedLeads = await require('../models/Lead')._resolveServiceNames(leads);
        const cli = getWriteClient();
        const objects = resolvedLeads.map(lead => ({
          objectID: lead.id, id: lead.id, lead_id: lead.lead_id,
          company_name: lead.company_name, contact_person: lead.contact_person,
          mobile_number: lead.mobile_number, email: lead.email, website: lead.website,
          city: lead.city, state: lead.state, country: lead.country,
          lead_source: lead.lead_source_name || lead.lead_source,
          category: lead.category, category_name: lead.category_name || null,
          sub_category: lead.sub_category, sub_category_name: lead.sub_category_name || null,
          service_interested: lead.service_interested,
          priority: lead.priority,
          estimated_value: lead.estimated_value ? parseFloat(lead.estimated_value) : null,
          assigned_to: lead.assigned_to, assigned_employee_id: lead.assigned_employee_id || null,
          assigned_to_name: lead.assigned_to_name || null, stage: lead.stage,
          status: lead.lead_status || lead.status, created_at: lead.created_at,
          created_at_timestamp: lead.created_at ? Math.floor(new Date(lead.created_at).getTime() / 1000) : null,
          updated_at: lead.updated_at, assigned_at: lead.assigned_at,
          lost_reason: lead.lost_reason,
          final_deal_value: lead.final_deal_value ? parseFloat(lead.final_deal_value) : null,
          closure_date: lead.closure_date, next_followup_date: lead.next_followup_date,
        }));
        await cli.saveObjects({ indexName: LEADS_INDEX, objects });
        console.log(`[Algolia Recovery] Leads: ${leads.length} indexed.`);
      }
      const leadIDs = new Set(leads.map(l => l.id));
      const algoliaLeads = await browseAllIndex(getSearchClient(), LEADS_INDEX);
      const orphanedLeads = algoliaLeads.filter(id => !leadIDs.has(id));
      if (orphanedLeads.length > 0) {
        const cli = getWriteClient();
        await cli.deleteObjects({ indexName: LEADS_INDEX, objectIDs: orphanedLeads });
        console.log(`[Algolia Recovery] Leads: ${orphanedLeads.length} orphaned records deleted.`);
      }
    } catch (err) {
      console.error('[Algolia Recovery] Leads failed:', err.message);
    }

    // 3. Categories
    try {
      const catRes = await query(`SELECT * FROM business_categories`);
      const subCatRes = await query(`SELECT * FROM business_sub_categories`);
      const categories = catRes.rows.map(c => ({ ...c, type: 'category', category_name: c.category_name || c.name }));
      const subCategories = subCatRes.rows.map(s => ({ ...s, type: 'subcategory', category_name: s.sub_category_name || s.name }));
      const allCats = [...categories, ...subCategories];
      if (allCats.length > 0) {
        const cli = getWriteClient();
        const objects = allCats.map(c => ({
          objectID: c.id, id: c.id,
          category_name: c.category_name || c.name, name: c.category_name || c.name,
          subcategory_name: c.sub_category_name || null,
          sub_category_name: c.sub_category_name || null,
          parent_category_name: c.parent_category_name || null,
          status: c.status || (c.is_active ? 'Active' : 'Inactive'),
          isActive: c.is_active, type: c.type,
          category_id: c.category_id || null,
          createdAt: c.created_at || c.createdAt, updatedAt: c.updated_at || c.updatedAt,
        }));
        await cli.saveObjects({ indexName: CATEGORIES_INDEX, objects });
        console.log(`[Algolia Recovery] Categories: ${allCats.length} indexed.`);
      }
      const catIDs = new Set(allCats.map(c => c.id));
      const algoliaCats = await browseAllIndex(getSearchClient(), CATEGORIES_INDEX);
      const orphanedCats = algoliaCats.filter(id => !catIDs.has(id));
      if (orphanedCats.length > 0) {
        const cli = getWriteClient();
        await cli.deleteObjects({ indexName: CATEGORIES_INDEX, objectIDs: orphanedCats });
        console.log(`[Algolia Recovery] Categories: ${orphanedCats.length} orphaned records deleted.`);
      }
    } catch (err) {
      console.error('[Algolia Recovery] Categories failed:', err.message);
    }

    // 4. Services
    try {
      const svcRes = await query(`SELECT * FROM services`);
      const services = svcRes.rows;
      if (services.length > 0) {
        const cli = getWriteClient();
        const objects = services.map(s => ({
          objectID: s.id, id: s.id, name: s.name,
          status: s.status || (s.is_active ? 'Active' : 'Inactive'),
          isActive: s.is_active, createdAt: s.created_at || s.createdAt, updatedAt: s.updated_at || s.updatedAt,
        }));
        await cli.saveObjects({ indexName: SERVICES_INDEX, objects });
        console.log(`[Algolia Recovery] Services: ${services.length} indexed.`);
      }
      const svcIDs = new Set(services.map(s => s.id));
      const algoliaSvcs = await browseAllIndex(getSearchClient(), SERVICES_INDEX);
      const orphanedSvcs = algoliaSvcs.filter(id => !svcIDs.has(id));
      if (orphanedSvcs.length > 0) {
        const cli = getWriteClient();
        await cli.deleteObjects({ indexName: SERVICES_INDEX, objectIDs: orphanedSvcs });
        console.log(`[Algolia Recovery] Services: ${orphanedSvcs.length} orphaned records deleted.`);
      }
    } catch (err) {
      console.error('[Algolia Recovery] Services failed:', err.message);
    }

    // 5. Lead Sources
    try {
      const lsRes = await query(`SELECT * FROM lead_sources`);
      const sources = lsRes.rows;
      if (sources.length > 0) {
        const cli = getWriteClient();
        const objects = sources.map(s => ({
          objectID: s.id, id: s.id, name: s.name,
          status: s.status || (s.is_active ? 'Active' : 'Inactive'),
          isActive: s.is_active, createdAt: s.created_at || s.createdAt, updatedAt: s.updated_at || s.updatedAt,
        }));
        await cli.saveObjects({ indexName: LEAD_SOURCES_INDEX, objects });
        console.log(`[Algolia Recovery] Lead Sources: ${sources.length} indexed.`);
      }
      const lsIDs = new Set(sources.map(s => s.id));
      const algoliaLS = await browseAllIndex(getSearchClient(), LEAD_SOURCES_INDEX);
      const orphanedLS = algoliaLS.filter(id => !lsIDs.has(id));
      if (orphanedLS.length > 0) {
        const cli = getWriteClient();
        await cli.deleteObjects({ indexName: LEAD_SOURCES_INDEX, objectIDs: orphanedLS });
        console.log(`[Algolia Recovery] Lead Sources: ${orphanedLS.length} orphaned records deleted.`);
      }
    } catch (err) {
      console.error('[Algolia Recovery] Lead Sources failed:', err.message);
    }

    // 6. Notifications
    try {
      const notifRes = await query(`SELECT * FROM notifications`);
      const notifications = notifRes.rows;
      if (notifications.length > 0) {
        const cli = getWriteClient();
        const objects = notifications.map(n => ({
          objectID: n.id, id: n.id, user_id: n.user_id,
          notification_type: n.notification_type, message: n.message,
          is_read: n.is_read || false, created_at: n.created_at,
          created_at_timestamp: n.created_at ? Math.floor(new Date(n.created_at).getTime() / 1000) : null,
        }));
        await cli.saveObjects({ indexName: NOTIFICATIONS_INDEX, objects });
        console.log(`[Algolia Recovery] Notifications: ${notifications.length} indexed.`);
      }
      const notifIDs = new Set(notifications.map(n => n.id));
      const algoliaNotifs = await browseAllIndex(getSearchClient(), NOTIFICATIONS_INDEX);
      const orphanedNotifs = algoliaNotifs.filter(id => !notifIDs.has(id));
      if (orphanedNotifs.length > 0) {
        const cli = getWriteClient();
        await cli.deleteObjects({ indexName: NOTIFICATIONS_INDEX, objectIDs: orphanedNotifs });
        console.log(`[Algolia Recovery] Notifications: ${orphanedNotifs.length} orphaned records deleted.`);
      }
    } catch (err) {
      console.error('[Algolia Recovery] Notifications failed:', err.message);
    }

    // 7. Audit Logs
    try {
      const auditRes = await query(
        `SELECT a.*, u.name as actor_name, u.role as actor_role
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.id`
      );
      const logs = auditRes.rows;
      if (logs.length > 0) {
        const cli = getWriteClient();
        const objects = logs.map(log => {
          const createdAtVal = log.created_at || log.createdAt;
          return {
            objectID: log.id, id: log.id,
            userId: log.user_id || log.userId, email: log.email, action: log.action,
            resource: log.resource, resourceId: log.resourceId,
            entity_name: log.entity_name || log.resourceId || '',
            details: log.details, ipAddress: log.ipAddress,
            userAgent: log.userAgent, result: log.result,
            created_at: createdAtVal,
            created_at_timestamp: createdAtVal ? Math.floor(new Date(createdAtVal).getTime() / 1000) : null,
            actor_name: log.actor_name || null, actor_role: log.actor_role || null,
          };
        });
        await cli.saveObjects({ indexName: AUDIT_LOGS_INDEX, objects });
        console.log(`[Algolia Recovery] Audit Logs: ${logs.length} indexed.`);
      }
      const auditIDs = new Set(logs.map(l => l.id));
      const algoliaAudit = await browseAllIndex(getSearchClient(), AUDIT_LOGS_INDEX);
      const orphanedAudit = algoliaAudit.filter(id => !auditIDs.has(id));
      if (orphanedAudit.length > 0) {
        const cli = getWriteClient();
        await cli.deleteObjects({ indexName: AUDIT_LOGS_INDEX, objectIDs: orphanedAudit });
        console.log(`[Algolia Recovery] Audit Logs: ${orphanedAudit.length} orphaned records deleted.`);
      }
    } catch (err) {
      console.error('[Algolia Recovery] Audit Logs failed:', err.message);
    }

    // 8. Followups
    try {
      const fupRes = await query(
        `SELECT f.*, l.company_name, l.contact_person, l.priority as lead_quality
         FROM followups f
         LEFT JOIN leads l ON f.lead_id = l.id`
      );
      const followups = fupRes.rows;
      if (followups.length > 0) {
        const cli = getWriteClient();
        const objects = followups.map(f => ({
          objectID: f.id, id: f.id, lead_id: f.lead_id,
          company_name: f.company_name, contact_person: f.contact_person,
          lead_quality: f.lead_quality, followup_type: f.followup_type,
          outcome: f.outcome, notes: f.notes, created_by: f.created_by,
          created_at: f.created_at,
          created_at_timestamp: f.created_at ? Math.floor(new Date(f.created_at).getTime() / 1000) : null,
          next_followup_date: f.next_followup_date,
          next_followup_date_timestamp: f.next_followup_date ? Math.floor(new Date(f.next_followup_date).getTime() / 1000) : null,
        }));
        await cli.saveObjects({ indexName: FOLLOWUPS_INDEX, objects });
        console.log(`[Algolia Recovery] Followups: ${followups.length} indexed.`);
      }
      const fupIDs = new Set(followups.map(f => f.id));
      const algoliaFups = await browseAllIndex(getSearchClient(), FOLLOWUPS_INDEX);
      const orphanedFups = algoliaFups.filter(id => !fupIDs.has(id));
      if (orphanedFups.length > 0) {
        const cli = getWriteClient();
        await cli.deleteObjects({ indexName: FOLLOWUPS_INDEX, objectIDs: orphanedFups });
        console.log(`[Algolia Recovery] Followups: ${orphanedFups.length} orphaned records deleted.`);
      }
    } catch (err) {
      console.error('[Algolia Recovery] Followups failed:', err.message);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Algolia Recovery] Full re-index completed in ${elapsed}s. Algolia is now consistent with PostgreSQL.`);
  } catch (err) {
    console.error('[Algolia Recovery] Unexpected error:', err.message);
  } finally {
    isRecovering = false;
  }
}

async function startupAutoIndex() {
  if (!writeClient || !searchClient) {
    console.log('[Algolia Startup] Algolia not configured, skipping auto-index.');
    return;
  }
  try {
    const indices = [USERS_INDEX, LEADS_INDEX, CATEGORIES_INDEX, SERVICES_INDEX, LEAD_SOURCES_INDEX, NOTIFICATIONS_INDEX, AUDIT_LOGS_INDEX, FOLLOWUPS_INDEX];
    const emptyIndices = [];
    for (const idx of indices) {
      try {
        const r = await searchClient.searchSingleIndex({
          indexName: idx,
          searchParams: { query: '', hitsPerPage: 0 },
        });
        if (r.nbHits === 0) emptyIndices.push(idx);
      } catch (err) {
        emptyIndices.push(idx);
      }
    }
    if (emptyIndices.length > 0) {
      console.log(`[Algolia Startup] Empty indexes detected: ${emptyIndices.join(', ')}. Starting full re-index from PostgreSQL...`);
      await recoverAndReindex();
    } else {
      console.log('[Algolia Startup] All indexes populated, no re-index needed.');
    }
  } catch (err) {
    console.error('[Algolia Startup] Auto-index check failed:', err.message);
  }
}

async function browseAllIndex(client, indexName) {
  const ids = [];
  let page = 0;
  let nbPages = 1;
  try {
    do {
      const result = await client.searchSingleIndex({
        indexName,
        searchParams: { query: '', page, hitsPerPage: 1000, attributesToRetrieve: ['objectID'] },
      });
      if (!result) break;
      nbPages = result.nbPages || 1;
      (result.hits || []).forEach(h => ids.push(h.objectID));
      page++;
    } while (page < nbPages);
  } catch (err) {
    console.error(`[Algolia Recovery] browseAllIndex failed for ${indexName}:`, err.message);
  }
  return ids;
}

const getWriteClient = () => {
  if (!writeClient) {
    throw new Error('Algolia write client not initialized. Check ALGOLIA_APP_ID and ALGOLIA_WRITE_KEY.');
  }
  return writeClient;
};

const getSearchClient = () => {
  if (!searchClient) {
    throw new Error('Algolia search client not initialized. Check ALGOLIA_APP_ID and ALGOLIA_SEARCH_KEY.');
  }
  return searchClient;
};

const getAdminClient = () => {
  if (!adminClient) {
    throw new Error('Algolia admin client not initialized. Check ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY.');
  }
  return adminClient;
};

// Index names
const USERS_INDEX = 'users';
const LEADS_INDEX = 'leads';
const CATEGORIES_INDEX = 'categories';
const SERVICES_INDEX = 'services';
const LEAD_SOURCES_INDEX = 'lead_sources';
const NOTIFICATIONS_INDEX = 'notifications';
const AUDIT_LOGS_INDEX = 'audit_logs';
const FOLLOWUPS_INDEX = 'followups';

// Configure indices settings
async function initIndices() {
  if (isCurrentlyBlocked()) {
    console.log('[Algolia] Skipping initIndices — Algolia is blocked. Will retry after cooldown.');
    return;
  }
  const client = getAdminClient();
  if (!client) return;
  try {
    await client.setSettings({
      indexName: USERS_INDEX,
      indexSettings: {
        searchableAttributes: ['name', 'email', 'employee_id', 'mobile', 'department', 'designation'],
        attributesForFaceting: ['role', 'status', 'department', 'designation', 'createdAt', 'updatedAt'],
        customRanking: ['desc(createdAt)'],
      }
    });

    await client.setSettings({
      indexName: LEADS_INDEX,
      indexSettings: {
        searchableAttributes: [
          'company_name', 'contact_person', 'mobile_number', 'email', 'lead_source',
          'lead_id', 'city', 'state', 'country', 'service_interested', 'assigned_to_name',
          'category_name', 'sub_category_name', 'website'
        ],
        attributesForFaceting: [
          'stage', 'priority', 'lead_source', 'category', 'sub_category',
          'category_name', 'sub_category_name',
          'assigned_to', 'assigned_employee_id', 'status', 'city', 'state', 'country', 'created_at', 'updated_at'
        ],
        customRanking: ['desc(created_at_timestamp)'],
      }
    });

    await client.setSettings({
      indexName: CATEGORIES_INDEX,
      indexSettings: {
        searchableAttributes: ['category_name', 'name', 'subcategory_name', 'sub_category_name', 'parent_category_name'],
        attributesForFaceting: ['status', 'type', 'parent_category_name'],
        customRanking: ['desc(createdAt)'],
      }
    });

    await client.setSettings({
      indexName: SERVICES_INDEX,
      indexSettings: {
        searchableAttributes: ['name'],
        attributesForFaceting: ['status'],
        customRanking: ['desc(createdAt)'],
      }
    });

    await client.setSettings({
      indexName: LEAD_SOURCES_INDEX,
      indexSettings: {
        searchableAttributes: ['name'],
        attributesForFaceting: ['status'],
        customRanking: ['desc(createdAt)'],
      }
    });

    await client.setSettings({
      indexName: NOTIFICATIONS_INDEX,
      indexSettings: {
        searchableAttributes: ['message', 'notification_type'],
        attributesForFaceting: ['user_id', 'notification_type', 'is_read', 'read_at'],
        customRanking: ['desc(created_at_timestamp)'],
      }
    });

    await client.setSettings({
      indexName: AUDIT_LOGS_INDEX,
      indexSettings: {
        searchableAttributes: ['action', 'resource', 'details', 'email', 'actor_name', 'actor_role', 'userId', 'resourceId', 'result', 'ipAddress', 'entity_name'],
        attributesForFaceting: ['email', 'action', 'resource', 'result', 'userId', 'actor_name', 'actor_role', 'entity_name'],
        customRanking: ['desc(created_at_timestamp)'],
      }
    });

    await client.setSettings({
      indexName: FOLLOWUPS_INDEX,
      indexSettings: {
        searchableAttributes: ['notes', 'followup_type', 'outcome'],
        attributesForFaceting: ['followup_type', 'outcome', 'lead_id', 'created_by'],
        customRanking: ['desc(created_at_timestamp)'],
      }
    });

    console.log('[Algolia] Index settings configured successfully.');
  } catch (err) {
    if (isBlockedError(err)) {
      markBlocked();
    } else {
      console.error('[Algolia] initIndices failed:', err.message);
    }
  }
}

initIndices().catch(() => {});

module.exports = {
  async testConnection() {
    if (isCurrentlyBlocked()) return false;
    try {
      const cli = getAdminClient();
      const res = await cli.listIndices();
      return !!res;
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] testConnection failed:', err.message); }
      return false;
    }
  },

  // ---- Users Sync ----
  async saveUser(user) {
    if (!user) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      const record = {
        objectID: user.id,
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        employee_name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        status: user.accountStatus || user.status,
        department: user.department || null,
        designation: user.designation || null,
        createdAt: user.createdAt || user.created_at,
        updatedAt: user.updatedAt || user.updated_at,
      };
      await cli.saveObject({
        indexName: USERS_INDEX,
        body: record,
      });

      if (user.id && user.name) {
        await this.syncLeadsForUser(user.id, user.name);
      }
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] saveUser failed:', err.message); }
    }
  },

  async deleteUser(id) {
    if (!id) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      await cli.deleteObject({
        indexName: USERS_INDEX,
        objectID: id,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] deleteUser failed:', err.message); }
    }
  },

  async searchUsers(searchQuery, filters = {}, page = 1, limit = 20) {
    if (isCurrentlyBlocked()) return null;
    try {
      const cli = getSearchClient();
      const facetFilters = [];
      if (filters.role && filters.role !== 'All') {
        facetFilters.push(`role:${filters.role}`);
      }
      if (filters.status && filters.status !== 'All') {
        facetFilters.push(`status:${filters.status}`);
      }
      if (filters.department && filters.department !== 'All') {
        facetFilters.push(`department:${filters.department}`);
      }
      if (filters.designation && filters.designation !== 'All') {
        facetFilters.push(`designation:${filters.designation}`);
      }

      const searchParams = {
        query: searchQuery || '',
        page: Math.max(0, page - 1),
        hitsPerPage: limit,
      };

      if (facetFilters.length > 0) {
        searchParams.facetFilters = facetFilters;
      }

      const result = await cli.searchSingleIndex({
        indexName: USERS_INDEX,
        searchParams,
      });

      console.log('[Algolia] Search succeeded: searchUsers');
      return result;
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); return null; }
      console.error('[Algolia] searchUsers failed:', err.message);
      return null;
    }
  },

  async indexAllUsers(users) {
    if (!users || users.length === 0) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      const objects = users.map(user => ({
        objectID: user.id,
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        employee_name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        status: user.accountStatus || user.status,
        department: user.department || null,
        designation: user.designation || null,
        createdAt: user.createdAt || user.created_at,
        updatedAt: user.updatedAt || user.updated_at,
      }));
      await cli.saveObjects({
        indexName: USERS_INDEX,
        objects,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] indexAllUsers failed:', err.message); }
    }
  },

  // ---- Leads Sync ----
  async saveLead(lead) {
    if (!lead) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      const record = {
        objectID: lead.id,
        id: lead.id,
        lead_id: lead.lead_id,
        company_name: lead.company_name,
        contact_person: lead.contact_person,
        mobile_number: lead.mobile_number,
        email: lead.email,
        website: lead.website,
        city: lead.city,
        state: lead.state,
        country: lead.country,
        lead_source: lead.lead_source_name || lead.lead_source,
        category: lead.category,
        category_name: lead.category_name || null,
        sub_category: lead.sub_category,
        sub_category_name: lead.sub_category_name || null,
        service_interested: await (async () => {
          let svcs = lead.service_interested;
          if (!svcs) return null;
          let parsed = svcs;
          const isString = typeof parsed === 'string';
          if (isString) {
            try { parsed = JSON.parse(parsed); } catch (e) {}
          }
          const isArray = Array.isArray(parsed);
          const arr = isArray ? parsed : [parsed];
          const uuids = arr.filter(v => v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v)));
          if (uuids.length > 0) {
            try {
              const { query } = require('../config/db');
              const res = await query(`SELECT id::text, name FROM services WHERE id::text = ANY($1)`, [uuids]);
              const map = {};
              res.rows.forEach(r => map[r.id] = r.name);
              if (isArray) return arr.map(v => map[String(v)] || String(v));
              const mapped = map[String(parsed)] || String(parsed);
              return isString ? mapped : [mapped];
            } catch (e) {}
          }
          return svcs;
        })(),
        priority: lead.priority,
        estimated_value: lead.estimated_value ? parseFloat(lead.estimated_value) : null,
        assigned_to: lead.assigned_to,
        assigned_employee_id: lead.assigned_employee_id || null,
        assigned_to_name: lead.assigned_to_name || null,
        stage: lead.stage,
        status: lead.lead_status || lead.status,
        created_at: lead.created_at,
        created_at_timestamp: lead.created_at ? Math.floor(new Date(lead.created_at).getTime() / 1000) : null,
        updated_at: lead.updated_at,
        assigned_at: lead.assigned_at,
        lost_reason: lead.lost_reason,
        final_deal_value: lead.final_deal_value ? parseFloat(lead.final_deal_value) : null,
        closure_date: lead.closure_date,
        next_followup_date: lead.next_followup_date,
      };
      await cli.saveObject({
        indexName: LEADS_INDEX,
        body: record,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] saveLead failed:', err.message); }
    }
  },

  async getAllLeadIdsBySearch(searchQuery, filters = {}, isAdmin = false, userId = null) {
    if (isCurrentlyBlocked()) return null;
    try {
      const cli = getSearchClient();
      if (!cli) return null;

      const facetFilters = [];
      if (!isAdmin && userId) facetFilters.push(`assigned_to:${userId}`);
      if (filters.priority && filters.priority !== 'All') facetFilters.push(`priority:${filters.priority}`);
      if (filters.stage && filters.stage !== 'All') {
        let stg = filters.stage === 'New Lead' ? 'New' : filters.stage;
        facetFilters.push(`stage:${stg}`);
      }
      if (filters.status && filters.status !== 'All') facetFilters.push(`status:${filters.status}`);
      if (filters.category && filters.category !== 'All') facetFilters.push(`category:${filters.category}`);
      if (filters.sub_category && filters.sub_category !== 'All') facetFilters.push(`sub_category:${filters.sub_category}`);
      if (filters.lead_source && filters.lead_source !== 'All') facetFilters.push(`lead_source:${filters.lead_source}`);
      if (filters.assigned_to && filters.assigned_to !== 'All') {
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        facetFilters.push(uuidRe.test(filters.assigned_to)
          ? `assigned_to:${filters.assigned_to}`
          : `assigned_employee_id:${filters.assigned_to}`);
      }

      const numericFilters = [];
      if (filters.from_date) {
        numericFilters.push(`created_at_timestamp >= ${Math.floor(new Date(filters.from_date).getTime() / 1000)}`);
      }
      if (filters.to_date) {
        const toStr = filters.to_date.includes('T') ? filters.to_date : `${filters.to_date}T23:59:59.999Z`;
        numericFilters.push(`created_at_timestamp <= ${Math.floor(new Date(toStr).getTime() / 1000)}`);
      }

      const ids = [];
      let page = 0;
      let nbPages = 1;
      const PAGE_SIZE = 1000;

      do {
        const searchParams = {
          query: searchQuery || '',
          page,
          hitsPerPage: PAGE_SIZE,
          attributesToRetrieve: ['objectID'],
        };
        if (facetFilters.length > 0) searchParams.facetFilters = facetFilters;
        if (numericFilters.length > 0) searchParams.numericFilters = numericFilters;

        const result = await cli.searchSingleIndex({ indexName: LEADS_INDEX, searchParams });
        if (!result) break;
        nbPages = result.nbPages || 1;
        (result.hits || []).forEach(h => ids.push(h.objectID));
        page++;
      } while (page < nbPages);

      return ids;
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); return null; }
      console.error('[Algolia] getAllLeadIdsBySearch failed:', err.message);
      return null;
    }
  },

  async deleteLead(id) {
    if (!id) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      await cli.deleteObject({
        indexName: LEADS_INDEX,
        objectID: id,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] deleteLead failed:', err.message); }
    }
  },

  async searchLeads(searchQuery, filters = {}, page = 1, limit = 20, isAdmin = false, userId = null) {
    if (isCurrentlyBlocked()) return null;
    try {
      const cli = getSearchClient();
      const facetFilters = [];
      let hasAssignedToFilter = false;

      if (!isAdmin && userId) {
        facetFilters.push(`assigned_to:${userId}`);
        hasAssignedToFilter = true;
      }

      if (filters.priority && filters.priority !== 'All') {
        facetFilters.push(`priority:${filters.priority}`);
      }
      if (filters.stage && filters.stage !== 'All') {
        let stg = filters.stage;
        if (stg === 'New Lead') stg = 'New';
        facetFilters.push(`stage:${stg}`);
      }
      if (filters.status && filters.status !== 'All') {
        facetFilters.push(`status:${filters.status}`);
      }
      if (filters.category && filters.category !== 'All') {
        facetFilters.push(`category:${filters.category}`);
      }
      if (filters.sub_category && filters.sub_category !== 'All') {
        facetFilters.push(`sub_category:${filters.sub_category}`);
      }
      if (filters.lead_source && filters.lead_source !== 'All') {
        facetFilters.push(`lead_source:${filters.lead_source}`);
      }
      if (filters.assigned_to && filters.assigned_to !== 'All') {
        if (filters.assigned_to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          facetFilters.push(`assigned_to:${filters.assigned_to}`);
        } else {
          facetFilters.push(`assigned_employee_id:${filters.assigned_to}`);
        }
      }
      if (filters.city && filters.city !== 'All') {
        facetFilters.push(`city:${filters.city}`);
      }
      if (filters.state && filters.state !== 'All') {
        facetFilters.push(`state:${filters.state}`);
      }
      if (filters.country && filters.country !== 'All') {
        facetFilters.push(`country:${filters.country}`);
      }

      const numericFilters = [];
      if (filters.from_date) {
        const fromTimestamp = Math.floor(new Date(filters.from_date).getTime() / 1000);
        numericFilters.push(`created_at_timestamp >= ${fromTimestamp}`);
      }
      if (filters.to_date) {
        const toDateStr = filters.to_date.includes('T') ? filters.to_date : `${filters.to_date}T23:59:59.999Z`;
        const toTimestamp = Math.floor(new Date(toDateStr).getTime() / 1000);
        numericFilters.push(`created_at_timestamp <= ${toTimestamp}`);
      }

      const searchParams = {
        query: searchQuery || '',
        page: Math.max(0, page - 1),
        hitsPerPage: limit,
      };

      if (facetFilters.length > 0) {
        searchParams.facetFilters = facetFilters;
      }
      if (numericFilters.length > 0) {
        searchParams.numericFilters = numericFilters;
      }

      const result = await cli.searchSingleIndex({
        indexName: LEADS_INDEX,
        searchParams,
      });

      if (hasAssignedToFilter && result && result.nbHits === 0) {
        const retryFilters = facetFilters.filter(f => !f.startsWith('assigned_to:'));
        const retryParams = { ...searchParams, hitsPerPage: 0 };
        if (retryFilters.length > 0) {
          retryParams.facetFilters = retryFilters;
        } else {
          delete retryParams.facetFilters;
        }
        const countResult = await cli.searchSingleIndex({
          indexName: LEADS_INDEX,
          searchParams: retryParams,
        });
        if (countResult && countResult.nbHits > 0) {
          return null;
        }
      }

      console.log('[Algolia] Search succeeded: searchLeads');
      return result;
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); return null; }
      console.error('[Algolia] searchLeads failed:', err.message);
      return null;
    }
  },

  async indexAllLeads(leads) {
    if (!leads || leads.length === 0) return;
    if (isCurrentlyBlocked()) return;
    try {
      const Lead = require('../models/Lead');
      const resolvedLeads = await Lead._resolveServiceNames(leads);
      const cli = getWriteClient();
      const objects = resolvedLeads.map(lead => ({
        objectID: lead.id,
        id: lead.id,
        lead_id: lead.lead_id,
        company_name: lead.company_name,
        contact_person: lead.contact_person,
        mobile_number: lead.mobile_number,
        email: lead.email,
        website: lead.website,
        city: lead.city,
        state: lead.state,
        country: lead.country,
        lead_source: lead.lead_source_name || lead.lead_source,
        category: lead.category,
        category_name: lead.category_name || null,
        sub_category: lead.sub_category,
        sub_category_name: lead.sub_category_name || null,
        service_interested: lead.service_interested,
        priority: lead.priority,
        estimated_value: lead.estimated_value ? parseFloat(lead.estimated_value) : null,
        assigned_to: lead.assigned_to,
        assigned_employee_id: lead.assigned_employee_id || null,
        assigned_to_name: lead.assigned_to_name || null,
        stage: lead.stage,
        status: lead.lead_status || lead.status,
        created_at: lead.created_at,
        created_at_timestamp: lead.created_at ? Math.floor(new Date(lead.created_at).getTime() / 1000) : null,
        updated_at: lead.updated_at,
        assigned_at: lead.assigned_at,
        lost_reason: lead.lost_reason,
        final_deal_value: lead.final_deal_value ? parseFloat(lead.final_deal_value) : null,
        closure_date: lead.closure_date,
        next_followup_date: lead.next_followup_date,
      }));
      await cli.saveObjects({
        indexName: LEADS_INDEX,
        objects,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] indexAllLeads failed:', err.message); }
    }
  },

  // ---- Categories Sync ----
  async saveCategory(cat) {
    if (!cat) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      const record = {
        objectID: cat.id,
        id: cat.id,
        category_name: cat.category_name || cat.name,
        name: cat.category_name || cat.name,
        subcategory_name: cat.subcategory_name || cat.sub_category_name || null,
        sub_category_name: cat.subcategory_name || cat.sub_category_name || null,
        parent_category_name: cat.parent_category_name || null,
        status: cat.status || (cat.isActive ? 'Active' : 'Inactive'),
        isActive: cat.isActive ?? (cat.status === 'Active'),
        type: cat.type || 'category',
        category_id: cat.category_id || null,
        createdAt: cat.createdAt || cat.created_at,
        updatedAt: cat.updatedAt || cat.updated_at,
      };
      await cli.saveObject({
        indexName: CATEGORIES_INDEX,
        body: record,
      });

      if (cat.type === 'category' && cat.id && (cat.category_name || cat.name)) {
        await this.syncLeadsForCategory(cat.id, cat.category_name || cat.name);
      }
      if (cat.type === 'subcategory' && cat.id) {
        await this.syncLeadsForSubCategory(cat.id, cat.subcategory_name || cat.sub_category_name || cat.category_name || cat.name);
      }
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] saveCategory failed:', err.message); }
    }
  },

  async deleteCategory(id) {
    if (!id) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      await cli.deleteObject({
        indexName: CATEGORIES_INDEX,
        objectID: id,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] deleteCategory failed:', err.message); }
    }
  },

  async searchCategories(searchQuery, status = 'All', page = 1, limit = 20, type = null, parentCategoryName = null) {
    if (isCurrentlyBlocked()) return null;
    try {
      const cli = getSearchClient();
      const facetFilters = [];
      if (status && status !== 'All') {
        facetFilters.push(`status:${status}`);
      }
      if (type) {
        facetFilters.push(`type:${type}`);
      }
      if (parentCategoryName) {
        facetFilters.push(`parent_category_name:${parentCategoryName}`);
      }
      const searchParams = {
        query: searchQuery || '',
        page: Math.max(0, page - 1),
        hitsPerPage: limit,
      };
      if (facetFilters.length > 0) {
        searchParams.facetFilters = facetFilters;
      }
      const result = await cli.searchSingleIndex({
        indexName: CATEGORIES_INDEX,
        searchParams,
      });
      console.log('[Algolia] Search succeeded: searchCategories');
      return result;
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); return null; }
      console.error('[Algolia] searchCategories failed:', err.message);
      return null;
    }
  },

  async indexAllCategories(categories) {
    if (!categories || categories.length === 0) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      const objects = categories.map(cat => ({
        objectID: cat.id,
        id: cat.id,
        category_name: cat.category_name || cat.name,
        name: cat.category_name || cat.name,
        subcategory_name: cat.subcategory_name || cat.sub_category_name || null,
        sub_category_name: cat.subcategory_name || cat.sub_category_name || null,
        parent_category_name: cat.parent_category_name || null,
        status: cat.status || (cat.isActive ? 'Active' : 'Inactive'),
        isActive: cat.isActive ?? (cat.status === 'Active'),
        type: cat.type || 'category',
        category_id: cat.category_id || null,
        createdAt: cat.createdAt || cat.created_at,
        updatedAt: cat.updatedAt || cat.updated_at,
      }));
      await cli.saveObjects({
        indexName: CATEGORIES_INDEX,
        objects,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] indexAllCategories failed:', err.message); }
    }
  },

  // ---- Services Sync ----
  async saveService(service) {
    if (!service) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      const record = {
        objectID: service.id,
        id: service.id,
        name: service.name,
        status: service.status || (service.isActive ? 'Active' : 'Inactive'),
        isActive: service.isActive ?? (service.status === 'Active'),
        createdAt: service.createdAt || service.created_at,
        updatedAt: service.updatedAt || service.updated_at,
      };
      await cli.saveObject({
        indexName: SERVICES_INDEX,
        body: record,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] saveService failed:', err.message); }
    }
  },

  async deleteService(id) {
    if (!id) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      await cli.deleteObject({
        indexName: SERVICES_INDEX,
        objectID: id,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] deleteService failed:', err.message); }
    }
  },

  async searchServices(searchQuery, status = 'All', page = 1, limit = 20) {
    if (isCurrentlyBlocked()) return null;
    try {
      const cli = getSearchClient();
      const facetFilters = [];
      if (status && status !== 'All') {
        facetFilters.push(`status:${status}`);
      }
      const searchParams = {
        query: searchQuery || '',
        page: Math.max(0, page - 1),
        hitsPerPage: limit,
      };
      if (facetFilters.length > 0) {
        searchParams.facetFilters = facetFilters;
      }
      const result = await cli.searchSingleIndex({
        indexName: SERVICES_INDEX,
        searchParams,
      });
      console.log('[Algolia] Search succeeded: searchServices');
      return result;
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); return null; }
      console.error('[Algolia] searchServices failed:', err.message);
      return null;
    }
  },

  async indexAllServices(services) {
    if (!services || services.length === 0) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      const objects = services.map(svc => ({
        objectID: svc.id,
        id: svc.id,
        name: svc.name,
        status: svc.status || (svc.isActive ? 'Active' : 'Inactive'),
        isActive: svc.isActive ?? (svc.status === 'Active'),
        createdAt: svc.createdAt || svc.created_at,
        updatedAt: svc.updatedAt || svc.updated_at,
      }));
      await cli.saveObjects({
        indexName: SERVICES_INDEX,
        objects,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] indexAllServices failed:', err.message); }
    }
  },

  // ---- Lead Sources Sync ----
  async saveLeadSource(source) {
    if (!source) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      const record = {
        objectID: source.id,
        id: source.id,
        name: source.name,
        status: source.status || (source.isActive ? 'Active' : 'Inactive'),
        isActive: source.isActive ?? (source.status === 'Active'),
        createdAt: source.createdAt || source.created_at,
        updatedAt: source.updatedAt || source.updated_at,
      };
      await cli.saveObject({
        indexName: LEAD_SOURCES_INDEX,
        body: record,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] saveLeadSource failed:', err.message); }
    }
  },

  async deleteLeadSource(id) {
    if (!id) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      await cli.deleteObject({
        indexName: LEAD_SOURCES_INDEX,
        objectID: id,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] deleteLeadSource failed:', err.message); }
    }
  },

  async searchLeadSources(searchQuery, status = 'All', page = 1, limit = 20) {
    if (isCurrentlyBlocked()) return null;
    try {
      const cli = getSearchClient();
      const facetFilters = [];
      if (status && status !== 'All') {
        facetFilters.push(`status:${status}`);
      }
      const searchParams = {
        query: searchQuery || '',
        page: Math.max(0, page - 1),
        hitsPerPage: limit,
      };
      if (facetFilters.length > 0) {
        searchParams.facetFilters = facetFilters;
      }
      const result = await cli.searchSingleIndex({
        indexName: LEAD_SOURCES_INDEX,
        searchParams,
      });
      console.log('[Algolia] Search succeeded: searchLeadSources');
      return result;
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); return null; }
      console.error('[Algolia] searchLeadSources failed:', err.message);
      return null;
    }
  },

  async indexAllLeadSources(sources) {
    if (!sources || sources.length === 0) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      const objects = sources.map(src => ({
        objectID: src.id,
        id: src.id,
        name: src.name,
        status: src.status || (src.isActive ? 'Active' : 'Inactive'),
        isActive: src.isActive ?? (src.status === 'Active'),
        createdAt: src.createdAt || src.created_at,
        updatedAt: src.updatedAt || src.updated_at,
      }));
      await cli.saveObjects({
        indexName: LEAD_SOURCES_INDEX,
        objects,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] indexAllLeadSources failed:', err.message); }
    }
  },

  // ---- Notifications Sync ----
  async saveNotification(notif) {
    if (!notif) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      const record = {
        objectID: notif.id,
        id: notif.id,
        user_id: notif.user_id,
        notification_type: notif.notification_type,
        message: notif.message,
        is_read: notif.is_read || false,
        created_at: notif.created_at,
        created_at_timestamp: notif.created_at ? Math.floor(new Date(notif.created_at).getTime() / 1000) : null,
      };
      await cli.saveObject({
        indexName: NOTIFICATIONS_INDEX,
        body: record,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] saveNotification failed:', err.message); }
    }
  },

  async deleteNotification(id) {
    if (!id) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      await cli.deleteObject({
        indexName: NOTIFICATIONS_INDEX,
        objectID: id,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] deleteNotification failed:', err.message); }
    }
  },

  async searchNotifications(searchQuery, filters = {}, page = 1, limit = 20) {
    if (isCurrentlyBlocked()) return null;
    try {
      const cli = getSearchClient();
      const facetFilters = [];
      if (filters.user_id) {
        facetFilters.push(`user_id:${filters.user_id}`);
      }
      if (filters.is_read !== undefined && filters.is_read !== null) {
        facetFilters.push(`is_read:${filters.is_read}`);
      }
      const searchParams = {
        query: searchQuery || '',
        page: Math.max(0, page - 1),
        hitsPerPage: limit,
      };
      if (facetFilters.length > 0) {
        searchParams.facetFilters = facetFilters;
      }
      const result = await cli.searchSingleIndex({
        indexName: NOTIFICATIONS_INDEX,
        searchParams,
      });
      console.log('[Algolia] Search succeeded: searchNotifications');
      return result;
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); return null; }
      console.error('[Algolia] searchNotifications failed:', err.message);
      return null;
    }
  },

  async indexAllNotifications(notifications) {
    if (!notifications || notifications.length === 0) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      const objects = notifications.map(notif => ({
        objectID: notif.id,
        id: notif.id,
        user_id: notif.user_id,
        notification_type: notif.notification_type,
        message: notif.message,
        is_read: notif.is_read || false,
        created_at: notif.created_at,
        created_at_timestamp: notif.created_at ? Math.floor(new Date(notif.created_at).getTime() / 1000) : null,
      }));
      await cli.saveObjects({
        indexName: NOTIFICATIONS_INDEX,
        objects,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] indexAllNotifications failed:', err.message); }
    }
  },

  // ---- Audit Logs Sync ----
  async saveAuditLog(log) {
    if (!log) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      const createdAtVal = log.created_at || log.createdAt;

      let actorName = log.actor_name;
      let actorRole = log.actor_role;
      const userId = log.user_id || log.userId;
      if (userId && (!actorName || !actorRole)) {
        try {
          const { query } = require('../config/db');
          const userRes = await query('SELECT name, role FROM users WHERE id = $1', [userId]);
          if (userRes.rows[0]) {
            actorName = userRes.rows[0].name;
            actorRole = userRes.rows[0].role;
          }
        } catch (dbErr) {
          console.error('[Algolia] saveAuditLog user lookup failed:', dbErr.message);
        }
      }

      const record = {
        objectID: log.id,
        id: log.id,
        userId: userId,
        email: log.email,
        action: log.action,
        resource: log.resource,
        resourceId: log.resource_id || log.resourceId,
        entity_name: log.entity_name || log.resourceId || '',
        details: log.details,
        ipAddress: log.ip_address || log.ipAddress,
        userAgent: log.user_agent || log.userAgent,
        result: log.result,
        created_at: createdAtVal,
        created_at_timestamp: createdAtVal ? Math.floor(new Date(createdAtVal).getTime() / 1000) : null,
        actor_name: actorName || null,
        actor_role: actorRole || null,
      };
      await cli.saveObject({
        indexName: AUDIT_LOGS_INDEX,
        body: record,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] saveAuditLog failed:', err.message); }
    }
  },

  async searchAuditLogs(searchQuery, filters = {}, page = 1, limit = 20) {
    if (isCurrentlyBlocked()) return null;
    try {
      const cli = getSearchClient();
      const facetFilters = [];
      let finalSearchQuery = searchQuery || '';

      if (filters.actor) {
        if (filters.actor.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          facetFilters.push(`userId:${filters.actor}`);
        } else if (filters.actor.includes('@')) {
          facetFilters.push(`email:${filters.actor}`);
        } else {
          finalSearchQuery = finalSearchQuery ? `${finalSearchQuery} ${filters.actor}` : filters.actor;
        }
      }

      if (filters.employee_name) {
        facetFilters.push(`actor_name:${filters.employee_name}`);
      }

      if (filters.action_type) {
        facetFilters.push(`action:${filters.action_type}`);
      }

      if (filters.resource) {
        facetFilters.push(`resource:${filters.resource}`);
      }

      if (filters.entity_name) {
        facetFilters.push(`entity_name:${filters.entity_name}`);
      }

      if (filters.actor_role) {
        facetFilters.push(`actor_role:${filters.actor_role}`);
      }

      if (filters.result) {
        facetFilters.push(`result:${filters.result}`);
      }

      if (filters.created_by && !filters.actor) {
        facetFilters.push(`userId:${filters.created_by}`);
      }

      const numericFilters = [];
      if (filters.from) {
        const fromTimestamp = Math.floor(new Date(filters.from).getTime() / 1000);
        numericFilters.push(`created_at_timestamp >= ${fromTimestamp}`);
      }
      if (filters.to) {
        const toDateStr = filters.to.includes('T') ? filters.to : `${filters.to}T23:59:59.999Z`;
        const toTimestamp = Math.floor(new Date(toDateStr).getTime() / 1000);
        numericFilters.push(`created_at_timestamp <= ${toTimestamp}`);
      }

      const searchParams = {
        query: finalSearchQuery,
        page: Math.max(0, page - 1),
        hitsPerPage: limit,
      };
      if (facetFilters.length > 0) {
        searchParams.facetFilters = facetFilters;
      }
      if (numericFilters.length > 0) {
        searchParams.numericFilters = numericFilters;
      }
      const result = await cli.searchSingleIndex({
        indexName: AUDIT_LOGS_INDEX,
        searchParams,
      });
      console.log('[Algolia] Search succeeded: searchAuditLogs');
      return result;
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); return null; }
      console.error('[Algolia] searchAuditLogs failed:', err.message);
      return null;
    }
  },

  async indexAllAuditLogs(logs) {
    if (!logs || logs.length === 0) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      const { query } = require('../config/db');

      const userRes = await query('SELECT id, name, role FROM users');
      const userMap = {};
      userRes.rows.forEach(u => {
        userMap[u.id] = { name: u.name, role: u.role };
      });

      const objects = logs.map(log => {
        const createdAtVal = log.created_at || log.createdAt;
        const userId = log.user_id || log.userId;
        const user = userMap[userId] || {};
        return {
          objectID: log.id,
          id: log.id,
          userId: userId,
          email: log.email,
          action: log.action,
          resource: log.resource,
          resourceId: log.resource_id || log.resourceId,
          entity_name: log.entity_name || log.resourceId || '',
          details: log.details,
          ipAddress: log.ip_address || log.ipAddress,
          userAgent: log.user_agent || log.userAgent,
          result: log.result,
          created_at: createdAtVal,
          created_at_timestamp: createdAtVal ? Math.floor(new Date(createdAtVal).getTime() / 1000) : null,
          actor_name: log.actor_name || user.name || null,
          actor_role: log.actor_role || user.role || null,
        };
      });
      await cli.saveObjects({
        indexName: AUDIT_LOGS_INDEX,
        objects,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] indexAllAuditLogs failed:', err.message); }
    }
  },

  // ---- Followups Sync ----
  async saveFollowup(fup) {
    if (!fup) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      let company_name = fup.company_name;
      let contact_person = fup.contact_person;
      let lead_quality = fup.lead_quality;

      if (fup.lead_id && (!company_name || !contact_person || !lead_quality)) {
        try {
          const { query } = require('../config/db');
          const leadRes = await query('SELECT company_name, contact_person, priority FROM leads WHERE id = $1', [fup.lead_id]);
          if (leadRes.rows[0]) {
            company_name = leadRes.rows[0].company_name;
            contact_person = leadRes.rows[0].contact_person;
            lead_quality = leadRes.rows[0].priority;
          }
        } catch (dbErr) {
          console.error('[Algolia] saveFollowup lead lookup failed:', dbErr.message);
        }
      }

      const record = {
        objectID: fup.id,
        id: fup.id,
        lead_id: fup.lead_id,
        company_name,
        contact_person,
        lead_quality,
        followup_type: fup.followup_type,
        outcome: fup.outcome,
        notes: fup.notes,
        created_by: fup.created_by,
        created_at: fup.created_at,
        created_at_timestamp: fup.created_at ? Math.floor(new Date(fup.created_at).getTime() / 1000) : null,
        next_followup_date: fup.next_followup_date,
        next_followup_date_timestamp: fup.next_followup_date ? Math.floor(new Date(fup.next_followup_date).getTime() / 1000) : null,
      };
      await cli.saveObject({
        indexName: FOLLOWUPS_INDEX,
        body: record,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] saveFollowup failed:', err.message); }
    }
  },

  async searchFollowups(searchQuery, filters = {}, page = 1, limit = 20) {
    if (isCurrentlyBlocked()) return null;
    try {
      const cli = getSearchClient();
      const facetFilters = [];
      if (filters.lead_id) {
        facetFilters.push(`lead_id:${filters.lead_id}`);
      }
      if (filters.created_by) {
        facetFilters.push(`created_by:${filters.created_by}`);
      }
      const searchParams = {
        query: searchQuery || '',
        page: Math.max(0, page - 1),
        hitsPerPage: limit,
      };
      if (facetFilters.length > 0) {
        searchParams.facetFilters = facetFilters;
      }
      const result = await cli.searchSingleIndex({
        indexName: FOLLOWUPS_INDEX,
        searchParams,
      });
      console.log('[Algolia] Search succeeded: searchFollowups');
      return result;
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); return null; }
      console.error('[Algolia] searchFollowups failed:', err.message);
      return null;
    }
  },

  async indexAllFollowups(followups) {
    if (!followups || followups.length === 0) return;
    if (isCurrentlyBlocked()) return;
    try {
      const cli = getWriteClient();
      const objects = followups.map(fup => ({
        objectID: fup.id,
        id: fup.id,
        lead_id: fup.lead_id,
        company_name: fup.company_name,
        contact_person: fup.contact_person,
        lead_quality: fup.lead_quality,
        followup_type: fup.followup_type,
        outcome: fup.outcome,
        notes: fup.notes,
        created_by: fup.created_by,
        created_at: fup.created_at,
        created_at_timestamp: fup.created_at ? Math.floor(new Date(fup.created_at).getTime() / 1000) : null,
        next_followup_date: fup.next_followup_date,
        next_followup_date_timestamp: fup.next_followup_date ? Math.floor(new Date(fup.next_followup_date).getTime() / 1000) : null,
      }));
      await cli.saveObjects({
        indexName: FOLLOWUPS_INDEX,
        objects,
      });
    } catch (err) {
      if (isBlockedError(err)) { markBlocked(); } else { console.error('[Algolia] indexAllFollowups failed:', err.message); }
    }
  },

  // ---- Relational Sync Helpers ----
  async syncLeadsForCategory(categoryId, categoryName) {
    try {
      const { query } = require('../config/db');
      const result = await query(
        `SELECT l.*, u.name as assigned_to_name, u.employee_id as assigned_employee_id,
                bc.category_name, bsc.sub_category_name, ls.name as lead_source_name
         FROM leads l
         LEFT JOIN users u ON l.assigned_to = u.id
         LEFT JOIN business_categories bc ON l.category = bc.id
         LEFT JOIN business_sub_categories bsc ON l.sub_category = bsc.id
         LEFT JOIN lead_sources ls ON l.lead_source = ls.id::text OR l.lead_source = ls.name
         WHERE l.category = $1`,
        [categoryId]
      );
      if (result.rows.length > 0) {
        await this.indexAllLeads(result.rows);
      }
    } catch (err) {
      console.error('[Algolia] syncLeadsForCategory failed:', err.message);
    }
  },

  async syncLeadsForSubCategory(subCategoryId, subCategoryName) {
    try {
      const { query } = require('../config/db');
      const result = await query(
        `SELECT l.*, u.name as assigned_to_name, u.employee_id as assigned_employee_id,
                bc.category_name, bsc.sub_category_name, ls.name as lead_source_name
         FROM leads l
         LEFT JOIN users u ON l.assigned_to = u.id
         LEFT JOIN business_categories bc ON l.category = bc.id
         LEFT JOIN business_sub_categories bsc ON l.sub_category = bsc.id
         LEFT JOIN lead_sources ls ON l.lead_source = ls.id::text OR l.lead_source = ls.name
         WHERE l.sub_category = $1`,
        [subCategoryId]
      );
      if (result.rows.length > 0) {
        await this.indexAllLeads(result.rows);
      }
    } catch (err) {
      console.error('[Algolia] syncLeadsForSubCategory failed:', err.message);
    }
  },

  async syncLeadsForUser(userId, userName) {
    try {
      const { query } = require('../config/db');
      const result = await query(
        `SELECT l.*, u.name as assigned_to_name, u.employee_id as assigned_employee_id,
                bc.category_name, bsc.sub_category_name, ls.name as lead_source_name
         FROM leads l
         LEFT JOIN users u ON l.assigned_to = u.id
         LEFT JOIN business_categories bc ON l.category = bc.id
         LEFT JOIN business_sub_categories bsc ON l.sub_category = bsc.id
         LEFT JOIN lead_sources ls ON l.lead_source = ls.id::text OR l.lead_source = ls.name
         WHERE l.assigned_to = $1`,
        [userId]
      );
      if (result.rows.length > 0) {
        await this.indexAllLeads(result.rows);
      }
    } catch (err) {
      console.error('[Algolia] syncLeadsForUser failed:', err.message);
    }
  },

  recoverAndReindex,
  startupAutoIndex,
  isRecovering: () => isRecovering,
};
