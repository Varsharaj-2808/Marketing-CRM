const { searchClient } = require('algoliasearch');

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY;
const USERS_INDEX_NAME = process.env.ALGOLIA_USERS_INDEX || 'users';
const LEADS_INDEX_NAME = process.env.ALGOLIA_LEADS_INDEX || 'leads';

let client = null;

function getClient() {
  if (!client) {
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
      throw new Error('Algolia credentials not configured. Set ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY in .env');
    }
    client = searchClient(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
  }
  return client;
}

async function configureUsersIndex() {
  try {
    const c = getClient();
    await c.setSettings({
      indexName: USERS_INDEX_NAME,
      indexSettings: {
        attributesForFaceting: [
          'role',
          'status',
          'createdAt',
          'updatedAt',
        ],
        searchableAttributes: [
          'name',
          'email',
          'employee_id',
          'mobile',
          'role',
        ],
        customRanking: [
          'desc(createdAt)',
        ],
        ranking: [
          'typo',
          'geo',
          'words',
          'proximity',
          'attribute',
          'exact',
          'custom',
        ],
        typoTolerance: 'min',
        paginationLimitedTo: 1000,
        maxValuesPerFacet: 100,
        attributesToHighlight: ['name', 'email', 'employee_id'],
      },
    });
    console.log(`[Algolia] Users index "${USERS_INDEX_NAME}" configured successfully`);
  } catch (err) {
    console.error('[Algolia] Failed to configure users index:', err.message);
  }
}

async function configureLeadsIndex() {
  try {
    const c = getClient();
    await c.setSettings({
      indexName: LEADS_INDEX_NAME,
      indexSettings: {
        attributesForFaceting: [
          'stage',
          'priority',
          'lead_source',
          'category',
          'sub_category',
          'assigned_to',
          'status',
          'city',
          'created_at',
          'updated_at',
        ],
        searchableAttributes: [
          'company_name',
          'contact_person',
          'email',
          'mobile_number',
          'lead_id',
          'city',
          'stage',
          'priority',
          'lead_source',
        ],
        customRanking: [
          'desc(created_at)',
        ],
        ranking: [
          'typo',
          'geo',
          'words',
          'proximity',
          'attribute',
          'exact',
          'custom',
        ],
        typoTolerance: 'min',
        paginationLimitedTo: 1000,
        maxValuesPerFacet: 100,
        attributesToHighlight: ['company_name', 'contact_person', 'email', 'lead_id'],
      },
    });
    console.log(`[Algolia] Leads index "${LEADS_INDEX_NAME}" configured successfully`);
  } catch (err) {
    console.error('[Algolia] Failed to configure leads index:', err.message);
  }
}

function prepareUserRecord(user) {
  return {
    objectID: user.id,
    id: user.id,
    employee_id: user.employee_id || '',
    name: user.name || '',
    email: user.email || '',
    mobile: user.mobile || '',
    role: user.role || '',
    status: user.accountStatus || user.status || 'active',
    createdAt: user.createdAt || user.created_at || null,
    updatedAt: user.updatedAt || user.updated_at || null,
  };
}

function prepareLeadRecord(lead) {
  const services = lead.service_interested
    ? (typeof lead.service_interested === 'string' ? JSON.parse(lead.service_interested) : lead.service_interested)
    : [];
  return {
    objectID: lead.id,
    id: lead.id,
    lead_id: lead.lead_id || '',
    company_name: lead.company_name || '',
    contact_person: lead.contact_person || '',
    mobile_number: lead.mobile_number || '',
    email: lead.email || '',
    website: lead.website || '',
    city: lead.city || '',
    lead_source: lead.lead_source || '',
    category: lead.category || '',
    sub_category: lead.sub_category || '',
    service_interested: services,
    priority: lead.priority || '',
    estimated_value: lead.estimated_value != null ? Number(lead.estimated_value) : null,
    assigned_to: lead.assigned_to || '',
    stage: lead.stage || '',
    status: lead.lead_status || lead.status || 'New Lead',
    lost_reason: lead.lost_reason || null,
    final_deal_value: lead.final_deal_value != null ? Number(lead.final_deal_value) : null,
    closure_date: lead.closure_date || null,
    remarks: lead.remarks || null,
    next_followup_date: lead.next_followup_date || null,
    created_at: lead.created_at || null,
    updated_at: lead.updated_at || null,
  };
}

