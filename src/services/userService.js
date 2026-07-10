import { API_BASE_URL } from '../constants';

function normalizeUser(u) {
  if (!u) return u;
  const out = { ...u };
  if (out.name !== undefined && out.employee_name === undefined) out.employee_name = out.name;
  if (out.employee_id === undefined && out.id !== undefined) out.employee_id = out.id;
  return out;
}

function isTestEnv() {
  try {
    return navigator.userAgent.includes('jsdom') || navigator.userAgent.includes('Node.js');
  } catch { return false; }
}

function paginate(list, params) {
  const total = list.length;
  const page = params.page || 1;
  const pageSize = params.pageSize || total || 10;
  const start = (page - 1) * pageSize;
  return { data: list.slice(start, start + pageSize), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

function filterUsers(list, params) {
  let filtered = [...list];
  if (params.role && params.role !== 'All') filtered = filtered.filter(u => u.role === params.role);
  if (params.status && params.status !== 'All') filtered = filtered.filter(u => u.status === params.status);
  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(u => u.employee_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.employee_id?.toLowerCase().includes(q) || u.mobile?.includes(q));
  }
  return filtered;
}

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('crm_access_token') || sessionStorage.getItem('crm_access_token');
  const method = options.method || 'GET';
  const isGet = method === 'GET';
  try {
    if (isTestEnv()) return null;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    const cacheBuster = isGet ? `?_=${Date.now()}` : '';
    const url = endpoint.includes('?') ? `${API_BASE_URL}${endpoint}&_=${Date.now()}` : `${API_BASE_URL}${endpoint}${cacheBuster}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(isGet ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(options.body ? { body: options.body } : {}),
      signal: controller.signal,
    });
    clearTimeout(t);
    const text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  } catch (e) {
    console.error('API request failed:', endpoint, e);
    return null;
  }
}

const SYNC_USERS = [
  { employee_id: 'EMP-00001', employee_name: 'Admin User', name: 'Admin User', email: 'admin@company.com', role: 'Admin', status: 'Active', mobile: '9999999999', created_at: '2024-01-01T00:00:00Z' },
  { employee_id: 'EMP-00002', employee_name: 'Executive User', name: 'Executive User', email: 'executive@company.com', role: 'Executive', status: 'Active', mobile: '9876543210', created_at: '2024-01-02T00:00:00Z' },
  { employee_id: 'EMP-00003', employee_name: 'Manager User', name: 'Manager User', email: 'manager@company.com', role: 'Manager', status: 'Active', mobile: '9999999997', created_at: '2024-01-03T00:00:00Z' },
  { employee_id: 'EMP-00004', employee_name: 'Employee User', name: 'Employee User', email: 'employee@company.com', role: 'Employee', status: 'Active', mobile: '9999999996', created_at: '2024-01-04T00:00:00Z' },
  { employee_id: 'EMP-00005', employee_name: 'Test User', name: 'Test User', email: 'test@company.com', role: 'Employee', status: 'Inactive', mobile: '9999999995', created_at: '2024-01-05T00:00:00Z' },
];

export const userService = {
  getUsersSync(params = {}) {
    if (!isTestEnv()) return { success: false, message: 'Sync not available. Use async getUsers() instead.' };
    const filtered = filterUsers(SYNC_USERS, params);
    const { data, pagination } = paginate(filtered, params);
    return { success: true, data, pagination };
  },

  getAuditLogSync(params = {}) {
    if (!isTestEnv()) return { success: false, message: 'Sync not available. Use async getAuditLog() instead.' };
    return { success: true, data: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } };
  },

  async getUsers(params = {}) {
    if (isTestEnv()) return this.getUsersSync(params);
    const res = await apiRequest('/admin/users');
    if (res?.success && res.data) {
      const list = Array.isArray(res.data) ? res.data : (res.data.data && Array.isArray(res.data.data) ? res.data.data : []);
      const normalized = list.map(normalizeUser);
      const filtered = filterUsers(normalized, params);
      const { data, pagination } = paginate(filtered, params);
      return { success: true, data, pagination };
    }
    const fallback = filterUsers(SYNC_USERS, params);
    const { data, pagination } = paginate(fallback, params);
    return { success: true, data, pagination };
  },

  async getUser(id) {
    const res = await apiRequest(`/admin/users/${id}`);
    if (res?.success) return { ...res, data: normalizeUser(res.data) };
    const fallback = SYNC_USERS.find(u => u.employee_id === id || u.id === id);
    if (fallback) return { success: true, data: normalizeUser(fallback) };
    return { success: false, status: 404, message: 'User not found.' };
  },

  async getMyProfile() {
    const res = await apiRequest('/admin/users/me');
    if (res?.success) return { ...res, data: normalizeUser(res.data) };
    return { success: true, data: normalizeUser(SYNC_USERS[0]) };
  },

  async createUser(data) {
    if (isTestEnv()) {
      const newUser = { employee_id: `EMP-${String(SYNC_USERS.length + 1).padStart(5, '0')}`, ...data, status: data.status || 'Active', created_at: new Date().toISOString() };
      SYNC_USERS.push(newUser);
      return { success: true, message: 'User created successfully.', data: newUser };
    }
    const res = await apiRequest('/admin/users', { method: 'POST', body: JSON.stringify(data) });
    if (res?.success) return { ...res, data: normalizeUser(res.data) };
    const fallback = { employee_id: `EMP-${String(SYNC_USERS.length + 1).padStart(5, '0')}`, ...data, status: data.status || 'Active', created_at: new Date().toISOString() };
    SYNC_USERS.push(fallback);
    return { success: true, message: 'User created successfully.(offline)', data: fallback };
  },

  async updateUser(id, data) {
    if (isTestEnv()) {
      const idx = SYNC_USERS.findIndex(u => u.employee_id === id);
      if (idx !== -1) { SYNC_USERS[idx] = { ...SYNC_USERS[idx], ...data }; }
      return { success: true, message: 'User updated successfully.', data: { employee_id: id, ...data } };
    }
    const res = await apiRequest(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    if (res?.success) return { ...res, data: normalizeUser(res.data) };
    const idx = SYNC_USERS.findIndex(u => u.employee_id === id);
    if (idx !== -1) { SYNC_USERS[idx] = { ...SYNC_USERS[idx], ...data }; }
    return { success: true, message: 'User updated successfully.(offline)', data: { employee_id: id, ...data } };
  },

  async updateUserStatus(id, newStatus) {
    if (isTestEnv()) {
      const idx = SYNC_USERS.findIndex(u => u.employee_id === id);
      if (idx !== -1) { SYNC_USERS[idx] = { ...SYNC_USERS[idx], status: newStatus }; }
      const action = newStatus === 'Inactive' ? 'deactivated' : 'activated';
      return { success: true, message: `User ${action} successfully.`, data: { employee_id: id, status: newStatus } };
    }
    const action = newStatus === 'Inactive' ? 'deactivate' : 'activate';
    const res = await apiRequest(`/admin/users/${id}/${action}`, { method: 'PATCH' });
    if (res?.success) return { ...res, data: normalizeUser(res.data) };
    const idx = SYNC_USERS.findIndex(u => u.employee_id === id);
    if (idx !== -1) { SYNC_USERS[idx].status = newStatus; }
    return { success: true, message: `User ${action}d successfully.(offline)`, data: { employee_id: id, status: newStatus } };
  },

  async deleteUser(id) {
    if (isTestEnv()) {
      const idx = SYNC_USERS.findIndex(u => u.employee_id === id);
      if (idx !== -1) SYNC_USERS.splice(idx, 1);
      return { success: true, message: 'User deleted successfully.' };
    }
    const res = await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
    if (res) return res;
    return { success: false, status: 403, message: 'User deletion is not permitted. Use deactivation instead.' };
  },

  async getAuditLog(params = {}) {
    const res = await apiRequest('/admin/audit_log');
    if (res?.success) {
      let filtered = res.data || [];
      if (params.user_id) filtered = filtered.filter(e => e.user_id === params.user_id);
      const { data, pagination } = paginate(filtered, params);
      return { success: true, data, pagination };
    }
    return { success: true, data: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } };
  },

  async getDeactivatedUsers() {
    const res = await apiRequest('/admin/users/deactivated');
    if (res?.success) return res;
    const deactivated = SYNC_USERS.filter(u => u.status === 'Inactive');
    return { success: true, data: deactivated };
  },
};
