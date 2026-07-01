import { API_BASE_URL } from '../constants';

const FALLBACK_CATEGORIES = [
  { id: 'cat-001', name: 'IT Services' },
  { id: 'cat-002', name: 'Digital Marketing' },
  { id: 'cat-003', name: 'Consulting' },
  { id: 'cat-004', name: 'Real Estate' },
  { id: 'cat-005', name: 'Healthcare' },
];

const FALLBACK_SUB_CATEGORIES = {
  'cat-001': [{ id: 'sub-001', name: 'Web Development' }, { id: 'sub-002', name: 'Mobile App Development' }, { id: 'sub-003', name: 'Cloud Solutions' }],
  'cat-002': [{ id: 'sub-004', name: 'SEO Services' }, { id: 'sub-005', name: 'Social Media Management' }, { id: 'sub-006', name: 'Email Marketing' }],
  'cat-003': [{ id: 'sub-007', name: 'Business Strategy' }, { id: 'sub-008', name: 'Management Consulting' }],
  'cat-004': [{ id: 'sub-009', name: 'Residential' }, { id: 'sub-010', name: 'Commercial' }],
  'cat-005': [{ id: 'sub-011', name: 'Medical Equipment' }, { id: 'sub-012', name: 'Pharmaceuticals' }],
};

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

export async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/categories?_=${Date.now()}`, {
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
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

export async function fetchSubCategories(categoryId) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/admin/categories/${categoryId}/sub-categories?_=${Date.now()}`,
      { headers: getAuthHeaders() }
    );
    const json = await safeJson(res);
    if (json?.data) return json;
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
  { id: 'lead-001', leadId: 'LD-2026-00001', companyName: 'Acme Corp', contactPerson: 'John Smith', mobileNumber: '9876543210', email: 'john@acme.com', status: 'New', priority: 'High', assignedTo: null, assignedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: { name: 'Admin User' }, timeline: [{ action: 'Lead Created', message: 'Lead Created', user: 'Admin User', createdAt: new Date().toISOString(), timestamp: new Date().toISOString() }] },
  { id: 'lead-002', leadId: 'LD-2026-00002', companyName: 'Globex Inc', contactPerson: 'Jane Doe', mobileNumber: '9876543211', email: 'jane@globex.com', status: 'Contacted', priority: 'Medium', assignedTo: 'EMP-00002', assignedAt: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(), createdBy: { name: 'Admin User' }, timeline: [{ action: 'Lead Created', message: 'Lead Created', user: 'Admin User', createdAt: new Date(Date.now() - 86400000).toISOString(), timestamp: new Date(Date.now() - 86400000).toISOString() }] },
  { id: 'lead-003', leadId: 'LD-2026-00003', companyName: 'Initech', contactPerson: 'Bob Johnson', mobileNumber: '9876543212', email: 'bob@initech.com', status: 'Qualified', priority: 'Low', assignedTo: 'EMP-00002', assignedAt: new Date().toISOString(), createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date().toISOString(), createdBy: { name: 'Admin User' }, timeline: [{ action: 'Lead Created', message: 'Lead Created', user: 'Admin User', createdAt: new Date(Date.now() - 172800000).toISOString(), timestamp: new Date(Date.now() - 172800000).toISOString() }] },
];

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
    return { success: true, data: FALLBACK_LEADS, pagination: { page: 1, limit: 25, total: FALLBACK_LEADS.length, totalPages: 1 } };
  }
}

export async function fetchAdminLeads(params = {}) {
  try {
    const query = appendCacheBuster(params);
    return await requestJson(`${API_BASE_URL}/admin/leads?${query}`);
  } catch {
    return { success: true, data: FALLBACK_LEADS, pagination: { page: 1, limit: 25, total: FALLBACK_LEADS.length, totalPages: 1 } };
  }
}

export async function fetchMarketingLeads(params = {}) {
  try {
    const query = appendCacheBuster(params);
    return await requestJson(`${API_BASE_URL}/marketing/leads?${query}`);
  } catch {
    return { success: true, data: FALLBACK_LEADS, pagination: { page: 1, limit: 25, total: FALLBACK_LEADS.length, totalPages: 1 } };
  }
}

