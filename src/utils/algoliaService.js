const { algoliasearch } = require('algoliasearch');

const appId = process.env.ALGOLIA_APP_ID || '';
const apiKey = process.env.ALGOLIA_WRITE_KEY || '';

let client = null;
if (appId && apiKey) {
  client = algoliasearch(appId, apiKey);
}

// Helper to check if client is initialized
const getClient = () => {
  if (!client) {
    throw new Error('Algolia client not initialized. Check your environment variables.');
  }
  return client;
};

// Index names
const USERS_INDEX = 'users';
const LEADS_INDEX = 'leads';

// Configure indices settings
async function initIndices() {
  if (!client) return;
  try {
    await client.setSettings({
      indexName: USERS_INDEX,
      indexSettings: {
        searchableAttributes: ['name', 'email', 'employee_id', 'mobile'],
        attributesForFaceting: ['role', 'status', 'department', 'designation', 'createdAt', 'updatedAt'],
        customRanking: ['desc(createdAt)'],
      }
    });

    await client.setSettings({
      indexName: LEADS_INDEX,
      indexSettings: {
        searchableAttributes: ['company_name', 'contact_person', 'mobile_number', 'email', 'lead_source', 'lead_id'],
        attributesForFaceting: [
          'stage', 'priority', 'lead_source', 'category', 'sub_category',
          'assigned_to', 'status', 'city', 'state', 'country', 'created_at', 'updated_at'
        ],
        customRanking: ['desc(created_at)'],
      }
    });
    console.log('Algolia index settings configured successfully.');
  } catch (err) {
    console.error('Failed to configure Algolia index settings:', err.message);
  }
}

// Call on startup
initIndices();

module.exports = {
  async testConnection() {
    try {
      const cli = getClient();
      const res = await cli.listIndices();
      return !!res;
    } catch (err) {
      console.error('Algolia testConnection failed:', err.message);
      return false;
    }
  },

  async saveUser(user) {
    if (!user) return;
    try {
      const cli = getClient();
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
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      await cli.saveObject({
        indexName: USERS_INDEX,
        body: record,
      });
    } catch (err) {
      console.error('Algolia saveUser failed:', err.message);
    }
  },

  async deleteUser(id) {
    if (!id) return;
    try {
      const cli = getClient();
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
      const cli = getClient();
      const facetFilters = [];
      if (filters.role && filters.role !== 'All') {
        facetFilters.push(`role:${filters.role}`);
      }
      if (filters.status && filters.status !== 'All') {
        facetFilters.push(`status:${filters.status}`);
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
      const cli = getClient();
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
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
      await cli.saveObjects({
        indexName: USERS_INDEX,
        objects,
      });
    } catch (err) {
      console.error('Algolia indexAllUsers failed:', err.message);
    }
  },

  async saveLead(lead) {
    if (!lead) return;
    try {
      const cli = getClient();
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
        lead_source: lead.lead_source,
        category: lead.category,
        sub_category: lead.sub_category,
        service_interested: lead.service_interested,
        priority: lead.priority,
        estimated_value: lead.estimated_value ? parseFloat(lead.estimated_value) : null,
        assigned_to: lead.assigned_to,
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

  async deleteLead(id) {
    if (!id) return;
    try {
      const cli = getClient();
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
      const cli = getClient();
      const facetFilters = [];

      // Role-based scoping (similar to Lead.js): non-admins can only see leads assigned to them
      if (!isAdmin && userId) {
        facetFilters.push(`assigned_to:${userId}`);
      }

      if (filters.priority && filters.priority !== 'All') {
        facetFilters.push(`priority:${filters.priority}`);
      }
      if (filters.stage && filters.stage !== 'All') {
        facetFilters.push(`stage:${filters.stage}`);
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
        facetFilters.push(`assigned_to:${filters.assigned_to}`);
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

      return result;
    } catch (err) {
      console.error('Algolia searchLeads failed:', err.message);
      return null;
    }
  },

  async indexAllLeads(leads) {
    if (!leads || leads.length === 0) return;
    try {
      const cli = getClient();
      const objects = leads.map(lead => ({
        objectID: lead.id,
        id: lead.id,
        lead_id: lead.lead_id,
        company_name: lead.company_name,
        contact_person: lead.contact_person,
        mobile_number: lead.mobile_number,
        email: lead.email,
        website: lead.website,
        city: lead.city,
        lead_source: lead.lead_source,
        category: lead.category,
        sub_category: lead.sub_category,
        service_interested: lead.service_interested,
        priority: lead.priority,
        estimated_value: lead.estimated_value ? parseFloat(lead.estimated_value) : null,
        assigned_to: lead.assigned_to,
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
  }
};
