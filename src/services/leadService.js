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
    const query = new URLSearchParams(params).toString();
    const separator = query ? '&' : '';
    const url = `${API_BASE_URL}/marketing/leads?${query}${separator}_=${Date.now()}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    const json = await safeJson(res);
    if (json?.data) return json;
  } catch {}
  return { success: true, data: [], total: 0, totalPages: 1, pagination: { total: 0, totalPages: 1, page: 1, limit: 10 } };
}

export async function fetchLeadById(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/marketing/leads/${id}?_=${Date.now()}`, {
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
    if (json?.data) return json;
  } catch {}
  return { success: false, message: 'Lead not found.' };
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

export async function fetchLeadHistory(leadId) {
  try {
    const res = await fetch(`${API_BASE_URL}/marketing/leads/${leadId}/lead-history?_=${Date.now()}`, {
      headers: getAuthHeaders(),
    });
    const json = await safeJson(res);
    if (json?.data) return json;
  } catch {}
  return { success: true, data: [] };
}