const algolia = {
  async saveUser(user) {
    if (!user || !user.id) return;
    try {
      const c = getClient();
      await c.saveObject({ indexName: USERS_INDEX_NAME, body: prepareUserRecord(user) });
    } catch (err) {
      console.error('[Algolia] saveUser error:', err.message);
    }
  },

  async deleteUser(userId) {
    if (!userId) return;
    try {
      const c = getClient();
      await c.deleteObject({ indexName: USERS_INDEX_NAME, objectID: userId });
    } catch (err) {
      console.error('[Algolia] deleteUser error:', err.message);
    }
  },

  async searchUsers(query, filters = {}, page = 1, hitsPerPage = 20) {
    try {
      const c = getClient();
      const facetFilters = [];

      if (filters.role) {
        facetFilters.push(`role:${filters.role}`);
      }
      if (filters.status) {
        const statusVal = filters.status.toLowerCase();
        facetFilters.push(`status:${statusVal}`);
      }

      const searchParams = {
        page: page - 1,
        hitsPerPage,
        facets: ['role', 'status'],
        attributesToRetrieve: ['objectID', 'id', 'employee_id', 'name', 'email', 'mobile', 'role', 'status', 'createdAt', 'updatedAt'],
      };

      if (facetFilters.length > 0) {
        searchParams.facetFilters = facetFilters;
      }

      const result = await c.searchSingleIndex({ indexName: USERS_INDEX_NAME, searchParams });

      return {
        hits: result.hits,
        nbHits: result.nbHits,
        page: result.page + 1,
        nbPages: result.nbPages,
        hitsPerPage: result.hitsPerPage,
        facetDistribution: result.facets || {},
      };
    } catch (err) {
      console.error('[Algolia] searchUsers error:', err.message);
      return null;
    }
  },

  async indexAllUsers(users) {
    if (!users || users.length === 0) return;
    try {
      const c = getClient();
      const records = users.map(u => prepareUserRecord(u));
      await c.saveObjects({ indexName: USERS_INDEX_NAME, objects: records });
      console.log(`[Algolia] Indexed ${records.length} users`);
    } catch (err) {
      console.error('[Algolia] indexAllUsers error:', err.message);
    }
  },

  async saveLead(lead) {
    if (!lead || !lead.id) return;
    try {
      const c = getClient();
      await c.saveObject({ indexName: LEADS_INDEX_NAME, body: prepareLeadRecord(lead) });
    } catch (err) {
      console.error('[Algolia] saveLead error:', err.message);
    }
  },

  async deleteLead(leadId) {
    if (!leadId) return;
    try {
      const c = getClient();
      await c.deleteObject({ indexName: LEADS_INDEX_NAME, objectID: leadId });
    } catch (err) {
      console.error('[Algolia] deleteLead error:', err.message);
    }
  },

  async searchLeads(query, filters = {}, page = 1, hitsPerPage = 20) {
    try {
      const c = getClient();
      const facetFilters = [];

      if (filters.stage) {
        facetFilters.push(`stage:${filters.stage}`);
      }
      if (filters.priority) {
        facetFilters.push(`priority:${filters.priority}`);
      }
      if (filters.lead_source) {
        facetFilters.push(`lead_source:${filters.lead_source}`);
      }
      if (filters.category) {
        facetFilters.push(`category:${filters.category}`);
      }
      if (filters.sub_category) {
        facetFilters.push(`sub_category:${filters.sub_category}`);
      }
      if (filters.assigned_to) {
        facetFilters.push(`assigned_to:${filters.assigned_to}`);
      }
      if (filters.status) {
        facetFilters.push(`status:${filters.status}`);
      }
      if (filters.city) {
        facetFilters.push(`city:${filters.city}`);
      }

      const searchParams = {
        page: page - 1,
        hitsPerPage,
        facets: ['stage', 'priority', 'lead_source', 'category', 'sub_category', 'assigned_to', 'status', 'city'],
        attributesToRetrieve: ['objectID', 'id', 'lead_id', 'company_name', 'contact_person', 'mobile_number', 'email', 'city', 'lead_source', 'category', 'sub_category', 'priority', 'estimated_value', 'assigned_to', 'stage', 'status', 'created_at', 'updated_at'],
      };

      if (facetFilters.length > 0) {
        searchParams.facetFilters = facetFilters;
      }

      const result = await c.searchSingleIndex({ indexName: LEADS_INDEX_NAME, searchParams });

      return {
        hits: result.hits,
        nbHits: result.nbHits,
        page: result.page + 1,
        nbPages: result.nbPages,
        hitsPerPage: result.hitsPerPage,
        facetDistribution: result.facets || {},
      };
    } catch (err) {
      console.error('[Algolia] searchLeads error:', err.message);
      return null;
    }
  },

  async indexAllLeads(leads) {
    if (!leads || leads.length === 0) return;
    try {
      const c = getClient();
      const records = leads.map(l => prepareLeadRecord(l));
      await c.saveObjects({ indexName: LEADS_INDEX_NAME, objects: records });
      console.log(`[Algolia] Indexed ${records.length} leads`);
    } catch (err) {
      console.error('[Algolia] indexAllLeads error:', err.message);
    }
  },

  async configureIndices() {
    await configureUsersIndex();
    await configureLeadsIndex();
  },

  async testConnection() {
    try {
      const c = getClient();
      await c.searchSingleIndex({ indexName: USERS_INDEX_NAME, searchParams: { hitsPerPage: 1 } });
      console.log('[Algolia] Connection successful');
      return true;
    } catch (err) {
      console.error('[Algolia] Connection failed:', err.message);
      return false;
    }
  },
};

module.exports = algolia;
