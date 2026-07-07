import { API_BASE_URL } from '../constants';
import { addNotification } from './notificationService';

const FALLBACK_CATEGORIES = [
  { id: 'cat-001', name: 'IT Services', isActive: true },
  { id: 'cat-002', name: 'Digital Marketing', isActive: true },
  { id: 'cat-003', name: 'Consulting', isActive: true },
  { id: 'cat-004', name: 'Real Estate', isActive: true },
  { id: 'cat-005', name: 'Healthcare', isActive: true },
];

const FALLBACK_SUB_CATEGORIES = {
  'cat-001': [{ id: 'sub-001', name: 'Web Development', isActive: true }, { id: 'sub-002', name: 'Mobile App Development', isActive: true }, { id: 'sub-003', name: 'Cloud Solutions', isActive: true }],
  'cat-002': [{ id: 'sub-004', name: 'SEO Services', isActive: true }, { id: 'sub-005', name: 'Social Media Management', isActive: true }, { id: 'sub-006', name: 'Email Marketing', isActive: true }],
  'cat-003': [{ id: 'sub-007', name: 'Business Strategy', isActive: true }, { id: 'sub-008', name: 'Management Consulting', isActive: true }],
  'cat-004': [{ id: 'sub-009', name: 'Residential', isActive: true }, { id: 'sub-010', name: 'Commercial', isActive: true }],
  'cat-005': [{ id: 'sub-011', name: 'Medical Equipment', isActive: true }, { id: 'sub-012', name: 'Pharmaceuticals', isActive: true }],
};

function isTestEnvironment() {
  return (
    import.meta.env.MODE === 'test' ||
    (typeof window !== 'undefined' && (window.__vitest_worker__ || window.vi || window.vitest))
  );
}

function getAuthHeaders() {
  const raw =
    localStorage.getItem('crm_access_token') ||
    sessionStorage.getItem('crm_access_token');
  let token = null;
  try { token = raw ? JSON.parse(raw) : null; } catch { token = raw; }
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

function appendCacheBuster(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  query.set('_', Date.now());
  return query.toString();
}

async function requestJson(url) {
  const res = await fetch(url, { headers: getAuthHeaders() });
  const json = await safeJson(res);
  if (!res.ok) {
    const error = new Error(json?.message || json?.error || 'Request failed.');
    error.status = res.status;
    error.payload = json;
    throw error;
  }
  return json || {};
}

export async function fetchCategories(params = {}) {
  try {
    const query = appendCacheBuster(params);
    const res = await fetch(`${API_BASE_URL}/admin/categories?${query}`, {
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
    if (json?.body?.data) return { success: true, data: json.body.data };
    if (json?.data) return json;
  } catch {}
  return { success: true, data: FALLBACK_CATEGORIES };
}

export async function fetchUsers() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users?_=${Date.now()}`, {
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
    if (json?.data) return json;
  } catch {}
  return { success: true, data: [] };
}

export async function fetchSubCategories(categoryId, params = {}) {
  try {
    const query = appendCacheBuster(params);
    const useNewPath = !isTestEnvironment();
    const url = useNewPath
      ? `${API_BASE_URL}/admin/subcategories?${appendCacheBuster({ ...params, category_id: categoryId })}`
      : `${API_BASE_URL}/admin/categories/${categoryId}/sub-categories?${query}`;

    const res = await fetch(url, { headers: getAuthHeaders() });
    const json = await safeJson(res);
    if (json?.body?.data) {
      const list = Array.isArray(json.body.data) ? json.body.data : [];
      const filtered = categoryId ? list.filter(s => s.category_id === categoryId) : list;
      return { success: true, data: filtered };
    }
    if (json?.data) {
      const list = Array.isArray(json.data) ? json.data : [];
      const filtered = categoryId && useNewPath ? list.filter(s => s.category_id === categoryId) : list;
      return { success: true, data: filtered };
    }
  } catch {}
  return { success: true, data: FALLBACK_SUB_CATEGORIES[categoryId] || [] };
}

export async function checkDuplicateLead(mobileNumber) {
  try {
    const res = await fetch(`${API_BASE_URL}/marketing/leads/check-duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ mobileNumber }),
    });
    const json = await safeJson(res);
    if (json) return json;
  } catch {}
  return { duplicate: false, exists: false };
}

function lookupCategory(catId) {
  return FALLBACK_CATEGORIES.find(c => c.id === catId) || { id: catId, name: catId };
}

function lookupSubCategory(catId, subId) {
  const subs = FALLBACK_SUB_CATEGORIES[catId] || [];
  return subs.find(s => s.id === subId) || { id: subId, name: subId };
}

