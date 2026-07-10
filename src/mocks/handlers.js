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

function getFilteredLeads(leads, url) {
  const search = url.searchParams.get('search')?.toLowerCase() || '';
  const status = url.searchParams.get('status') || '';
  const stage = url.searchParams.get('stage') || '';
  const assignedTo = url.searchParams.get('assignedTo') || '';
  const category_id = url.searchParams.get('category_id') || '';
  const sub_category_id = url.searchParams.get('sub_category_id') || '';
  const quality = url.searchParams.get('quality') || url.searchParams.get('priority') || '';
  const dateFrom = url.searchParams.get('dateFrom') || url.searchParams.get('from') || '';
  const dateTo = url.searchParams.get('dateTo') || url.searchParams.get('to') || '';
  const sortBy = url.searchParams.get('sortBy') || url.searchParams.get('sortField') || 'createdAt';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';

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

  if (stage) {
    filtered = filtered.filter((l) => l.stage === stage);
  }

  if (assignedTo) {
    filtered = filtered.filter((l) => {
      const assignedId = typeof l.assignedTo === 'object' && l.assignedTo
        ? (l.assignedTo.employee_id || l.assignedTo.id)
        : l.assignedTo || '';
      return assignedId === assignedTo;
    });
  }

  if (category_id) {
    filtered = filtered.filter((l) => l.businessCategory === category_id || l.category === category_id);
  }

  if (sub_category_id) {
    filtered = filtered.filter((l) => l.businessSubCategory === sub_category_id || l.sub_category === sub_category_id);
  }

  if (quality) {
    filtered = filtered.filter((l) => l.priority === quality);
  }

  if (dateFrom) {
    const fromTime = new Date(dateFrom).getTime();
    filtered = filtered.filter((l) => l.createdAt && new Date(l.createdAt).getTime() >= fromTime);
  }

  if (dateTo) {
    const toTime = new Date(dateTo).getTime();
    filtered = filtered.filter((l) => l.createdAt && new Date(l.createdAt).getTime() <= toTime);
  }

  // Sort
  filtered.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (sortBy === 'estimatedValue') {
      aVal = a.estimatedValue || a.estimated_value;
      bVal = b.estimatedValue || b.estimated_value;
    }
    if (!aVal || !bVal) return 0;
    const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  return filtered;
}

