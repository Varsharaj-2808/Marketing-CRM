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
  const client = getAdminClient();
  if (!client) return;
  try {
    // 1. Users
    await client.setSettings({
      indexName: USERS_INDEX,
      indexSettings: {
        searchableAttributes: ['name', 'email', 'employee_id', 'mobile', 'department', 'designation'],
        attributesForFaceting: ['role', 'status', 'department', 'designation', 'createdAt', 'updatedAt'],
        customRanking: ['desc(createdAt)'],
      }
    });

    // 2. Leads
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

    // 3. Categories
    await client.setSettings({
      indexName: CATEGORIES_INDEX,
      indexSettings: {
        searchableAttributes: ['category_name', 'name', 'subcategory_name', 'sub_category_name', 'parent_category_name'],
        attributesForFaceting: ['status', 'type', 'parent_category_name'],
        customRanking: ['desc(createdAt)'],
      }
    });

    // 4. Services
    await client.setSettings({
      indexName: SERVICES_INDEX,
      indexSettings: {
        searchableAttributes: ['name'],
        attributesForFaceting: ['status'],
        customRanking: ['desc(createdAt)'],
      }
    });

    // 5. Lead Sources
    await client.setSettings({
      indexName: LEAD_SOURCES_INDEX,
      indexSettings: {
        searchableAttributes: ['name'],
        attributesForFaceting: ['status'],
        customRanking: ['desc(createdAt)'],
      }
    });

    // 6. Notifications
    await client.setSettings({
      indexName: NOTIFICATIONS_INDEX,
      indexSettings: {
        searchableAttributes: ['message', 'notification_type'],
        attributesForFaceting: ['user_id', 'notification_type', 'is_read', 'read_at'],
        customRanking: ['desc(created_at_timestamp)'],
      }
    });

    // 7. Audit Logs
    await client.setSettings({
      indexName: AUDIT_LOGS_INDEX,
      indexSettings: {
        searchableAttributes: ['action', 'resource', 'details', 'email', 'actor_name', 'actor_role', 'userId', 'resourceId', 'result', 'ipAddress', 'entity_name'],
        attributesForFaceting: ['email', 'action', 'resource', 'result', 'userId', 'actor_name', 'actor_role', 'entity_name'],
        customRanking: ['desc(created_at_timestamp)'],
      }
    });

    // 8. Followups
    await client.setSettings({
      indexName: FOLLOWUPS_INDEX,
      indexSettings: {
        searchableAttributes: ['notes', 'followup_type', 'outcome'],
        attributesForFaceting: ['followup_type', 'outcome', 'lead_id', 'created_by'],
        customRanking: ['desc(created_at_timestamp)'],
      }
    });

    console.log('Algolia index settings configured successfully.');
  } catch (err) {
    console.error('Failed to configure Algolia index settings:', err.message);
  }
}

// Call on startup
initIndices().catch(() => {});