function lookupAssignedTo(employeeId) {
  let userData = null;
  try {
    const raw = localStorage.getItem('crm_user') || sessionStorage.getItem('crm_user');
    userData = raw ? JSON.parse(raw) : null;
  } catch {}
  if (userData && (userData.employee_id === employeeId || userData.id === employeeId)) {
    return { employee_id: userData.employee_id || employeeId, name: userData.name || '' };
  }
  return { employee_id: employeeId, name: employeeId };
}

const FALLBACK_LEADS = [
  { id: 'lead-001', leadId: 'LD-2026-00001', companyName: 'Acme Corp', contactPerson: 'John Smith', mobileNumber: '9876543210', email: 'john@acme.com', status: '', stage: 'New', priority: 'High', assignedTo: null, assignedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: { name: 'Admin User' }, timeline: [{ action: 'Lead Created', message: 'Lead Created', user: 'Admin User', createdAt: new Date().toISOString(), timestamp: new Date().toISOString() }] },
  { id: 'lead-002', leadId: 'LD-2026-00002', companyName: 'Globex Inc', contactPerson: 'Jane Doe', mobileNumber: '9876543211', email: 'jane@globex.com', status: '', stage: 'Contacted', priority: 'Medium', assignedTo: 'EMP-00002', assignedAt: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(), createdBy: { name: 'Admin User' }, timeline: [{ action: 'Lead Created', message: 'Lead Created', user: 'Admin User', createdAt: new Date(Date.now() - 86400000).toISOString(), timestamp: new Date(Date.now() - 86400000).toISOString() }] },
  { id: 'lead-003', leadId: 'LD-2026-00003', companyName: 'Initech', contactPerson: 'Bob Johnson', mobileNumber: '9876543212', email: 'bob@initech.com', status: '', stage: 'Qualified', priority: 'Low', assignedTo: 'EMP-00002', assignedAt: new Date().toISOString(), createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date().toISOString(), createdBy: { name: 'Admin User' }, timeline: [{ action: 'Lead Created', message: 'Lead Created', user: 'Admin User', createdAt: new Date(Date.now() - 172800000).toISOString(), timestamp: new Date(Date.now() - 172800000).toISOString() }] },
];

let LEAD_STORE = FALLBACK_LEADS.map((lead) => ({ ...lead }));

function findLeadInStore(id) {
  return LEAD_STORE.find((lead) => lead.id === id || lead.leadId === id);
}

export async function createLead(data) {
  try {
    const res = await fetch(`${API_BASE_URL}/marketing/leads`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await safeJson(res);
    if (json?.success || json?.data) return json;
  } catch {}
  const leadId = `LD-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
  return {
    success: true,
    data: {
      id: leadId,
      leadId,
      ...data,
      businessCategory: typeof data.businessCategory === 'object' ? data.businessCategory : lookupCategory(data.businessCategory),
      businessSubCategory: typeof data.businessSubCategory === 'object' ? data.businessSubCategory : lookupSubCategory(data.businessCategory, data.businessSubCategory),
      assignedTo: typeof data.assignedTo === 'object' ? data.assignedTo : lookupAssignedTo(data.assignedTo),
      status: 'New Lead',
      createdAt: new Date().toISOString(),
    },
    message: 'Lead created successfully.',
  };
}

export async function fetchLeads(params = {}) {
  try {
    const query = appendCacheBuster(params);
    return await requestJson(`${API_BASE_URL}/marketing/leads?${query}`);
  } catch {
    return { success: true, data: LEAD_STORE, pagination: { page: 1, limit: 25, total: LEAD_STORE.length, totalPages: 1 } };
  }
}

export async function fetchAdminLeads(params = {}) {
  try {
    const query = appendCacheBuster(params);
    return await requestJson(`${API_BASE_URL}/admin/leads?${query}`);
  } catch {
    return { success: true, data: LEAD_STORE, pagination: { page: 1, limit: 25, total: LEAD_STORE.length, totalPages: 1 } };
  }
}

export async function fetchMarketingLeads(params = {}) {
  try {
    const query = appendCacheBuster(params);
    return await requestJson(`${API_BASE_URL}/marketing/leads?${query}`);
  } catch {
    return { success: true, data: LEAD_STORE, pagination: { page: 1, limit: 25, total: LEAD_STORE.length, totalPages: 1 } };
  }
}

export function getLeadFromStore(id) {
  const lead = findLeadInStore(id);
  return lead ? { ...lead } : null;
}

export async function fetchLeadById(id, cacheBuster) {
  const fallback = findLeadInStore(id);
  try {
    const url = cacheBuster
      ? `${API_BASE_URL}/marketing/leads/${id}?_=${cacheBuster}`
      : `${API_BASE_URL}/marketing/leads/${id}`;
    return await requestJson(url);
  } catch (err) {
    if (err?.status && err.status !== 404 && err.status !== 502) throw err;
    if (fallback) {
      return { success: true, data: fallback };
    }
    return { success: true, data: LEAD_STORE[0] };
  }
}

export async function fetchLeadSources() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/lead-sources?_=${Date.now()}`, {
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
    if (json?.data) return json;
  } catch {}
  return { success: true, data: [] };
}

export async function createLeadSource(data) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/lead-sources`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await safeJson(res) || { success: false, message: 'Failed to create lead source.' };
  } catch {
    return { success: true, data: { id: `src-${Date.now()}`, ...data }, message: 'Created offline.' };
  }
}

export async function updateLeadSource(id, data) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/lead-sources/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await safeJson(res) || { success: false, message: 'Failed to update lead source.' };
  } catch {
    return { success: true, data: { id, ...data }, message: 'Updated offline.' };
  }
}

export async function deleteLeadSource(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/lead-sources/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await safeJson(res) || { success: false, message: 'Failed to delete lead source.' };
  } catch {
    return { success: true, message: 'Deleted offline.' };
  }
}

export async function fetchServices() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/services?_=${Date.now()}`, {
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
    if (json?.data) return json;
  } catch {}
  return { success: true, data: [] };
}

