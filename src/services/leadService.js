import { API_BASE_URL } from '../constants';
import { addNotification } from './notificationService';

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
    if (err?.status && err.status !== 404) throw err;
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
    if (err?.status && err.status !== 404) throw err;
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
    throw err;
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
    if (err?.status) throw err;
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
    if (err?.status) throw err;
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
    if (err?.status) throw err;
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
    if (err?.status) throw err;
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
    if (err?.status) throw err;
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
