import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '../constants';
import {
  MOCK_CATEGORIES,
  MOCK_SUB_CATEGORIES,
  MOCK_USERS,
  MOCK_SERVICES,
  MOCK_LEAD_SOURCES,
  mockLeadsStore,
  createMockLead,
  resetMockLeads,
} from './mockData';

const BASE = API_BASE_URL;

let usersStore = [...MOCK_USERS];
let nextEmpNum = usersStore.length + 1;

let leadSourcesStore = [...MOCK_LEAD_SOURCES];
let nextLeadSrcId = leadSourcesStore.length + 1;

let servicesStore = [...MOCK_SERVICES];
let nextServiceId = servicesStore.length + 1;

let categoriesStore = [...MOCK_CATEGORIES];
let nextCategoryId = categoriesStore.length + 1;

let subCategoriesStore = JSON.parse(JSON.stringify(MOCK_SUB_CATEGORIES));

let auditLogs = [
  {
    id: '1a2b3c4d-5e6f-7890-abcd-ef0123456789',
    user_id: 'EMP-00001',
    action: 'USER_CREATED',
    resource: 'User',
    resourceId: 'EMP-00003',
    details: 'Sarah Manager created with role Marketing Executive',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    result: 'Success',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    email: 'admin@company.com',
  },
  {
    id: '4d5e6f78-9abc-def0-1234-56789abcdef0',
    user_id: 'EMP-00001',
    action: 'USER_UPDATED',
    resource: 'User',
    resourceId: 'EMP-00002',
    details: 'John Executive updated (role)',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    result: 'Success',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    email: 'admin@company.com',
  },
  {
    id: '01234567-89ab-cdef-0123-456789abcdef',
    user_id: 'EMP-00001',
    action: 'LOGIN_SUCCESS',
    resource: 'Auth',
    resourceId: '',
    details: 'Successful login',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    result: 'Success',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    email: 'admin@company.com',
  },
];

function findUser(id) {
  return usersStore.find(u => u.employee_id === id || u.id === id);
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('crm_user');
    if (!raw) return null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed;
  } catch {
    return null;
  }
}

function isCurrentUserAdmin() {
  const user = getCurrentUser();
  return user?.role === 'Admin';
}

function getCurrentUserId() {
  const user = getCurrentUser();
  return user?.id || user?._id || user?.employee_id || user?.employeeId || null;
}

function applyLeadFilters(leads, url) {
  const search = url.searchParams.get('search')?.toLowerCase() || '';
  const status = url.searchParams.get('status') || '';
  const assignedTo = url.searchParams.get('assignedTo') || '';
  const sortField = url.searchParams.get('sortField') || 'createdAt';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';
  const page = parseInt(url.searchParams.get('page')) || 1;
  const limit = parseInt(url.searchParams.get('limit')) || 25;

  let filtered = [...leads];

  if (search) {
    filtered = filtered.filter((l) =>
      l.companyName?.toLowerCase().includes(search) ||
      l.contactPerson?.toLowerCase().includes(search) ||
      l.mobileNumber?.includes(search) ||
      l.email?.toLowerCase().includes(search) ||
      l.leadId?.toLowerCase().includes(search)
    );
  }

  if (status) {
    filtered = filtered.filter((l) => l.status === status);
  }

  if (assignedTo) {
    filtered = filtered.filter((l) => l.assignedTo === assignedTo);
  }

  filtered.sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (!aVal || !bVal) return 0;
    const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return {
    body: { success: true, data, pagination: { page, limit, total, totalPages } },
    status: 200,
  };
}