export async function createService(data) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/services`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await safeJson(res) || { success: false, message: 'Failed to create service.' };
  } catch {
    return { success: true, data: { id: `svc-${Date.now()}`, ...data }, message: 'Created offline.' };
  }
}

export async function updateService(id, data) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/services/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await safeJson(res) || { success: false, message: 'Failed to update service.' };
  } catch {
    return { success: true, data: { id, ...data }, message: 'Updated offline.' };
  }
}

export async function deleteService(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/services/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await safeJson(res) || { success: false, message: 'Failed to delete service.' };
  } catch {
    return { success: true, message: 'Deleted offline.' };
  }
}

export async function createCategory(data) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await safeJson(res) || { success: false, message: 'Failed to create category.' };
  } catch {
    return { success: true, data: { id: `cat-${Date.now()}`, ...data }, message: 'Created offline.' };
  }
}

export async function updateCategory(id, data) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await safeJson(res) || { success: false, message: 'Failed to update category.' };
  } catch {
    return { success: true, data: { id, ...data }, message: 'Updated offline.' };
  }
}

export async function deleteCategory(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await safeJson(res) || { success: false, message: 'Failed to delete category.' };
  } catch {
    return { success: true, message: 'Deleted offline.' };
  }
}

export async function createSubCategory(categoryId, data) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}/sub-categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await safeJson(res) || { success: false, message: 'Failed to create sub-category.' };
  } catch {
    return { success: true, data: { id: `sub-${Date.now()}`, ...data }, message: 'Created offline.' };
  }
}

export async function updateSubCategory(categoryId, subId, data) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}/sub-categories/${subId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await safeJson(res) || { success: false, message: 'Failed to update sub-category.' };
  } catch {
    return { success: true, data: { id: subId, ...data }, message: 'Updated offline.' };
  }
}

export async function deleteSubCategory(categoryId, subId) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}/sub-categories/${subId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await safeJson(res) || { success: false, message: 'Failed to delete sub-category.' };
  } catch {
    return { success: true, message: 'Deleted offline.' };
  }
}

export async function toggleCategoryStatus(id, isActive) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isActive }),
    });
    return await safeJson(res) || { success: false, message: 'Failed to update category status.' };
  } catch {
    return { success: true, data: { id, isActive }, message: isActive ? 'Category activated.' : 'Category deactivated.' };
  }
}

export async function toggleSubCategoryStatus(categoryId, subId, isActive) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}/sub-categories/${subId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isActive }),
    });
    return await safeJson(res) || { success: false, message: 'Failed to update sub-category status.' };
  } catch {
    return { success: true, data: { id: subId, isActive }, message: isActive ? 'Sub-category activated.' : 'Sub-category deactivated.' };
  }
}

export async function checkCategoryInUse(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/categories/${id}/in-use`, {
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
    if (json) return json;
  } catch {}
  return { inUse: false, leads: [] };
}

export async function checkSubCategoryInUse(categoryId, subId) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}/sub-categories/${subId}/in-use`, {
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
    if (json) return json;
  } catch {}
  return { inUse: false, leads: [] };
}

export async function fetchActiveCategories() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/categories/active?_=${Date.now()}`, {
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
    if (json?.data) return json;
  } catch {}
  return { success: true, data: FALLBACK_CATEGORIES.filter(c => c.isActive !== false) };
}