module.exports = {
  async testConnection() {
    try {
      const cli = getAdminClient();
      const res = await cli.listIndices();
      return !!res;
    } catch (err) {
      console.error('Algolia testConnection failed:', err.message);
      return false;
    }
  },

  // ---- Users Sync ----
  async saveUser(user) {
    if (!user) return;
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

      // Relational update: Sync assigned user name changes to leads
      if (user.id && user.name) {
        await this.syncLeadsForUser(user.id, user.name);
      }
    } catch (err) {
      console.error('Algolia saveUser failed:', err.message);
    }
  },

  async deleteUser(id) {
    if (!id) return;
    try {
      const cli = getWriteClient();
      await cli.deleteObject({
        indexName: USERS_INDEX,
        objectID: id,
      });
    } catch (err) {
      console.error('Algolia deleteUser failed:', err.message);
    }
  },

  async searchUsers(searchQuery, filters = {}, page = 1, limit = 20) {
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

      return result;
    } catch (err) {
      console.error('Algolia searchUsers failed:', err.message);
      return null;
    }
  },

  async indexAllUsers(users) {
    if (!users || users.length === 0) return;
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
      console.error('Algolia indexAllUsers failed:', err.message);
    }
  },

  // ---- Leads Sync ----
  async saveLead(lead) {
    if (!lead) return;
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
      console.error('Algolia saveLead failed:', err.message);
    }
  },

  /**
   * Browse ALL Algolia pages for a given search query + filters and return an
   * array of every matching lead UUID.  Used by exportLeads so the exported
   * file exactly mirrors the Algolia search results shown in the UI.
   */
  async getAllLeadIdsBySearch(searchQuery, filters = {}, isAdmin = false, userId = null) {
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
      const PAGE_SIZE = 1000; // max Algolia allows per page

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
      console.error('Algolia getAllLeadIdsBySearch failed:', err.message);
      return null; // caller falls back to SQL search
    }
  },

  async deleteLead(id) {
    if (!id) return;
    try {
      const cli = getWriteClient();
      await cli.deleteObject({
        indexName: LEADS_INDEX,
        objectID: id,
      });
    } catch (err) {
      console.error('Algolia deleteLead failed:', err.message);
    }
  },

  async searchLeads(searchQuery, filters = {}, page = 1, limit = 20, isAdmin = false, userId = null) {
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

      return result;
    } catch (err) {
      console.error('Algolia searchLeads failed:', err.message);
      return null;
    }
  },

  async indexAllLeads(leads) {
    if (!leads || leads.length === 0) return;
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
      console.error('Algolia indexAllLeads failed:', err.message);
    }
  },

  // ---- Categories Sync ----
  async saveCategory(cat) {
    if (!cat) return;
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

      // Relational update: Sync category name changes to leads
      if (cat.type === 'category' && cat.id && (cat.category_name || cat.name)) {
        await this.syncLeadsForCategory(cat.id, cat.category_name || cat.name);
      }
      // Relational update: Sync subcategory name changes to leads
      if (cat.type === 'subcategory' && cat.id) {
        await this.syncLeadsForSubCategory(cat.id, cat.subcategory_name || cat.sub_category_name || cat.category_name || cat.name);
      }
    } catch (err) {
      console.error('Algolia saveCategory failed:', err.message);
    }
  },

  async deleteCategory(id) {
    if (!id) return;
    try {
      const cli = getWriteClient();
      await cli.deleteObject({
        indexName: CATEGORIES_INDEX,
        objectID: id,
      });
    } catch (err) {
      console.error('Algolia deleteCategory failed:', err.message);
    }
  },

  async searchCategories(searchQuery, status = 'All', page = 1, limit = 20, type = null, parentCategoryName = null) {
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
      return await cli.searchSingleIndex({
        indexName: CATEGORIES_INDEX,
        searchParams,
      });
    } catch (err) {
      console.error('Algolia searchCategories failed:', err.message);
      return null;
    }
  },

  async indexAllCategories(categories) {
    if (!categories || categories.length === 0) return;
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
      console.error('Algolia indexAllCategories failed:', err.message);
    }
  },

  // ---- Services Sync ----
  async saveService(service) {
    if (!service) return;
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
      console.error('Algolia saveService failed:', err.message);
    }
  },

  async deleteService(id) {
    if (!id) return;
    try {
      const cli = getWriteClient();
      await cli.deleteObject({
        indexName: SERVICES_INDEX,
        objectID: id,
      });
    } catch (err) {
      console.error('Algolia deleteService failed:', err.message);
    }
  },

  async searchServices(searchQuery, status = 'All', page = 1, limit = 20) {
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
      return await cli.searchSingleIndex({
        indexName: SERVICES_INDEX,
        searchParams,
      });
    } catch (err) {
      console.error('Algolia searchServices failed:', err.message);
      return null;
    }
  },

  async indexAllServices(services) {
    if (!services || services.length === 0) return;
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
      console.error('Algolia indexAllServices failed:', err.message);
    }
  },

  // ---- Lead Sources Sync ----
  async saveLeadSource(source) {
    if (!source) return;
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
      console.error('Algolia saveLeadSource failed:', err.message);
    }
  },

  async deleteLeadSource(id) {
    if (!id) return;
    try {
      const cli = getWriteClient();
      await cli.deleteObject({
        indexName: LEAD_SOURCES_INDEX,
        objectID: id,
      });
    } catch (err) {
      console.error('Algolia deleteLeadSource failed:', err.message);
    }
  },

  async searchLeadSources(searchQuery, status = 'All', page = 1, limit = 20) {
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
      return await cli.searchSingleIndex({
        indexName: LEAD_SOURCES_INDEX,
        searchParams,
      });
    } catch (err) {
      console.error('Algolia searchLeadSources failed:', err.message);
      return null;
    }
  },

  async indexAllLeadSources(sources) {
    if (!sources || sources.length === 0) return;
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
      console.error('Algolia indexAllLeadSources failed:', err.message);
    }
  },

  // ---- Notifications Sync ----
  async saveNotification(notif) {
    if (!notif) return;
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
      console.error('Algolia saveNotification failed:', err.message);
    }
  },

  async deleteNotification(id) {
    if (!id) return;
    try {
      const cli = getWriteClient();
      await cli.deleteObject({
        indexName: NOTIFICATIONS_INDEX,
        objectID: id,
      });
    } catch (err) {
      console.error('Algolia deleteNotification failed:', err.message);
    }
  },

  async searchNotifications(searchQuery, filters = {}, page = 1, limit = 20) {
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
      return await cli.searchSingleIndex({
        indexName: NOTIFICATIONS_INDEX,
        searchParams,
      });
    } catch (err) {
      console.error('Algolia searchNotifications failed:', err.message);
      return null;
    }
  },

  async indexAllNotifications(notifications) {
    if (!notifications || notifications.length === 0) return;
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
      console.error('Algolia indexAllNotifications failed:', err.message);
    }
  },

  // ---- Audit Logs Sync ----
  async saveAuditLog(log) {
    if (!log) return;
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
          console.error('[saveAuditLog] Failed to fetch user info:', dbErr.message);
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
      console.error('Algolia saveAuditLog failed:', err.message);
    }
  },

  async searchAuditLogs(searchQuery, filters = {}, page = 1, limit = 20) {
    try {
      const cli = getSearchClient();
      const facetFilters = [];
      let finalSearchQuery = searchQuery || '';

      // Actor filter - UUID, email, or name search
      if (filters.actor) {
        if (filters.actor.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          facetFilters.push(`userId:${filters.actor}`);
        } else if (filters.actor.includes('@')) {
          facetFilters.push(`email:${filters.actor}`);
        } else {
          // Name search - combine with text query
          finalSearchQuery = finalSearchQuery ? `${finalSearchQuery} ${filters.actor}` : filters.actor;
        }
      }

      // Employee name filter
      if (filters.employee_name) {
        facetFilters.push(`actor_name:${filters.employee_name}`);
      }

      // Action type filter
      if (filters.action_type) {
        facetFilters.push(`action:${filters.action_type}`);
      }

      // Resource/entity filter
      if (filters.resource) {
        facetFilters.push(`resource:${filters.resource}`);
      }

      // Entity name filter
      if (filters.entity_name) {
        facetFilters.push(`entity_name:${filters.entity_name}`);
      }

      // Role filter
      if (filters.actor_role) {
        facetFilters.push(`actor_role:${filters.actor_role}`);
      }

      // Result/status filter
      if (filters.result) {
        facetFilters.push(`result:${filters.result}`);
      }

      // Created by (userId) filter
      if (filters.created_by && !filters.actor) {
        facetFilters.push(`userId:${filters.created_by}`);
      }

      // Date range filters
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
      return await cli.searchSingleIndex({
        indexName: AUDIT_LOGS_INDEX,
        searchParams,
      });
    } catch (err) {
      console.error('Algolia searchAuditLogs failed:', err.message);
      return null;
    }
  },

  async indexAllAuditLogs(logs) {
    if (!logs || logs.length === 0) return;
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
      console.error('Algolia indexAllAuditLogs failed:', err.message);
    }
  },

  // ---- Followups Sync ----
  async saveFollowup(fup) {
    if (!fup) return;
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
          console.error('[saveFollowup] Failed to fetch lead info:', dbErr.message);
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
      console.error('Algolia saveFollowup failed:', err.message);
    }
  },

  async searchFollowups(searchQuery, filters = {}, page = 1, limit = 20) {
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
      return await cli.searchSingleIndex({
        indexName: FOLLOWUPS_INDEX,
        searchParams,
      });
    } catch (err) {
      console.error('Algolia searchFollowups failed:', err.message);
      return null;
    }
  },

  async indexAllFollowups(followups) {
    if (!followups || followups.length === 0) return;
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
      console.error('Algolia indexAllFollowups failed:', err.message);
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
      console.error('Algolia syncLeadsForCategory failed:', err.message);
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
      console.error('Algolia syncLeadsForSubCategory failed:', err.message);
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
      console.error('Algolia syncLeadsForUser failed:', err.message);
    }
  }
};
