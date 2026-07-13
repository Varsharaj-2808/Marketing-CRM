import { apiClient } from '../utils/apiClient';

function normalizeUser(u) {
  if (!u) return u;
  const out = { ...u };
  if (out.name !== undefined && out.employee_name === undefined) out.employee_name = out.name;
  if (out.employee_id === undefined && out.id !== undefined) out.employee_id = out.id;
  return out;
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

export const userService = {
  async getUsers(params = {}) {
    const apiParams = {};
    if (params.search) apiParams.search = params.search;
    if (params.role && params.role !== 'All') apiParams.role = params.role;
    if (params.status && params.status !== 'All') apiParams.status = params.status;
    if (params.department && params.department !== 'All') apiParams.department = params.department;
    if (params.page) apiParams.page = params.page;
    if (params.pageSize) apiParams.limit = params.pageSize;

    const hasApiParams = Object.keys(apiParams).length > 0;

    if (hasApiParams) {
      const res = await apiClient('/admin/users', { params: apiParams });
      const payload = res?.data || res || {};
      const list = Array.isArray(payload) ? payload : (payload.users && Array.isArray(payload.users) ? payload.users : (payload.data && Array.isArray(payload.data) ? payload.data : []));
      const normalized = list.map(normalizeUser);
      const pagination = payload.pagination 
        ? { ...payload.pagination, total: payload.pagination.totalRecords ?? payload.pagination.total ?? 0 }
        : { page: params.page || 1, total: res?.data?.pagination?.totalRecords ?? normalized.length, totalPages: res?.data?.pagination?.totalPages || 1 };
      return { success: true, data: normalized, pagination };
    }

    const res = await apiClient('/admin/users');
    const list = Array.isArray(res.data) ? res.data : (res.data.data && Array.isArray(res.data.data) ? res.data.data : []);
    const normalized = list.map(normalizeUser);
    const { data, pagination } = paginate(normalized, params);
    return { success: true, data, pagination };
  },

  async getUser(id) {
    const res = await apiClient(`/admin/users/${id}`);
    return { ...res, data: normalizeUser(res.data) };
  },

  async getMyProfile() {
    const res = await apiClient('/admin/users/me');
    return { ...res, data: normalizeUser(res.data) };
  },

  async createUser(data) {
    const payload = { ...data };
    if (payload.employee_name !== undefined && payload.name === undefined) {
      payload.name = payload.employee_name;
      delete payload.employee_name;
    }
    const res = await apiClient('/admin/users', { method: 'POST', body: payload });
    return { ...res, data: normalizeUser(res.data) };
  },

  async updateUser(id, data) {
    const payload = { ...data };
    if (payload.employee_name !== undefined && payload.name === undefined) {
      payload.name = payload.employee_name;
      delete payload.employee_name;
    }
    const res = await apiClient(`/admin/users/${id}`, { method: 'PUT', body: payload });
    return { ...res, data: normalizeUser(res.data) };
  },

  async updateUserStatus(id, newStatus) {
    const action = newStatus === 'Inactive' ? 'deactivate' : 'activate';
    const res = await apiClient(`/admin/users/${id}/${action}`, { method: 'PATCH' });
    return { ...res, data: normalizeUser(res.data) };
  },

  async deleteUser(id) {
    return await apiClient(`/admin/users/${id}`, { method: 'DELETE' });
  },

  async getAuditLog(params = {}) {
    const res = await apiClient('/admin/audit-log');
    let filtered = res.data || [];
    if (params.user_id) filtered = filtered.filter(e => e.user_id === params.user_id);
    const { data, pagination } = paginate(filtered, params);
    return { success: true, data, pagination };
  },

  async getDeactivatedUsers() {
    return await apiClient('/admin/users/deactivated');
  },
};