function applyLeadFilters(leads, url) {
  const limit = parseInt(url.searchParams.get('limit')) || 25;
  const page = parseInt(url.searchParams.get('page')) || 1;
  const filtered = getFilteredLeads(leads, url);
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
  http.get(`${BASE}/admin/lead_sources`, () => {
    return HttpResponse.json({
      success: true,
      data: leadSourcesStore,
    });
  }),

  http.post(`${BASE}/admin/lead_sources`, async ({ request }) => {
    const body = await request.json();
    const { name } = body;
    if (!name?.trim()) {
      return HttpResponse.json({ success: false, message: 'Name is required.' }, { status: 400 });
    }
    const newSource = { id: `src-${String(nextLeadSrcId++).padStart(3, '0')}`, name: name.trim() };
    leadSourcesStore.push(newSource);
    return HttpResponse.json({ success: true, data: newSource, message: 'Lead source created successfully.' }, { status: 201 });
  }),

  http.put(`${BASE}/admin/lead_sources/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    const idx = leadSourcesStore.findIndex(s => s.id === id);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'Lead source not found.' }, { status: 404 });
    if (!body.name?.trim()) return HttpResponse.json({ success: false, message: 'Name is required.' }, { status: 400 });
    leadSourcesStore[idx] = { ...leadSourcesStore[idx], name: body.name.trim() };
    return HttpResponse.json({ success: true, data: leadSourcesStore[idx], message: 'Lead source updated successfully.' });
  }),

  http.delete(`${BASE}/admin/lead_sources/:id`, ({ params }) => {
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
    const newCategory = { id: `cat-${String(nextCategoryId++).padStart(3, '0')}`, name: name.trim(), isActive: true };
    categoriesStore.push(newCategory);
    subCategoriesStore[newCategory.id] = [];
    auditLogs.push({
      id: crypto.randomUUID(),
      user_id: getCurrentUserId() || 'system',
      action: 'CATEGORY_CREATED',
      resource: 'Category',
      resourceId: newCategory.id,
      details: `Category "${newCategory.name}" created`,
      ipAddress: '127.0.0.1',
      userAgent: 'Admin',
      result: 'Success',
      createdAt: new Date().toISOString(),
      email: 'admin@company.com',
    });
    return HttpResponse.json({ success: true, data: newCategory, message: 'Category created successfully.' }, { status: 201 });
  }),

  http.put(`${BASE}/admin/categories/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    const idx = categoriesStore.findIndex(c => c.id === id);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'Category not found.' }, { status: 404 });
    if (body.name !== undefined && !body.name?.trim()) return HttpResponse.json({ success: false, message: 'Name is required.' }, { status: 400 });
    const oldCat = { ...categoriesStore[idx] };
    categoriesStore[idx] = { ...categoriesStore[idx], ...body };
    if (body.name !== undefined) categoriesStore[idx].name = body.name.trim();
    if (body.isActive !== undefined) {
      auditLogs.push({
        id: crypto.randomUUID(),
        user_id: getCurrentUserId() || 'system',
        action: body.isActive ? 'CATEGORY_ACTIVATED' : 'CATEGORY_DEACTIVATED',
        resource: 'Category',
        resourceId: id,
        details: `Category "${categoriesStore[idx].name}" ${body.isActive ? 'activated' : 'deactivated'}`,
        ipAddress: '127.0.0.1',
        userAgent: 'Admin',
        result: 'Success',
        createdAt: new Date().toISOString(),
        email: 'admin@company.com',
      });
    } else {
      auditLogs.push({
        id: crypto.randomUUID(),
        user_id: getCurrentUserId() || 'system',
        action: 'CATEGORY_UPDATED',
        resource: 'Category',
        resourceId: id,
        details: `Category "${oldCat.name}" renamed to "${categoriesStore[idx].name}"`,
        ipAddress: '127.0.0.1',
        userAgent: 'Admin',
        result: 'Success',
        createdAt: new Date().toISOString(),
        email: 'admin@company.com',
      });
    }
    return HttpResponse.json({ success: true, data: categoriesStore[idx], message: 'Category updated successfully.' });
  }),

  http.delete(`${BASE}/admin/categories/:id`, ({ params }) => {
    const { id } = params;
    const idx = categoriesStore.findIndex(c => c.id === id);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'Category not found.' }, { status: 404 });
    const inUse = mockLeadsStore.some(lead => lead.businessCategory === id);
    if (inUse) {
      return HttpResponse.json({ success: false, message: 'Cannot delete. Category is in use by one or more leads.' }, { status: 409 });
    }
    const deleted = categoriesStore.splice(idx, 1)[0];
    delete subCategoriesStore[id];
    auditLogs.push({
      id: crypto.randomUUID(),
      user_id: getCurrentUserId() || 'system',
      action: 'CATEGORY_DELETED',
      resource: 'Category',
      resourceId: id,
      details: `Category "${deleted.name}" deleted`,
      ipAddress: '127.0.0.1',
      userAgent: 'Admin',
      result: 'Success',
      createdAt: new Date().toISOString(),
      email: 'admin@company.com',
    });
    return HttpResponse.json({ success: true, message: 'Category deleted successfully.' });
  }),

  http.get(`${BASE}/admin/categories/active`, () => {
    return HttpResponse.json({
      success: true,
      data: categoriesStore.filter(c => c.isActive !== false),
    });
  }),

  http.get(`${BASE}/admin/categories/:id/in_use`, ({ params }) => {
    const { id } = params;
    const leads = mockLeadsStore.filter(lead => lead.businessCategory === id);
    return HttpResponse.json({ inUse: leads.length > 0, leads });
  }),

  http.get(`${BASE}/admin/categories/:id/audit_log`, ({ params }) => {
    const { id } = params;
    const log = auditLogs.filter(e => e.resource === 'Category' && e.resourceId === id);
    return HttpResponse.json({ success: true, data: log });
  }),

  http.post(`${BASE}/admin/categories/:categoryId/sub_categories`, async ({ params, request }) => {
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
    const newSub = { id: `sub-${String(maxNum + 1).padStart(3, '0')}`, name: body.name.trim(), categoryId, isActive: true };
    subCategoriesStore[categoryId].push(newSub);
    auditLogs.push({
      id: crypto.randomUUID(),
      user_id: getCurrentUserId() || 'system',
      action: 'SUB_CATEGORY_CREATED',
      resource: 'SubCategory',
      resourceId: newSub.id,
      details: `Sub-category "${newSub.name}" created under ${categoryId}`,
      ipAddress: '127.0.0.1',
      userAgent: 'Admin',
      result: 'Success',
      createdAt: new Date().toISOString(),
      email: 'admin@company.com',
    });
    return HttpResponse.json({ success: true, data: newSub, message: 'Sub-category created successfully.' }, { status: 201 });
  }),

  http.put(`${BASE}/admin/categories/:categoryId/sub_categories/:subId`, async ({ params, request }) => {
    const { categoryId, subId } = params;
    const body = await request.json();
    const subs = subCategoriesStore[categoryId];
    if (!subs) return HttpResponse.json({ success: false, message: 'Category not found.' }, { status: 404 });
    const idx = subs.findIndex(s => s.id === subId);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'Sub-category not found.' }, { status: 404 });
    if (body.name !== undefined && !body.name?.trim()) return HttpResponse.json({ success: false, message: 'Name is required.' }, { status: 400 });
    const oldSub = { ...subs[idx] };
    subs[idx] = { ...subs[idx], ...body };
    if (body.name !== undefined) subs[idx].name = body.name.trim();
    if (body.isActive !== undefined) {
      auditLogs.push({
        id: crypto.randomUUID(),
        user_id: getCurrentUserId() || 'system',
        action: body.isActive ? 'SUB_CATEGORY_ACTIVATED' : 'SUB_CATEGORY_DEACTIVATED',
        resource: 'SubCategory',
        resourceId: subId,
        details: `Sub-category "${subs[idx].name}" ${body.isActive ? 'activated' : 'deactivated'}`,
        ipAddress: '127.0.0.1',
        userAgent: 'Admin',
        result: 'Success',
        createdAt: new Date().toISOString(),
        email: 'admin@company.com',
      });
    }
    return HttpResponse.json({ success: true, data: subs[idx], message: 'Sub-category updated successfully.' });
  }),

  http.delete(`${BASE}/admin/categories/:categoryId/sub_categories/:subId`, ({ params }) => {
    const { categoryId, subId } = params;
    const subs = subCategoriesStore[categoryId];
    if (!subs) return HttpResponse.json({ success: false, message: 'Category not found.' }, { status: 404 });
    const idx = subs.findIndex(s => s.id === subId);
    if (idx === -1) return HttpResponse.json({ success: false, message: 'Sub-category not found.' }, { status: 404 });
    const inUse = mockLeadsStore.some(lead => lead.businessSubCategory === subId);
    if (inUse) {
      return HttpResponse.json({ success: false, message: 'Cannot delete. Sub-category is in use by one or more leads.' }, { status: 409 });
    }
    const deleted = subs.splice(idx, 1)[0];
    auditLogs.push({
      id: crypto.randomUUID(),
      user_id: getCurrentUserId() || 'system',
      action: 'SUB_CATEGORY_DELETED',
      resource: 'SubCategory',
      resourceId: subId,
      details: `Sub-category "${deleted.name}" deleted from ${categoryId}`,
      ipAddress: '127.0.0.1',
      userAgent: 'Admin',
      result: 'Success',
      createdAt: new Date().toISOString(),
      email: 'admin@company.com',
    });
    return HttpResponse.json({ success: true, message: 'Sub-category deleted successfully.' });
  }),

  http.get(`${BASE}/admin/categories/:categoryId/sub_categories/active`, ({ params }) => {
    const { categoryId } = params;
    const subs = subCategoriesStore[categoryId] || [];
    return HttpResponse.json({
      success: true,
      data: subs.filter(s => s.isActive !== false),
    });
  }),

  http.get(`${BASE}/admin/categories/:categoryId/sub_categories/:subId/in-use`, ({ params }) => {
    const { categoryId, subId } = params;
    const leads = mockLeadsStore.filter(lead => lead.businessSubCategory === subId);
    return HttpResponse.json({ inUse: leads.length > 0, leads });
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

  http.get(`${BASE}/admin/audit_log`, () => {
    return HttpResponse.json({
      success: true,
      data: auditLogs,
      pagination: { page: 1, pageSize: 10, total: auditLogs.length, totalPages: 1 },
    });
  }),

  http.get(`${BASE}/admin/categories/:categoryId/sub_categories`, ({ params }) => {
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

  http.get(`${BASE}/marketing/leads/:leadId/lead_history`, ({ params }) => {
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

  http.post(`${BASE}/marketing/leads/check_duplicate`, async ({ request }) => {
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

  http.post(`${BASE}/auth/forgot_password`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      message: body?.email ? 'Password reset link sent to your email.' : 'Email is required.',
    });
  }),

  http.post(`${BASE}/auth/reset_password`, async () => {
    return HttpResponse.json({
      success: true,
      message: 'Password has been reset successfully.',
    });
  }),

  http.post(`${BASE}/auth/refresh_token`, async () => {
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
    const limit = parseInt(url.searchParams.get('limit')) || 25;
    const page = parseInt(url.searchParams.get('page')) || 1;
    const filtered = getFilteredLeads(mockLeadsStore, url);
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
    const limit = parseInt(url.searchParams.get('limit')) || 25;
    const page = parseInt(url.searchParams.get('page')) || 1;
    const filtered = getFilteredLeads(mockLeadsStore, url);
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

  http.post(`${BASE}/admin/leads/bulk_assign`, async ({ request }) => {
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
    return HttpResponse.json({
      success: true,
      status_code: 200,
      message: "Notifications fetched successfully",
      unread_count: 3,
      data: [
        {
          id: 'notif-001',
          type: 'lead_reminder',
          message: 'Reminder: Follow-up is due today for TechCorp Solutions.',
          reference_id: 'lead-00001',
          read: false,
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'notif-002',
          type: 'lead_reminder',
          message: 'Reminder: Follow-up is overdue for GrowthMark Agency.',
          reference_id: 'lead-00002',
          read: false,
          created_at: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 'notif-003',
          type: 'lead_reminder',
          message: 'Reminder: Follow-up is due today for MediCare Group.',
          reference_id: 'lead-00003',
          read: false,
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ]
    });
  }),

  http.patch(`${BASE}/notifications/:id/read`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      success: true,
      message: `Notification ${id} marked as read.`,
    });
  }),

  http.get(`${BASE}/lead_history/:leadId`, ({ params }) => {
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

  // Story-2 endpoints
  http.get(`${BASE}/admin/dashboard/kpis`, ({ request }) => {
    const url = new URL(request.url);
    const filtered = getFilteredLeads(mockLeadsStore, url);
    const total_leads = filtered.length;
    const won = filtered.filter(l => l.stage === 'Won').length;
    const lost = filtered.filter(l => l.stage === 'Lost').length;
    
    const from = url.searchParams.get('from');
    if (from) {
      const active_leads = filtered.filter(l => l.stage !== 'Won' && l.stage !== 'Lost').length;
      const total_estimated_value = filtered.reduce((sum, l) => sum + Number(l.estimatedValue || 0), 0).toFixed(2);
      return HttpResponse.json({
        success: true,
        data: {
          total_leads: String(total_leads),
          won_leads: String(won),
          lost_leads: String(lost),
          active_leads: String(active_leads),
          total_estimated_value
        }
      });
    }
    
    const newCount = filtered.filter(l => l.stage === 'New' || l.stage === 'New Lead').length;
    const contacted = filtered.filter(l => l.stage === 'Contacted').length;
    const qualified = filtered.filter(l => l.stage === 'Qualified').length;
    const meeting = filtered.filter(l => l.stage === 'Meeting Scheduled').length;
    const proposal = filtered.filter(l => l.stage === 'Proposal Sent').length;
    const negotiation = filtered.filter(l => l.stage === 'Negotiation').length;
    
    const totalClosed = won + lost;
    const conversion_rate = totalClosed > 0 ? `${((won / totalClosed) * 100).toFixed(2)}%` : '0.00%';
    
    return HttpResponse.json({
      success: true,
      data: {
        total_leads,
        new: newCount,
        contacted,
        qualified,
        meeting,
        proposal,
        negotiation,
        won,
        lost,
        conversion_rate,
        hot_leads: filtered.filter(l => l.priority === 'Hot' || l.priority === 'High').length,
        warm_leads: filtered.filter(l => l.priority === 'Warm' || l.priority === 'Medium').length,
        cold_leads: filtered.filter(l => l.priority === 'Cold' || l.priority === 'Low').length,
        category_id: url.searchParams.get('category_id') || null,
        sub_category_id: url.searchParams.get('sub_category_id') || null
      }
    });
  }),

  http.get(`${BASE}/marketing/dashboard`, ({ request }) => {
    const url = new URL(request.url);
    const filtered = getFilteredLeads(mockLeadsStore, url);
    
    const total = filtered.length;
    const won = filtered.filter(l => l.stage === 'Won').length;
    const lost = filtered.filter(l => l.stage === 'Lost').length;
    const active = total - (won + lost);
    const totalValue = filtered.reduce((sum, l) => sum + Number(l.estimatedValue || 0), 0).toFixed(2);
    
    const stages = {};
    filtered.forEach(l => {
      stages[l.stage] = (stages[l.stage] || 0) + 1;
    });
    const stage_breakdown = Object.entries(stages).map(([stage, count]) => ({ stage, count }));
    
    return HttpResponse.json({
      success: true,
      data: {
        stats: {
          total_leads: String(total),
          active_leads: String(active),
          won_leads: String(won),
          lost_leads: String(lost),
          total_estimated_value: totalValue
        },
        stage_breakdown,
        recent_leads: filtered.slice(0, 5).map(l => ({
          id: l.id,
          lead_id: l.leadId,
          company_name: l.companyName,
          contact_person: l.contactPerson,
          stage: l.stage,
          priority: l.priority,
          estimated_value: l.estimatedValue,
          created_at: l.createdAt
        })),
        unread_notifications: 3
      }
    });
  }),

  http.get(`${BASE}/admin/dashboard/category/won_rate`, ({ request }) => {
    const url = new URL(request.url);
    const category_id = url.searchParams.get('category_id');
    let leads = [...mockLeadsStore];
    if (category_id) {
      leads = leads.filter(l => l.businessCategory === category_id || l.category === category_id);
    }
    
    const groups = {};
    leads.forEach(l => {
      const catId = l.businessCategory || l.category || 'unknown';
      const catName = categoriesStore.find(c => c.id === catId)?.name || 'IT Services';
      if (!groups[catId]) {
        groups[catId] = { category_id: catId, category_name: catName, total_closed: 0, won: 0, lost: 0 };
      }
      if (l.stage === 'Won') {
        groups[catId].won++;
        groups[catId].total_closed++;
      } else if (l.stage === 'Lost') {
        groups[catId].lost++;
        groups[catId].total_closed++;
      }
    });
    
    const data = Object.values(groups).map(g => {
      const win_rate = g.total_closed > 0 ? `${((g.won / g.total_closed) * 100).toFixed(2)}%` : '0.00%';
      return { ...g, total_closed: String(g.total_closed), won: String(g.won), lost: String(g.lost), win_rate };
    });
    
    return HttpResponse.json({
      success: true,
      data
    });
  }),

  http.get(`${BASE}/admin/dashboard/category/lead_volume`, ({ request }) => {
    const url = new URL(request.url);
    const filtered = getFilteredLeads(mockLeadsStore, url);
    
    const groups = {};
    filtered.forEach(l => {
      const catId = l.businessCategory || l.category || 'unknown';
      const catName = categoriesStore.find(c => c.id === catId)?.name || 'IT Services';
      if (!groups[catId]) {
        groups[catId] = { category_id: catId, category_name: catName, lead_count: 0 };
      }
      groups[catId].lead_count++;
    });
    
    const data = Object.values(groups).map(g => ({
      ...g,
      lead_count: String(g.lead_count)
    }));
    
    return HttpResponse.json({
      success: true,
      data
    });
  }),

  http.get(`${BASE}/admin/leads/export`, () => {
    return HttpResponse.text('lead_id,company_name,contact_person,mobile_number,email,city,lead_source,category,sub_category,priority,stage,estimated_value\nLD-2026-86808,Acme Corp,John Smith,9999999901,john@acme.com,Mumbai,Website,IT Services,EHR Solutions,Hot,New Lead,50000.00');
  }),

  http.get(`${BASE}/marketing/leads/export`, () => {
    return HttpResponse.text('Binary file stream representation');
  }),

  http.get(`${BASE}/admin/reports/export`, () => {
    return HttpResponse.text('Binary report file stream');
  }),

  http.get(`${BASE}/marketing/followups/today`, ({ request }) => {
    const url = new URL(request.url);
    const assignedTo = url.searchParams.get('assigned_to');
    
    // Simulate auth token check - return 401 if missing Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json({
        success: false,
        status_code: 401,
        message: "Authentication required. Invalid or missing token",
        data: null
      }, { status: 401 });
    }
    
    // ME cannot access another user's today's follow-ups
    if (authHeader.includes('me-002-token') && assignedTo === 'me-001') {
      return HttpResponse.json({
        success: false,
        status_code: 403,
        message: "Access denied. Cannot fetch today's follow-ups for another user",
        data: null
      }, { status: 403 });
    }

    // Default response returning 3 leads
    return HttpResponse.json({
      success: true,
      status_code: 200,
      message: "Today's follow-ups retrieved successfully",
      data: [
        {
          id: "lead-uuid-101",
          company_name: "Hot Industries",
          contact_person: "Alice Cooper",
          lead_quality: "Hot",
          next_followup_date: "2026-07-06T10:00:00Z",
          stage: "Contacted"
        },
        {
          id: "lead-uuid-102",
          company_name: "Warm Dynamics",
          contact_person: "Bob Marley",
          lead_quality: "Warm",
          next_followup_date: "2026-07-06T14:30:00Z",
          stage: "Meeting Scheduled"
        },
        {
          id: "lead-uuid-103",
          company_name: "Cold Services",
          contact_person: "Charlie Puth",
          lead_quality: "Cold",
          next_followup_date: "2026-07-06T16:00:00Z",
          stage: "New Lead"
        }
      ]
    });
  }),

  http.get(`${BASE}/marketing/followups/overdue`, ({ request }) => {
    const url = new URL(request.url);
    const assignedTo = url.searchParams.get('assigned_to');
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json({
        success: false,
        status_code: 401,
        message: "Authentication required. Invalid or missing token",
        data: null
      }, { status: 401 });
    }
    
    // ME cannot access another user's overdue queue
    if (authHeader.includes('me-002-token') && assignedTo === 'me-001') {
      return HttpResponse.json({
        success: false,
        status_code: 403,
        message: "Access denied. Cannot fetch overdue follow-ups for another user",
        data: null
      }, { status: 403 });
    }

    return HttpResponse.json({
      success: true,
      status_code: 200,
      message: "Overdue follow-ups retrieved successfully",
      data: [
        {
          id: "lead-uuid-201",
          company_name: "Ancient Corp",
          contact_person: "Elvis Presley",
          next_followup_date: "2026-07-01T10:00:00Z",
          days_overdue: 5,
          stage: "New Lead",
          lead_quality: "Hot"
        },
        {
          id: "lead-uuid-202",
          company_name: "Recent Ltd",
          contact_person: "Madonna",
          next_followup_date: "2026-07-05T12:00:00Z",
          days_overdue: 1,
          stage: "Contacted",
          lead_quality: "Warm"
        }
      ]
    });
  }),

  http.get(`${BASE}/admin/dashboard/at_risk`, ({ request }) => {
    const url = new URL(request.url);
    const overdueDays = parseInt(url.searchParams.get('overdue_days')) || 3;
    
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.includes('me-001-token')) {
      // ME role is forbidden from calling Admin At-Risk escalation API
      return HttpResponse.json({
        success: false,
        status_code: 403,
        message: "Access denied. Admin role required.",
        data: null
      }, { status: 403 });
    }

    if (overdueDays >= 5) {
      return HttpResponse.json({
        success: true,
        status_code: 200,
        message: "At-risk leads fetched successfully",
        data: {
          total_at_risk: 1,
          breakdown: [
            { user_id: "me-001", at_risk_count: 1, oldest_overdue_days: 5 }
          ],
          leads: [
            {
              id: "lead-uuid-201",
              lead_id: "LD-2026-00085",
              company_name: "Ancient Corp",
              assigned_to: "John Doe",
              days_overdue: 5
            }
          ]
        }
      });
    }

    return HttpResponse.json({
      success: true,
      status_code: 200,
      message: "At-risk leads fetched successfully",
      data: {
        total_at_risk: 2,
        breakdown: [
          { user_id: "me-001", user_name: "John Doe", at_risk_count: 1, oldest_overdue_days: 5 },
          { user_id: "me-002", user_name: "Jane Smith", at_risk_count: 1, oldest_overdue_days: 3 }
        ],
        leads: [
          {
            id: "lead-uuid-201",
            lead_id: "LD-2026-00085",
            company_name: "Ancient Corp",
            assigned_to: "John Doe",
            days_overdue: 5
          },
          {
            id: "lead-uuid-203",
            lead_id: "LD-2026-00099",
            company_name: "Risk Inc",
            assigned_to: "Jane Smith",
            days_overdue: 3
          }
        ]
      }
    });
  }),

  http.post(`${BASE}/reminders/send-daily`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.includes('me-001-token')) {
      // ME role is forbidden from running daily reminders cron
      return HttpResponse.json({
        success: false,
        status_code: 403,
        message: "Access denied. Admin role required.",
        data: null
      }, { status: 403 });
    }

    const { date } = await request.json();
    if (date === 'not-a-date') {
      return HttpResponse.json({
        success: false,
        status_code: 400,
        message: "Validation failed",
        body: {
          error: "Invalid date format. Use YYYY-MM-DD"
        }
      }, { status: 400 });
    }

    return HttpResponse.json({
      success: true,
      status_code: 200,
      message: "Daily reminders processed successfully",
      reminders_sent: 2,
      breakdown: [
        { user_id: "me-001", leads_reminded: 1 },
        { user_id: "me-002", leads_reminded: 1 }
      ]
    });
  }),
];