export const handlers = [
  http.get(`${BASE}/admin/lead-sources`, () => {
    return HttpResponse.json({
      success: true,
      data: leadSourcesStore,
    });
  }),

  http.post(`${BASE}/admin/lead-sources`, async ({ request }) => {
    const body = await request.json();
    const { name } = body;
    if (!name?.trim()) {
      return HttpResponse.json({ success: false, message: 'Name is required.' }, { status: 400 });
    }
    const newSource = { id: `src-${String(nextLeadSrcId++).padStart(3, '0')}`, name: name.trim() };
    leadSourcesStore.push(newSource);
    return HttpResponse.json({ success: true, data: newSource, message: 'Lead source created successfully.' }, { status: 201 });
  }),

  http.put(`${BASE}/admin/lead-sources/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    const idx = leadSourcesStore.findIndex(s => s.id === id);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'Lead source not found.' }, { status: 404 });
    if (!body.name?.trim()) return HttpResponse.json({ success: false, message: 'Name is required.' }, { status: 400 });
    leadSourcesStore[idx] = { ...leadSourcesStore[idx], name: body.name.trim() };
    return HttpResponse.json({ success: true, data: leadSourcesStore[idx], message: 'Lead source updated successfully.' });
  }),

  http.delete(`${BASE}/admin/lead-sources/:id`, ({ params }) => {
    const { id } = params;
    const idx = leadSourcesStore.findIndex(s => s.id === id);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'Lead source not found.' }, { status: 404 });
    leadSourcesStore.splice(idx, 1);
    return HttpResponse.json({ success: true, message: 'Lead source deleted successfully.' });
  }),

  http.get(`${BASE}/admin/services`, () => {
    return HttpResponse.json({
      success: true,
      data: servicesStore,
    });
  }),

  http.post(`${BASE}/admin/services`, async ({ request }) => {
    const body = await request.json();
    const { name } = body;
    if (!name?.trim()) {
      return HttpResponse.json({ success: false, message: 'Name is required.' }, { status: 400 });
    }
    const newService = { id: `svc-${String(nextServiceId++).padStart(3, '0')}`, name: name.trim() };
    servicesStore.push(newService);
    return HttpResponse.json({ success: true, data: newService, message: 'Service created successfully.' }, { status: 201 });
  }),

  http.put(`${BASE}/admin/services/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    const idx = servicesStore.findIndex(s => s.id === id);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'Service not found.' }, { status: 404 });
    if (!body.name?.trim()) return HttpResponse.json({ success: false, message: 'Name is required.' }, { status: 400 });
    servicesStore[idx] = { ...servicesStore[idx], name: body.name.trim() };
    return HttpResponse.json({ success: true, data: servicesStore[idx], message: 'Service updated successfully.' });
  }),

  http.delete(`${BASE}/admin/services/:id`, ({ params }) => {
    const { id } = params;
    const idx = servicesStore.findIndex(s => s.id === id);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'Service not found.' }, { status: 404 });
    servicesStore.splice(idx, 1);
    return HttpResponse.json({ success: true, message: 'Service deleted successfully.' });
  }),

  http.get(`${BASE}/admin/categories`, () => {
    return HttpResponse.json({
      success: true,
      data: categoriesStore,
    });
  }),

  http.post(`${BASE}/admin/categories`, async ({ request }) => {
    const body = await request.json();
    const { name } = body;
    if (!name?.trim()) {
      return HttpResponse.json({ success: false, message: 'Name is required.' }, { status: 400 });
    }
    const newCategory = { id: `cat-${String(nextCategoryId++).padStart(3, '0')}`, name: name.trim() };
    categoriesStore.push(newCategory);
    subCategoriesStore[newCategory.id] = [];
    return HttpResponse.json({ success: true, data: newCategory, message: 'Category created successfully.' }, { status: 201 });
  }),

  http.put(`${BASE}/admin/categories/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    const idx = categoriesStore.findIndex(c => c.id === id);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'Category not found.' }, { status: 404 });
    if (!body.name?.trim()) return HttpResponse.json({ success: false, message: 'Name is required.' }, { status: 400 });
    categoriesStore[idx] = { ...categoriesStore[idx], name: body.name.trim() };
    return HttpResponse.json({ success: true, data: categoriesStore[idx], message: 'Category updated successfully.' });
  }),

  http.delete(`${BASE}/admin/categories/:id`, ({ params }) => {
    const { id } = params;
    const idx = categoriesStore.findIndex(c => c.id === id);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'Category not found.' }, { status: 404 });
    categoriesStore.splice(idx, 1);
    delete subCategoriesStore[id];
    return HttpResponse.json({ success: true, message: 'Category deleted successfully.' });
  }),

  http.post(`${BASE}/admin/categories/:categoryId/sub-categories`, async ({ params, request }) => {
    const { categoryId } = params;
    const body = await request.json();
    if (!categoriesStore.find(c => c.id === categoryId)) {
      return HttpResponse.json({ success: false, message: 'Category not found.' }, { status: 404 });
    }
    if (!body.name?.trim()) {
      return HttpResponse.json({ success: false, message: 'Sub-category name is required.' }, { status: 400 });
    }
    if (!subCategoriesStore[categoryId]) subCategoriesStore[categoryId] = [];
    const existingIds = subCategoriesStore[categoryId].map(s => s.id).filter(id => id.startsWith('sub-'));
    const maxNum = existingIds.reduce((max, id) => Math.max(max, parseInt(id.replace('sub-', '')) || 0), 0);
    const newSub = { id: `sub-${String(maxNum + 1).padStart(3, '0')}`, name: body.name.trim(), categoryId };
    subCategoriesStore[categoryId].push(newSub);
    return HttpResponse.json({ success: true, data: newSub, message: 'Sub-category created successfully.' }, { status: 201 });
  }),

  http.put(`${BASE}/admin/categories/:categoryId/sub-categories/:subId`, async ({ params, request }) => {
    const { categoryId, subId } = params;
    const body = await request.json();
    const subs = subCategoriesStore[categoryId];
    if (!subs) return HttpResponse.json({ success: false, message: 'Category not found.' }, { status: 404 });
    const idx = subs.findIndex(s => s.id === subId);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'Sub-category not found.' }, { status: 404 });
    if (!body.name?.trim()) return HttpResponse.json({ success: false, message: 'Name is required.' }, { status: 400 });
    subs[idx] = { ...subs[idx], name: body.name.trim() };
    return HttpResponse.json({ success: true, data: subs[idx], message: 'Sub-category updated successfully.' });
  }),

  http.delete(`${BASE}/admin/categories/:categoryId/sub-categories/:subId`, ({ params }) => {
    const { categoryId, subId } = params;
    const subs = subCategoriesStore[categoryId];
    if (!subs) return HttpResponse.json({ success: false, message: 'Category not found.' }, { status: 404 });
    const idx = subs.findIndex(s => s.id === subId);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'Sub-category not found.' }, { status: 404 });
    subs.splice(idx, 1);
    return HttpResponse.json({ success: true, message: 'Sub-category deleted successfully.' });
  }),

  http.get(`${BASE}/admin/users/deactivated`, () => {
    return HttpResponse.json({
      success: true,
      data: usersStore.filter(u => u.status === 'Inactive'),
    });
  }),

  http.get(`${BASE}/admin/users/me`, () => {
    return HttpResponse.json({
      success: true,
      data: usersStore[0] || MOCK_USERS[0],
    });
  }),

  http.get(`${BASE}/admin/users/:id`, ({ params }) => {
    const { id } = params;
    const user = findUser(id);
    if (!user) {
      return HttpResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }
    return HttpResponse.json({ success: true, data: user });
  }),

  http.post(`${BASE}/admin/users`, async ({ request }) => {
    const body = await request.json();
    const { employee_name, mobile, email, role, status } = body;
    if (!employee_name) return HttpResponse.json({ success: false, status: 400, message: 'Employee Name is required.' }, { status: 400 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return HttpResponse.json({ success: false, status: 400, message: 'Invalid email format.' }, { status: 400 });
    if (!['Admin', 'Marketing Executive'].includes(role)) return HttpResponse.json({ success: false, status: 400, message: 'Invalid role. Allowed values: Admin, Marketing Executive.' }, { status: 400 });
    if (usersStore.some(u => u.email === email)) return HttpResponse.json({ success: false, status: 409, message: 'Email already registered.' }, { status: 409 });
    if (usersStore.some(u => u.mobile === mobile)) return HttpResponse.json({ success: false, status: 409, message: 'Mobile number already registered.' }, { status: 409 });

    const employeeId = `EMP-${String(nextEmpNum++).padStart(5, '0')}`;
    const now = new Date().toISOString();
    const newUser = {
      id: employeeId,
      employee_id: employeeId,
      name: employee_name,
      email,
      mobile,
      role,
      status: status || 'Active',
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };
    usersStore.unshift(newUser);
    auditLogs.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      user_id: employeeId,
      action: 'USER_CREATED',
      resource: 'User',
      resourceId: employeeId,
      details: `${employee_name} created with role ${role}`,
      ipAddress: '127.0.0.1',
      userAgent: navigator.userAgent,
      result: 'Success',
      createdAt: new Date().toISOString(),
      email,
    });
    return HttpResponse.json({ success: true, status: 201, data: newUser, message: 'User created successfully.' }, { status: 201 });
  }),

  http.put(`${BASE}/admin/users/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    const idx = usersStore.findIndex(u => u.employee_id === id || u.id === id);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    usersStore[idx] = { ...usersStore[idx], ...body, updatedAt: new Date().toISOString() };
    auditLogs.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      user_id: id,
      action: 'USER_UPDATED',
      resource: 'User',
      resourceId: id,
      details: `${usersStore[idx].name} updated`,
      ipAddress: '127.0.0.1',
      userAgent: navigator.userAgent,
      result: 'Success',
      createdAt: new Date().toISOString(),
      email: usersStore[idx].email,
    });
    return HttpResponse.json({ success: true, data: usersStore[idx], message: 'User updated successfully.' });
  }),

  http.patch(`${BASE}/admin/users/:id/activate`, ({ params }) => {
    const { id } = params;
    const idx = usersStore.findIndex(u => u.employee_id === id || u.id === id);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    usersStore[idx].status = 'Active';
    auditLogs.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      user_id: id,
      action: 'USER_ACTIVATED',
      resource: 'User',
      resourceId: id,
      details: `${usersStore[idx].name} activated`,
      ipAddress: '127.0.0.1',
      userAgent: navigator.userAgent,
      result: 'Success',
      createdAt: new Date().toISOString(),
      email: usersStore[idx].email,
    });
    return HttpResponse.json({ success: true, data: usersStore[idx], message: 'User activated successfully.' });
  }),

  http.patch(`${BASE}/admin/users/:id/deactivate`, ({ params }) => {
    const { id } = params;
    const idx = usersStore.findIndex(u => u.employee_id === id || u.id === id);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    usersStore[idx].status = 'Inactive';
    auditLogs.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      user_id: id,
      action: 'USER_DEACTIVATED',
      resource: 'User',
      resourceId: id,
      details: `${usersStore[idx].name} deactivated`,
      ipAddress: '127.0.0.1',
      userAgent: navigator.userAgent,
      result: 'Success',
      createdAt: new Date().toISOString(),
      email: usersStore[idx].email,
    });
    return HttpResponse.json({ success: true, data: usersStore[idx], message: 'User deactivated successfully.' });
  }),

  http.get(`${BASE}/api/admin/audit-log`, () => {
    return HttpResponse.json({
      success: true,
      data: auditLogs,
      pagination: { page: 1, pageSize: 10, total: auditLogs.length, totalPages: 1 },
    });
  }),

  http.get(`${BASE}/admin/categories/:categoryId/sub-categories`, ({ params }) => {
    const { categoryId } = params;
    const subs = subCategoriesStore[categoryId] || [];
    return HttpResponse.json({
      success: true,
      data: subs,
    });
  }),

  http.get(`${BASE}/marketing/leads/check-mobile`, ({ request }) => {
    const url = new URL(request.url);
    const mobileNumber = url.searchParams.get('mobileNumber');
    const existing = mockLeadsStore.find((lead) => lead.mobileNumber === mobileNumber);
    if (existing) {
      return HttpResponse.json({ duplicate: true, exists: true, leadId: existing.leadId, data: { duplicate: true, leadId: existing.leadId, id: existing.id }, message: 'A lead with this mobile number already exists.' });
    }
    return HttpResponse.json({ duplicate: false, exists: false });
  }),

  http.get(`${BASE}/marketing/leads/:leadId/lead-history`, ({ params }) => {
    try {
      const leadId = params?.leadId;
      if (!leadId) {
        return HttpResponse.json({ success: false, message: 'Lead ID required.' }, { status: 400 });
      }
      const lead = mockLeadsStore.find((l) => l.id === leadId || l.leadId === leadId);
      if (!lead) {
        return HttpResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 });
      }
      if (!isCurrentUserAdmin()) {
        const userId = getCurrentUserId();
        const assigned = lead.assignedTo ?? lead.assigned_to ?? null;
        if (assigned !== userId) {
          return HttpResponse.json({ success: false, message: 'Access Denied' }, { status: 403 });
        }
      }
      return HttpResponse.json({
        success: true,
        data: lead.timeline || [],
      });
    } catch {
      return HttpResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
    }
  }),

  http.post(`${BASE}/marketing/leads/check-duplicate`, async ({ request }) => {
    const body = await request.json();
    const { mobileNumber } = body;

    const existing = mockLeadsStore.find(
      (lead) => lead.mobileNumber === mobileNumber
    );

    if (existing) {
      return HttpResponse.json({
        duplicate: true,
        exists: true,
        leadId: existing.leadId,
        data: {
          duplicate: true,
          leadId: existing.leadId,
          id: existing.id,
        },
        message: 'A lead with this mobile number already exists.',
      });
    }

    return HttpResponse.json({
      duplicate: false,
      exists: false,
    });
  }),

  http.post(`${BASE}/marketing/leads`, async ({ request }) => {
    const body = await request.json();
    const assignedUser = findUser(body.assignedTo);
    const createdByName = assignedUser?.name || 'Admin User';
    const newLead = createMockLead(body, createdByName);
    mockLeadsStore.unshift(newLead);

    return HttpResponse.json({
      success: true,
      data: {
        id: newLead.id,
        leadId: newLead.leadId,
        ...newLead,
      },
      message: 'Lead created successfully.',
    });
  }),

  http.get(`${BASE}/marketing/leads/:leadId`, ({ params }) => {
    const { leadId } = params;
    const lead = mockLeadsStore.find(
      (l) => l.id === leadId || l.leadId === leadId
    );

    if (!lead) {
      return HttpResponse.json(
        { success: false, message: 'Lead not found.' },
        { status: 404 }
      );
    }

    if (!isCurrentUserAdmin()) {
      const userId = getCurrentUserId();
      const assigned = lead.assignedTo ?? lead.assigned_to ?? null;
      if (assigned !== userId) {
        return HttpResponse.json(
          { success: false, message: 'Access Denied' },
          { status: 403 }
        );
      }
    }

    return HttpResponse.json({
      success: true,
      data: lead,
    });
  }),

  http.post(`${BASE}/auth/forgot-password`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      message: body?.email ? 'Password reset link sent to your email.' : 'Email is required.',
    });
  }),

  http.post(`${BASE}/auth/reset-password`, async () => {
    return HttpResponse.json({
      success: true,
      message: 'Password has been reset successfully.',
    });
  }),

  http.post(`${BASE}/auth/refresh-token`, async () => {
    return HttpResponse.json({
      success: true,
      data: { token: 'mock-jwt-token-' + Date.now(), refreshToken: 'mock-refresh-token' },
    });
  }),

  http.post(`${BASE}/auth/logout`, () => {
    return HttpResponse.json({ success: true, message: 'Logged out successfully.' });
  }),

  http.get(`${BASE}/admin/leads`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 25;
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const status = url.searchParams.get('status') || '';
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    let filtered = [...mockLeadsStore];

    if (search) {
      filtered = filtered.filter((l) =>
        l.companyName?.toLowerCase().includes(search) ||
        l.contactPerson?.toLowerCase().includes(search) ||
        l.mobileNumber?.includes(search) ||
        l.email?.toLowerCase().includes(search) ||
        l.leadId?.toLowerCase().includes(search)
      );
    }

    if (status) {
      filtered = filtered.filter((l) => l.status === status);
    }

    filtered.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (!aVal || !bVal) return 0;
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return HttpResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages },
    });
  }),

  http.get(`${BASE}/admin/leads/:leadId`, ({ params }) => {
    const { leadId } = params;
    const lead = mockLeadsStore.find(
      (l) => l.id === leadId || l.leadId === leadId
    );
    if (!lead) {
      return HttpResponse.json(
        { success: false, message: 'Lead not found.' },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      success: true,
      data: lead,
    });
  }),

  http.get(`${BASE}/marketing/leads`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 25;

    const total = mockLeadsStore.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const data = mockLeadsStore.slice(start, start + limit);

    return HttpResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages },
    });
  }),

  http.get(`${BASE}/admin/users`, ({ request }) => {
    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    let result = usersStore;
    if (role) {
      result = usersStore.filter((u) => u.role === role);
    }
    return HttpResponse.json({
      success: true,
      data: result,
    });
  }),

  http.patch(`${BASE}/leads/:leadId/assign`, async ({ params, request }) => {
    const { leadId } = params;
    const body = await request.json();
    const { assignedTo, reason } = body;

    const idx = mockLeadsStore.findIndex(
      (l) => l.id === leadId || l.leadId === leadId
    );
    if (idx === -1) {
      return HttpResponse.json(
        { success: false, message: 'Lead not found.' },
        { status: 404 }
      );
    }

    const targetUser = usersStore.find(
      (u) => u.employee_id === assignedTo || u.id === assignedTo
    );
    const targetName = targetUser?.name || assignedTo;
    const previousOwner = mockLeadsStore[idx].assignedTo
      ? (usersStore.find(
          (u) =>
            u.employee_id === mockLeadsStore[idx].assignedTo ||
            u.id === mockLeadsStore[idx].assignedTo
        )?.name || mockLeadsStore[idx].assignedTo)
      : null;

    const now = new Date().toISOString();
    const currentUser = getCurrentUser();
    const actorName = currentUser?.name || 'Admin User';

    mockLeadsStore[idx] = {
      ...mockLeadsStore[idx],
      assignedTo,
      assignedAt: now,
      updatedAt: now,
    };

    const timelineEntry = {
      action: previousOwner ? 'Lead Reassigned' : 'Lead Assigned',
      message: previousOwner ? 'Lead Reassigned' : 'Lead Assigned',
      description: previousOwner ? `Lead reassigned from ${previousOwner} to ${targetName}` : `Lead assigned to ${targetName}`,
      previousOwner: previousOwner || null,
      newOwner: targetName,
      reason: reason || '',
      user: actorName,
      createdBy: { id: currentUser?.id || 'EMP-00001', name: actorName },
      createdAt: now,
      timestamp: now,
    };

    if (!mockLeadsStore[idx].timeline) {
      mockLeadsStore[idx].timeline = [];
    }
    mockLeadsStore[idx].timeline.unshift(timelineEntry);

    return HttpResponse.json({
      success: true,
      message: previousOwner ? 'Lead reassigned successfully' : 'Lead assigned successfully',
    });
  }),

  http.post(`${BASE}/admin/leads/bulk-assign`, async ({ request }) => {
    const body = await request.json();
    const { leadIds, assignedTo, reason } = body;

    const targetUser = usersStore.find(
      (u) => u.employee_id === assignedTo || u.id === assignedTo
    );
    const targetName = targetUser?.name || assignedTo;
    const now = new Date().toISOString();
    const currentUser = getCurrentUser();
    const actorName = currentUser?.name || 'Admin User';

    let count = 0;
    leadIds.forEach((id) => {
      const idx = mockLeadsStore.findIndex((l) => l.id === id || l.leadId === id);
      if (idx !== -1) {
        count++;
        const previousOwner = mockLeadsStore[idx].assignedTo
          ? (usersStore.find(
              (u) =>
                u.employee_id === mockLeadsStore[idx].assignedTo ||
                u.id === mockLeadsStore[idx].assignedTo
            )?.name || mockLeadsStore[idx].assignedTo)
          : null;

        mockLeadsStore[idx] = {
          ...mockLeadsStore[idx],
          assignedTo,
          assignedAt: now,
          updatedAt: now,
        };

        const timelineEntry = {
          action: previousOwner ? 'Lead Reassigned' : 'Lead Assigned',
          message: previousOwner ? 'Lead Reassigned' : 'Lead Assigned',
          description: previousOwner
            ? `Lead reassigned from ${previousOwner} to ${targetName}`
            : `Lead assigned to ${targetName}`,
          previousOwner: previousOwner || null,
          newOwner: targetName,
          reason: reason || '',
          user: actorName,
          createdBy: { id: currentUser?.id || 'EMP-00001', name: actorName },
          createdAt: now,
          timestamp: now,
        };

        if (!mockLeadsStore[idx].timeline) {
          mockLeadsStore[idx].timeline = [];
        }
        mockLeadsStore[idx].timeline.unshift(timelineEntry);
      }
    });

    return HttpResponse.json({
      assigned: true,
      count,
    });
  }),

  http.get(`${BASE}/notifications`, () => {
    const now = new Date();
    const notifications = [
      {
        id: 'notif-001',
        type: 'assignment',
        message: 'Lead LD-2026-00001 has been assigned to John Executive',
        leadId: 'lead-001',
        read: false,
        role: 'Admin',
        createdAt: new Date(now - 3600000).toISOString(),
        timestamp: new Date(now - 3600000).toISOString(),
      },
      {
        id: 'notif-002',
        type: 'assignment',
        message: 'Lead LD-2026-00002 has been reassigned to Sarah Manager',
        leadId: 'lead-002',
        read: false,
        role: 'Admin',
        createdAt: new Date(now - 7200000).toISOString(),
        timestamp: new Date(now - 7200000).toISOString(),
      },
      {
        id: 'notif-003',
        type: 'assignment',
        message: 'Lead LD-2026-00003 has been assigned to John Executive',
        leadId: 'lead-003',
        read: true,
        role: 'Admin',
        createdAt: new Date(now - 86400000).toISOString(),
        timestamp: new Date(now - 86400000).toISOString(),
      },
    ];
    return HttpResponse.json({
      success: true,
      data: notifications,
    });
  }),

  http.patch(`${BASE}/notifications/:id/read`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      success: true,
      message: `Notification ${id} marked as read.`,
    });
  }),

  http.get(`${BASE}/lead-history/:leadId`, ({ params }) => {
    const { leadId } = params;
    const lead = mockLeadsStore.find(
      (l) => l.id === leadId || l.leadId === leadId
    );
    if (!lead) {
      return HttpResponse.json(
        { success: false, message: 'Lead not found.' },
        { status: 404 }
      );
    }
    const history = lead.timeline || [];
    if (history.length === 0 && lead.createdAt) {
      const userName =
        typeof lead.createdBy === 'object'
          ? lead.createdBy?.name
          : lead.createdBy || '';
      history.push({
        action: 'Lead Created',
        message: 'Lead Created',
        user: userName,
        createdBy: lead.createdBy,
        createdAt: lead.createdAt,
        timestamp: lead.createdAt,
      });
    }
    return HttpResponse.json({
      success: true,
      data: history,
    });
  }),

  http.delete(`${BASE}/admin/users/:id`, ({ params }) => {
    const { id } = params;
    if (id === 'EMP-00001') {
      return HttpResponse.json({ success: false, status: 403, message: 'User deletion is not permitted. Use deactivation instead.' }, { status: 403 });
    }
    const idx = usersStore.findIndex(u => u.employee_id === id || u.id === id);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    usersStore.splice(idx, 1);
    return HttpResponse.json({ success: true, message: 'User deleted successfully.' });
  }),

  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json();
    const { email, password } = body;

    if (email === 'admin@company.com' && password === 'Admin@123') {
      return HttpResponse.json({
        success: true,
        data: {
          token: 'mock-jwt-token-' + Date.now(),
          user: { id: 'EMP-00001', name: 'Admin User', email: 'admin@company.com', role: 'Admin', status: 'active' },
          refreshToken: 'mock-refresh-token',
        },
      });
    }

    if (email === 'executive@company.com' && password === 'Executive@123') {
      return HttpResponse.json({
        success: true,
        data: {
          token: 'mock-jwt-token-' + Date.now(),
          user: { id: 'EMP-00002', name: 'John Executive', email: 'executive@company.com', role: 'Marketing Executive', status: 'active' },
          refreshToken: 'mock-refresh-token',
        },
      });
    }

    return HttpResponse.json(
      { success: false, status: 401, message: 'Invalid email or password' },
      { status: 401 }
    );
  }),
];