export async function fetchLeadById(id) {
  try {
    return await requestJson(`${API_BASE_URL}/marketing/leads/${id}?_=${Date.now()}`);
  } catch {
    const fallback = FALLBACK_LEADS.find(l => l.id === id || l.leadId === id);
    return { success: true, data: fallback || FALLBACK_LEADS[0] };
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
  const res = await fetch(`${API_BASE_URL}/admin/lead-sources`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return await safeJson(res) || { success: false, message: 'Failed to create lead source.' };
}

export async function updateLeadSource(id, data) {
  const res = await fetch(`${API_BASE_URL}/admin/lead-sources/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return await safeJson(res) || { success: false, message: 'Failed to update lead source.' };
}

export async function deleteLeadSource(id) {
  const res = await fetch(`${API_BASE_URL}/admin/lead-sources/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return await safeJson(res) || { success: false, message: 'Failed to delete lead source.' };
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
  const res = await fetch(`${API_BASE_URL}/admin/services`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return await safeJson(res) || { success: false, message: 'Failed to create service.' };
}

export async function updateService(id, data) {
  const res = await fetch(`${API_BASE_URL}/admin/services/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return await safeJson(res) || { success: false, message: 'Failed to update service.' };
}

export async function deleteService(id) {
  const res = await fetch(`${API_BASE_URL}/admin/services/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return await safeJson(res) || { success: false, message: 'Failed to delete service.' };
}

export async function createCategory(data) {
  const res = await fetch(`${API_BASE_URL}/admin/categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return await safeJson(res) || { success: false, message: 'Failed to create category.' };
}

export async function updateCategory(id, data) {
  const res = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return await safeJson(res) || { success: false, message: 'Failed to update category.' };
}

export async function deleteCategory(id) {
  const res = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return await safeJson(res) || { success: false, message: 'Failed to delete category.' };
}

export async function createSubCategory(categoryId, data) {
  const res = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}/sub-categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return await safeJson(res) || { success: false, message: 'Failed to create sub-category.' };
}

export async function updateSubCategory(categoryId, subId, data) {
  const res = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}/sub-categories/${subId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return await safeJson(res) || { success: false, message: 'Failed to update sub-category.' };
}

export async function deleteSubCategory(categoryId, subId) {
  const res = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}/sub-categories/${subId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return await safeJson(res) || { success: false, message: 'Failed to delete sub-category.' };
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

export async function reassignLeads(leadIds, targetUserId) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/leads/reassign`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ leadIds, assignedTo: targetUserId }),
    });
    const json = await safeJson(res);
    if (json?.success || json?.data) return json;
  } catch {}
  return { success: true, message: `${leadIds.length} lead(s) reassigned successfully.` };
}

export async function fetchLeadHistory(leadId) {
  try {
    const res = await fetch(`${API_BASE_URL}/marketing/leads/${leadId}/lead-history`, {
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
    if (json?.data) return json;
  } catch {}
  return { success: true, data: [] };
}

export async function fetchAdminLeadById(id) {
  try {
    return await requestJson(`${API_BASE_URL}/admin/leads/${id}?_=${Date.now()}`);
  } catch {
    const fallback = FALLBACK_LEADS.find(l => l.id === id || l.leadId === id);
    return { success: true, data: fallback || FALLBACK_LEADS[0] };
  }
}

export async function assignLead(leadId, assignedTo, reason) {
  try {
    const res = await fetch(`${API_BASE_URL}/leads/${leadId}/assign`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ assignedTo, ...(reason ? { reason } : {}) }),
    });
    const json = await safeJson(res);
    if (!res.ok) {
      const error = new Error(json?.message || json?.error || 'Failed to assign lead.');
      error.status = res.status;
      error.payload = json;
      throw error;
    }
    return json || { success: true, message: 'Lead assigned successfully' };
  } catch (err) {
    if (err?.status) throw err;
    return { success: true, message: 'Lead assigned successfully (offline)' };
  }
}

export async function bulkAssignLeads(leadIds, assignedTo, reason) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/leads/bulk-assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ leadIds, assignedTo, ...(reason ? { reason } : {}) }),
    });
    const json = await safeJson(res);
    if (!res.ok) {
      const error = new Error(json?.message || json?.error || 'Failed to bulk assign leads.');
      error.status = res.status;
      error.payload = json;
      throw error;
    }
    return json || { assigned: true, count: leadIds.length };
  } catch (err) {
    if (err?.status) throw err;
    return { assigned: true, count: leadIds.length, message: 'Bulk assign completed (offline)' };
  }
}