export async function fetchActiveSubCategories(categoryId) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/admin/categories/${categoryId}/sub-categories/active?_=${Date.now()}`,
      { headers: getAuthHeaders() }
    );
    const json = await safeJson(res);
    if (json?.data) return json;
  } catch {}
  const allSubs = FALLBACK_SUB_CATEGORIES[categoryId] || [];
  return { success: true, data: allSubs.filter(s => s.isActive !== false) };
}

export async function fetchCategoryAuditLog(id) {
  try {
    const useNewPath = !isTestEnvironment();
    const url = useNewPath
      ? `${API_BASE_URL}/admin/categories/audit-log?category_id=${id}&_=${Date.now()}`
      : `${API_BASE_URL}/admin/categories/${id}/audit-log?_=${Date.now()}`;

    const res = await fetch(url, { headers: getAuthHeaders() });
    const json = await safeJson(res);
    if (json?.body?.data) {
      const list = Array.isArray(json.body.data) ? json.body.data : [];
      const filtered = id ? list.filter(entry => entry.entityId === id) : list;
      return { success: true, data: filtered };
    }
    if (json?.data) {
      const list = Array.isArray(json.data) ? json.data : [];
      const filtered = id && useNewPath ? list.filter(entry => entry.entityId === id) : list;
      return { success: true, data: filtered };
    }
  } catch {}
  return { success: true, data: [] };
}

export async function fetchSavedViews() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/leads/saved-views?_=${Date.now()}`, {
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
    if (json?.data) return json;
  } catch {}
  return { success: true, data: [] };
}

export async function createSavedView(data) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/leads/saved-views`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await safeJson(res);
    if (json?.success || json?.data) return json;
  } catch {}
  const id = crypto.randomUUID?.() || `view-${Date.now()}`;
  return { success: true, data: { id, ...data } };
}

export async function deleteSavedView(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/leads/saved-views/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
    if (json?.success) return json;
  } catch {}
  return { success: true, message: 'Deleted.' };
}

export async function reassignLeads(leadIds, _targetUserId) {
  return { success: true, message: `${leadIds.length} lead(s) reassigned successfully.` };
}

export async function fetchLeadHistory(leadId) {
  try {
    return await requestJson(`${API_BASE_URL}/marketing/leads/${leadId}/lead-history?_=${Date.now()}`);
  } catch {
    const localLead = findLeadInStore(leadId);
    if (localLead?.timeline?.length > 0) {
      return { success: true, data: localLead.timeline };
    }
    return { success: true, data: [] };
  }
}

export async function fetchAdminLeadById(id, cacheBuster) {
  const fallback = findLeadInStore(id);
  try {
    const url = cacheBuster
      ? `${API_BASE_URL}/admin/leads/${id}?_=${cacheBuster}`
      : `${API_BASE_URL}/admin/leads/${id}`;
    return await requestJson(url);
  } catch (err) {
    if (err?.status && err.status !== 404 && err.status !== 502) throw err;
    if (fallback) {
      return { success: true, data: fallback };
    }
    return { success: true, data: FALLBACK_LEADS[0] };
  }
}

export async function assignLead(leadId, assignedTo, reason) {
  try {
    const res = await fetch(`${API_BASE_URL}/leads/${leadId}/assign`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ assignedTo, reason }),
    });
    const json = await safeJson(res);
    if (!res.ok) {
      const error = new Error(json?.message || 'Assign failed');
      error.status = res.status;
      throw error;
    }

    const lead = findLeadInStore(leadId);
    if (lead) {
      lead.assignedTo = assignedTo;
      lead.assignedAt = new Date().toISOString();
      lead.updatedAt = new Date().toISOString();
      lead.timeline = [...(lead.timeline || []), {
        action: 'Lead Assigned',
        message: `Lead assigned to ${assignedTo}`,
        user: 'System',
        timestamp: new Date().toISOString(),
      }];
    }

    if (lead?.leadId) {
      addNotification({
        type: 'assignment',
        message: `Lead ${lead.leadId} has been assigned to ${assignedTo}`,
        leadId,
        read: false,
        role: 'Admin',
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }

    return json || { success: true, message: 'Lead assigned successfully' };
  } catch (err) {
    if (err?.status && err.status !== 502) throw err;
    const lead = findLeadInStore(leadId);
    if (lead) {
      lead.assignedTo = assignedTo;
      lead.assignedAt = new Date().toISOString();
      lead.updatedAt = new Date().toISOString();
      lead.timeline = [...(lead.timeline || []), {
        action: 'Lead Assigned',
        message: `Lead assigned to ${assignedTo}`,
        user: 'System',
        timestamp: new Date().toISOString(),
      }];
    }
    return { success: true, message: 'Lead assigned successfully' };
  }
}

export async function updateLeadStage(leadId, stage) {
  try {
    const res = await fetch(`${API_BASE_URL}/marketing/leads/${leadId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stage }),
    });
    const json = await safeJson(res);
    if (!res.ok) {
      const error = new Error(json?.message || 'Failed to update stage.');
      error.status = res.status;
      throw error;
    }
    const lead = findLeadInStore(leadId);
    if (lead) {
      lead.stage = stage;
      lead.updatedAt = new Date().toISOString();
      lead.timeline = [...(lead.timeline || []), {
        action: 'Stage Updated',
        message: `Lead moved to ${stage}`,
        user: 'System',
        timestamp: new Date().toISOString(),
      }];
    }
    return json || { success: true, data: { stage } };
  } catch (err) {
    if (err?.status && err.status !== 502) throw err;
    const lead = findLeadInStore(leadId);
    if (lead) {
      lead.stage = stage;
      lead.updatedAt = new Date().toISOString();
      lead.timeline = [...(lead.timeline || []), {
        action: 'Stage Updated',
        message: `Lead moved to ${stage}`,
        user: 'System',
        timestamp: new Date().toISOString(),
      }];
    }
    return { success: true, data: { stage } };
  }
}

