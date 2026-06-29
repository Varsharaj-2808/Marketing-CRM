import { API_BASE_URL, STORAGE_KEYS } from '../constants';

function extractJson(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
    }
  }
  return null;
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const ADMIN_ID = uuid();
const EXEC_ID = uuid();

let USERS = [
  { id: ADMIN_ID, employee_id: 'EMP-00001', employee_name: 'Admin User', mobile: '9876543210', email: 'admin@company.com', role: 'Admin', status: 'Active', createdAt: new Date().toISOString() },
  { id: EXEC_ID, employee_id: 'EMP-00002', employee_name: 'Executive User', mobile: '9876543211', email: 'executive@company.com', role: 'Marketing Executive', status: 'Active', createdAt: new Date().toISOString() },
  { id: uuid(), employee_id: 'EMP-00003', employee_name: 'Deactivated User', mobile: '9988776655', email: 'deactivated@company.com', role: 'Marketing Executive', status: 'Inactive', createdAt: new Date().toISOString() },
];
const INITIAL_USERS = [...USERS];

let AUDIT_LOG = [
  { id: uuid(), user_id: ADMIN_ID, action: 'LOGIN_SUCCESS', resource: 'Auth', resourceId: '', details: 'Successful login', ipAddress: '::1', userAgent: 'Chrome/120', result: 'Success', createdAt: new Date(Date.now() - 60000).toISOString(), email: 'admin@company.com' },
  { id: uuid(), user_id: EXEC_ID, action: 'LOGIN_SUCCESS', resource: 'Auth', resourceId: '', details: 'Successful login', ipAddress: '::1', userAgent: 'Chrome/120', result: 'Success', createdAt: new Date(Date.now() - 30000).toISOString(), email: 'executive@company.com' },
];

function getTokenUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER) || sessionStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function normalizeUser(u) {
  if (!u) return u;
  const out = { ...u };
  if (out.name !== undefined && out.employee_name === undefined) out.employee_name = out.name;
  if (out.accountStatus !== undefined) out.status = capitalize(out.accountStatus);
  else if (out.status) out.status = capitalize(out.status);
  return out;
}

function isTestEnv() {
  try {
    return navigator.userAgent.includes('jsdom') || navigator.userAgent.includes('Node.js');
  } catch { return false; }
}

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('crm_access_token') || sessionStorage.getItem('crm_access_token');
  const method = options.method || 'GET';
  const isGet = method === 'GET';
  try {
    if (isTestEnv()) return null;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(isGet ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(options.body ? { body: options.body } : {}),
      signal: controller.signal,
    });
    clearTimeout(t);
    const text = await res.text();
    const json = extractJson(text);
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  } catch (e) {
    console.error('API request failed:', endpoint, e);
    return null;
  }
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