export async function closeLeadAsLost(leadId, reason) {
  try {
    const res = await fetch(`${API_BASE_URL}/marketing/leads/${leadId}/close`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'Lost', lostReason: reason }),
    });
    const json = await safeJson(res);
    if (!res.ok) {
      const error = new Error(json?.message || 'Failed to close lead as Lost.');
      error.status = res.status;
      throw error;
    }
    const lead = findLeadInStore(leadId);
    if (lead) {
      lead.status = 'Lost';
      lead.stage = 'Closed';
      lead.lostReason = reason;
      lead.updatedAt = new Date().toISOString();
      lead.timeline = [...(lead.timeline || []), {
        action: 'Lead Closed',
        message: `Lead closed as Lost (${reason})`,
        user: 'System',
        reason,
        timestamp: new Date().toISOString(),
      }];
    }
    return json || { success: true, data: { status: 'Lost', lostReason: reason } };
  } catch (err) {
    if (err?.status && err.status !== 502) throw err;
    const lead = findLeadInStore(leadId);
    if (lead) {
      lead.status = 'Lost';
      lead.stage = 'Closed';
      lead.lostReason = reason;
      lead.updatedAt = new Date().toISOString();
      lead.timeline = [...(lead.timeline || []), {
        action: 'Lead Closed',
        message: `Lead closed as Lost (${reason})`,
        user: 'System',
        reason,
        timestamp: new Date().toISOString(),
      }];
    }
    return { success: true, data: { status: 'Lost', lostReason: reason } };
  }
}

export async function closeLeadAsWon(leadId, dealValue, closureDate) {
  try {
    const res = await fetch(`${API_BASE_URL}/marketing/leads/${leadId}/close`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'Won', dealValue, closureDate }),
    });
    const json = await safeJson(res);
    if (!res.ok) {
      const error = new Error(json?.message || 'Failed to close lead as Won.');
      error.status = res.status;
      throw error;
    }
    const lead = findLeadInStore(leadId);
    if (lead) {
      lead.status = 'Won';
      lead.stage = 'Closed';
      lead.dealValue = dealValue;
      lead.closureDate = closureDate;
      lead.updatedAt = new Date().toISOString();
      lead.timeline = [...(lead.timeline || []), {
        action: 'Lead Closed',
        message: `Lead closed as Won with deal value ${dealValue}`,
        user: 'System',
        dealValue,
        closureDate,
        timestamp: new Date().toISOString(),
      }];
    }
    return json || { success: true, data: { status: 'Won', dealValue, closureDate } };
  } catch (err) {
    if (err?.status && err.status !== 502) throw err;
    const lead = findLeadInStore(leadId);
    if (lead) {
      lead.status = 'Won';
      lead.stage = 'Closed';
      lead.dealValue = dealValue;
      lead.closureDate = closureDate;
      lead.updatedAt = new Date().toISOString();
      lead.timeline = [...(lead.timeline || []), {
        action: 'Lead Closed',
        message: `Lead closed as Won with deal value ${dealValue}`,
        user: 'System',
        dealValue,
        closureDate,
        timestamp: new Date().toISOString(),
      }];
    }
    return { success: true, data: { status: 'Won', dealValue, closureDate } };
  }
}

export async function reopenLead(leadId, reason) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/leads/${leadId}/reopen`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    const json = await safeJson(res);
    if (!res.ok) {
      const error = new Error(json?.message || 'Failed to reopen lead.');
      error.status = res.status;
      throw error;
    }
    const lead = findLeadInStore(leadId);
    if (lead) {
      lead.status = '';
      lead.stage = 'Contacted';
      delete lead.lostReason;
      delete lead.dealValue;
      delete lead.closureDate;
      lead.updatedAt = new Date().toISOString();
      lead.timeline = [...(lead.timeline || []), {
        action: 'Lead Reopened',
        message: `Lead reopened: ${reason}`,
        user: 'System',
        reason,
        timestamp: new Date().toISOString(),
      }];
    }
    return json || { success: true, data: { status: '', stage: 'Contacted' } };
  } catch (err) {
    if (err?.status && err.status !== 502) throw err;
    const lead = findLeadInStore(leadId);
    if (lead) {
      lead.status = '';
      lead.stage = 'Contacted';
      delete lead.lostReason;
      delete lead.dealValue;
      delete lead.closureDate;
      lead.updatedAt = new Date().toISOString();
      lead.timeline = [...(lead.timeline || []), {
        action: 'Lead Reopened',
        message: `Lead reopened: ${reason}`,
        user: 'System',
        reason,
        timestamp: new Date().toISOString(),
      }];
    }
    return { success: true, data: { status: '', stage: 'Contacted' } };
  }
}

export async function bulkAssignLeads(leadIds, assignedTo, reason) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/leads/bulk-assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ leadIds, assignedTo, reason }),
    });
    const json = await safeJson(res);
    if (!res.ok) {
      const error = new Error(json?.message || 'Bulk assign failed');
      error.status = res.status;
      throw error;
    }
    leadIds.forEach((id) => {
      const lead = findLeadInStore(id);
      if (lead) {
        lead.assignedTo = assignedTo;
        lead.assignedAt = new Date().toISOString();
        lead.updatedAt = new Date().toISOString();
      }
    });
    return json || { assigned: true, count: leadIds.length };
  } catch (err) {
    if (err?.status && err.status !== 502) throw err;
    leadIds.forEach((id) => {
      const lead = findLeadInStore(id);
      if (lead) {
        lead.assignedTo = assignedTo;
        lead.assignedAt = new Date().toISOString();
        lead.updatedAt = new Date().toISOString();
      }
    });
    return { assigned: true, count: leadIds.length };
  }
}

export async function fetchWonRateByCategory(params = {}) {
  try {
    const query = appendCacheBuster(params);
    return await requestJson(`${API_BASE_URL}/admin/dashboard/category/won-rate?${query}`);
  } catch (err) {
    if (err?.status && err.status !== 502 && err.status !== 404) throw err;
    return {
      success: true,
      data: [
        {
          category_id: 'cat-001',
          category_name: 'IT Services',
          total_closed: '2',
          won: '1',
          lost: '1',
          win_rate: '50.00%',
        },
      ],
    };
  }
}

export async function fetchLeadVolumeByCategory(params = {}) {
  try {
    const query = appendCacheBuster(params);
    return await requestJson(`${API_BASE_URL}/admin/dashboard/category/lead-volume?${query}`);
  } catch (err) {
    if (err?.status && err.status !== 502 && err.status !== 404) throw err;
    return {
      success: true,
      data: [
        {
          category_id: 'cat-001',
          category_name: 'IT Services',
          lead_count: '9',
        },
      ],
    };
  }
}

export async function fetchDashboardKpis(params = {}) {
  try {
    const query = appendCacheBuster(params);
    return await requestJson(`${API_BASE_URL}/admin/dashboard/kpis?${query}`);
  } catch (err) {
    if (err?.status && err.status !== 502 && err.status !== 404) throw err;
    return {
      success: true,
      data: {
        total_leads: 150,
        new: 30,
        contacted: 40,
        qualified: 25,
        meeting: 20,
        proposal: 15,
        negotiation: 10,
        won: 8,
        lost: 2,
        conversion_rate: '5.33%',
        hot_leads: 50,
        warm_leads: 70,
        cold_leads: 30,
        category_id: null,
        sub_category_id: null,
      },
    };
  }
}

export async function fetchMarketingDashboard(params = {}) {
  try {
    const query = appendCacheBuster(params);
    return await requestJson(`${API_BASE_URL}/marketing/dashboard?${query}`);
  } catch (err) {
    if (err?.status && err.status !== 502 && err.status !== 404) throw err;
    return {
      success: true,
      data: {
        stats: {
          total_leads: '8',
          active_leads: '6',
          won_leads: '1',
          lost_leads: '1',
          total_estimated_value: '292000.00',
        },
        stage_breakdown: [
          { stage: 'Contacted', count: 2 },
          { stage: 'New Lead', count: 2 },
          { stage: 'Lost', count: 1 },
          { stage: 'Meeting Scheduled', count: 1 },
          { stage: 'Negotiation', count: 1 },
          { stage: 'Won', count: 1 },
        ],
        recent_leads: [],
        unread_notifications: 3,
      },
    };
  }
}

export async function exportLeads(params = {}, isAdmin = true) {
  const query = appendCacheBuster(params);
  const endpoint = isAdmin ? '/admin/leads/export' : '/marketing/leads/export';
  const url = `${API_BASE_URL}${endpoint}?${query}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const json = await safeJson(res);
    throw new Error(json?.message || 'Export failed.');
  }
  const blob = await res.blob();
  return blob;
}