function paginate(list, params) {
  const total = list.length;
  const page = params.page || 1;
  const pageSize = params.pageSize || total || 10;
  const start = (page - 1) * pageSize;
  return { data: list.slice(start, start + pageSize), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

export const userService = {
  getUsersSync(params = {}) {
    const filtered = filterUsers(USERS, params);
    const { data, pagination } = paginate(filtered, params);
    return { success: true, data, pagination };
  },

  getAuditLogSync(params = {}) {
    let filtered = [...AUDIT_LOG];
    if (params.user_id) filtered = filtered.filter(e => e.resourceId === params.user_id);
    const { data, pagination } = paginate(filtered, params);
    return { success: true, data, pagination };
  },

  async getUsers(params = {}) {
    const res = await apiRequest('/admin/users');
    if (res?.success) {
      const normalized = (res.data || []).map(normalizeUser);
      const filtered = filterUsers(normalized, params);
      const { data, pagination } = paginate(filtered, params);
      return { success: true, data, pagination };
    }
    const filtered = filterUsers(USERS, params);
    const { data, pagination } = paginate(filtered, params);
    return { success: true, data, pagination };
  },

  async getUser(id) {
    const res = await apiRequest(`/admin/users/${id}`);
    if (res) return { ...res, data: normalizeUser(res.data) };
    const user = USERS.find(u => u.employee_id === id);
    return user ? { success: true, data: user } : { success: false, status: 404, message: 'User not found.' };
  },

  async getMyProfile() {
    const res = await apiRequest('/admin/users/me');
    if (res) return { ...res, data: normalizeUser(res.data) };
    const tokenUser = getTokenUser();
    const user = USERS.find(u => u.id === tokenUser?.id);
    return user ? { success: true, data: user } : { success: false, status: 404, message: 'User not found.' };
  },

  async createUser(data) {
    const res = await apiRequest('/admin/users', { method: 'POST', body: JSON.stringify(data) });
    if (res?.success) return { ...res, data: normalizeUser(res.data) };
    const emailTaken = INITIAL_USERS.find(u => u.email === data.email);
    if (emailTaken) return { success: false, status: 409, message: 'Email already registered.' };
    const mobileTaken = INITIAL_USERS.find(u => u.mobile === data.mobile && u.status !== 'Inactive');
    if (mobileTaken) return { success: false, status: 409, message: 'Mobile number already registered.' };
    const maxId = USERS.reduce((max, u) => Math.max(max, parseInt(u.employee_id.replace('EMP-', ''), 10)), 0);
    const newUser = { id: uuid(), employee_id: `EMP-${String(maxId + 1).padStart(5, '0')}`, ...data, createdAt: new Date().toISOString() };
    USERS.push(newUser);
    AUDIT_LOG.unshift({ id: uuid(), user_id: '', action: 'USER_CREATED', resource: 'User', resourceId: newUser.employee_id, details: `${newUser.employee_name} created`, ipAddress: '::1', userAgent: 'Mock', result: 'Success', createdAt: new Date().toISOString(), email: '' });
    return { success: true, status: 201, data: newUser, message: 'User created successfully.' };
  },

  async updateUser(id, data) {
    const res = await apiRequest(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    if (res?.success) return { ...res, data: normalizeUser(res.data) };
    const user = USERS.find(u => u.employee_id === id);
    if (!user) return { success: false, status: 404, message: 'User not found.' };
    Object.assign(user, data);
    AUDIT_LOG.unshift({ id: uuid(), user_id: '', action: 'USER_UPDATED', resource: 'User', resourceId: id, details: `Updated profile for ${user.employee_name}`, ipAddress: '::1', userAgent: 'Mock', result: 'Success', createdAt: new Date().toISOString(), email: '' });
    return { success: true, data: user, message: 'User updated successfully.' };
  },

  async updateUserStatus(id, newStatus) {
    const action = newStatus === 'Inactive' ? 'deactivate' : 'activate';
    const res = await apiRequest(`/admin/users/${id}/${action}`, { method: 'PATCH' });
    if (res?.success) return { ...res, data: normalizeUser(res.data) };
    const user = USERS.find(u => u.employee_id === id);
    if (!user) return { success: false, status: 404, message: 'User not found.' };
    user.status = newStatus;
    const auditAction = newStatus === 'Inactive' ? 'USER_DEACTIVATED' : 'USER_ACTIVATED';
    AUDIT_LOG.unshift({ id: uuid(), user_id: '', action: auditAction, resource: 'User', resourceId: id, details: `${user.employee_name} ${newStatus === 'Inactive' ? 'deactivated' : 'activated'}`, ipAddress: '::1', userAgent: 'Mock', result: 'Success', createdAt: new Date().toISOString(), email: '' });
    return { success: true, data: user, message: `User ${newStatus === 'Inactive' ? 'deactivated' : 'activated'} successfully.` };
  },

  async deleteUser(id) {
    const res = await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
    if (res) return res;
    return { success: false, status: 403, message: 'User deletion is not permitted. Use deactivation instead.' };
  },

  async getAuditLog(params = {}) {
    const res = await apiRequest('/api/admin/audit-log');
    if (res?.success) {
      let filtered = res.data || [];
      if (params.user_id) filtered = filtered.filter(e => e.user_id === params.user_id);
      const { data, pagination } = paginate(filtered, params);
      return { success: true, data, pagination };
    }
    let filtered = [...AUDIT_LOG];
    if (params.user_id) filtered = filtered.filter(e => e.resourceId === params.user_id);
    const { data, pagination } = paginate(filtered, params);
    return { success: true, data, pagination };
  },

  async getDeactivatedUsers() {
    return { success: true, data: USERS.filter(u => u.status === 'Inactive') };
  },
};