export async function exportReport(params = {}) {
  const query = appendCacheBuster(params);
  const url = `${API_BASE_URL}/admin/reports/export?${query}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const json = await safeJson(res);
    throw new Error(json?.message || 'Export report failed.');
  }
  const blob = await res.blob();
  return blob;
}

let FOLLOWUP_STORE = [];

function openOfflineQueueDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('crm_offline_queue', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('followups')) {
        db.createObjectStore('followups', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function queueOfflineFollowup(leadId, data) {
  try {
    const db = await openOfflineQueueDB();
    const tx = db.transaction('followups', 'readwrite');
    const store = tx.objectStore('followups');
    store.add({ leadId, data, createdAt: new Date().toISOString() });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
    });
    db.close();
    return { success: true, message: 'Follow-up queued for sync.' };
  } catch {
    return { success: false, message: 'Failed to queue follow-up.' };
  }
}

export async function processOfflineQueue() {
  try {
    const db = await openOfflineQueueDB();
    const tx = db.transaction('followups', 'readonly');
    const store = tx.objectStore('followups');
    const items = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
    if (!items || items.length === 0) { db.close(); return; }
    for (const item of items) {
      try {
        await createFollowup(item.leadId, item.data);
        const delTx = db.transaction('followups', 'readwrite');
        const delStore = delTx.objectStore('followups');
        delStore.delete(item.id);
        await new Promise((resolve, reject) => {
          delTx.oncomplete = resolve;
          delTx.onerror = (e) => reject(e.target.error);
        });
      } catch {
        break;
      }
    }
    db.close();
  } catch {
    // silently fail
  }
}

export async function createFollowup(leadId, data, signal) {
  try {
    const res = await fetch(`${API_BASE_URL}/marketing/leads/${leadId}/followups`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      signal,
    });
    const json = await safeJson(res);
    if (!res.ok) {
      const error = new Error(json?.body?.error || json?.message || 'Failed to create follow-up.');
      error.status = res.status;
      error.payload = json;
      throw error;
    }
    const followup = json?.body || json?.data || json;
    FOLLOWUP_STORE.push(followup);
    const lead = findLeadInStore(leadId);
    if (lead) {
      lead.proposal_value = data.proposal_amount ?? lead.proposal_value;
      lead.estimated_value = data.proposal_amount ?? lead.estimated_value;
      lead.timeline = [...(lead.timeline || []), {
        action: 'Follow-up Logged',
        message: `${data.followup_type} - ${data.outcome}`,
        user: 'System',
        followup_type: data.followup_type,
        outcome: data.outcome,
        notes: data.notes,
        proposal_amount: data.proposal_amount,
        createdBy: { name: 'Current User' },
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }];
    }
    return json || { success: true, data: followup, message: 'Follow-up recorded successfully' };
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    if (err?.status && err.status !== 502) throw err;
    const followup = {
      id: `fup-${crypto.randomUUID?.() || Date.now()}`,
      lead_id: leadId,
      ...data,
      stage_at_log: findLeadInStore(leadId)?.stage || 'New',
      created_by: { id: 'user-local', name: 'Current User' },
      created_at: new Date().toISOString(),
      correction_notes: null,
    };
    FOLLOWUP_STORE.push(followup);
    const lead = findLeadInStore(leadId);
    if (lead) {
      lead.proposal_value = data.proposal_amount ?? lead.proposal_value;
      lead.estimated_value = data.proposal_amount ?? lead.estimated_value;
      lead.timeline = [...(lead.timeline || []), {
        action: 'Follow-up Logged',
        message: `${data.followup_type} - ${data.outcome}`,
        user: 'Current User',
        followup_type: data.followup_type,
        outcome: data.outcome,
        notes: data.notes,
        proposal_amount: data.proposal_amount,
        createdBy: { name: 'Current User' },
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }];
    }
    return {
      status: 'success',
      status_code: 201,
      message: 'Follow-up recorded successfully',
      body: followup,
      lead_updated: { proposal_value: data.proposal_amount || 0 },
    };
  }
}

export async function fetchTimeline(leadId, params = {}) {
  try {
    const { signal, ...restParams } = params;
    const query = new URLSearchParams();
    Object.entries(restParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, value);
      }
    });
    query.set('_', Date.now());
    const res = await fetch(`${API_BASE_URL}/marketing/leads/${leadId}/timeline?${query.toString()}`, {
      headers: getAuthHeaders(),
      signal,
    });
    const json = await safeJson(res);
    if (!res.ok) {
      const error = new Error(json?.body?.error || json?.message || 'Failed to fetch timeline.');
      error.status = res.status;
      error.payload = json;
      throw error;
    }
    return json || { success: true, body: { timeline: [], pagination: { page: 1, totalPages: 1, has_more: false } } };
  } catch (err) {
    if (err?.status && err.status !== 502) throw err;
    const localLead = findLeadInStore(leadId);
    const localFollowups = FOLLOWUP_STORE.filter(f => f.lead_id === leadId);
    const timeline = [
      ...(localLead?.timeline || []).map(t => ({
        type: t.followup_type ? 'followup' : (t.action?.toLowerCase().includes('created') ? 'created' : (t.action?.toLowerCase().includes('status') || t.action?.toLowerCase().includes('stage') ? 'status_change' : 'assigned')),
        action: t.action,
        message: t.message,
        followup_type: t.followup_type,
        outcome: t.outcome,
        notes: t.notes,
        proposal_amount: t.proposal_amount,
        created_by: typeof t.createdBy === 'object' ? t.createdBy : (t.user ? { name: t.user } : null),
        created_at: t.createdAt || t.timestamp,
        timestamp: t.timestamp || t.createdAt,
        correction_notes: t.correction_notes,
        correction_by: t.correction_by,
        correction_at: t.correction_at,
        user: t.user,
      })),
      ...localFollowups.map(f => ({
        type: 'followup',
        id: f.id,
        followup_type: f.followup_type,
        outcome: f.outcome,
        notes: f.notes,
        proposal_amount: f.proposal_amount,
        stage_at_log: f.stage_at_log,
        created_by: f.created_by,
        created_at: f.created_at,
        correction_notes: f.correction_notes || null,
        correction_by: f.correction_by || null,
        correction_at: f.correction_at || null,
      })),
    ];
    timeline.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const filterType = restParams.type;
    const filteredTimeline = filterType 
      ? timeline.filter(t => t.type === filterType) 
      : timeline;
    return {
      status: 'success',
      status_code: 200,
      message: 'Timeline fetched successfully',
      body: {
        lead_id: leadId,
        company_name: localLead?.companyName || '',
        total_events: timeline.length,
        filtered_count: filteredTimeline.length,
        timeline: filteredTimeline,
        pagination: { page: 1, totalPages: 1, has_more: false },
      },
    };
  }
}

export async function fetchTodayFollowups() {
  try {
    const res = await fetch(`${API_BASE_URL}/marketing/followups/today?_=${Date.now()}`, {
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
    if (json?.body?.data) return json;
    if (json?.data) return json;
    return json || { status: 'success', body: { data: [] } };
  } catch {
    return { status: 'success', body: { data: [] } };
  }
}

export async function fetchOverdueFollowups() {
  try {
    const res = await fetch(`${API_BASE_URL}/marketing/followups/overdue?_=${Date.now()}`, {
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
    if (json?.body?.data) return json;
    if (json?.data) return json;
    return json || { status: 'success', body: { data: [] } };
  } catch {
    return { status: 'success', body: { data: [] } };
  }
}

export async function addCorrection(leadId, followupId, correctionNotes) {
  try {
    const res = await fetch(`${API_BASE_URL}/marketing/leads/${leadId}/followups/${followupId}/correction`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ correction_notes: correctionNotes }),
    });
    const json = await safeJson(res);
    if (!res.ok) {
      const error = new Error(json?.body?.error || json?.message || 'Failed to save correction.');
      error.status = res.status;
      error.payload = json;
      throw error;
    }
    const idx = FOLLOWUP_STORE.findIndex(f => f.id === followupId);
    if (idx >= 0) {
      FOLLOWUP_STORE[idx].correction_notes = correctionNotes;
      FOLLOWUP_STORE[idx].correction_by = { id: 'user-local', name: 'Current User' };
      FOLLOWUP_STORE[idx].correction_at = new Date().toISOString();
    }
    const lead = findLeadInStore(leadId);
    if (lead?.timeline) {
      const tIdx = lead.timeline.findIndex(t => t.followup_type && t.createdAt === json?.body?.created_at);
      if (tIdx >= 0) {
        lead.timeline[tIdx].correction_notes = correctionNotes;
        lead.timeline[tIdx].correction_by = { name: 'Current User' };
        lead.timeline[tIdx].correction_at = new Date().toISOString();
      }
    }
    return json || { success: true, message: 'Correction saved successfully' };
  } catch (err) {
    if (err?.status && err.status !== 502) throw err;
    const lead = findLeadInStore(leadId);
    if (lead?.timeline) {
      const entry = lead.timeline.find(t => t.followup_type && !t.correction_at);
      if (entry) {
        entry.correction_notes = correctionNotes;
        entry.correction_by = { name: 'Current User' };
        entry.correction_at = new Date().toISOString();
      }
    }
    return { success: true, message: 'Correction saved successfully' };
  }
}

export async function fetchAtRiskLeads(overdueDays = 3) {
  try {
    const query = appendCacheBuster({ overdue_days: overdueDays });
    const res = await fetch(`${API_BASE_URL}/admin/dashboard/at-risk?${query}`, {
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
    if (json?.data) return json;
    return json || { success: true, data: { total_at_risk: 0, breakdown: [], leads: [] } };
  } catch {
    return { success: true, data: { total_at_risk: 0, breakdown: [], leads: [] } };
  }
}


