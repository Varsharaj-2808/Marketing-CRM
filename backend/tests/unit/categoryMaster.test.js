const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const {
  ADMIN_USER, MARKETING_USER,
} = require('./setup');

let mockQuery = jest.fn();
jest.mock('../../src/config/db', () => ({
  query: (...args) => mockQuery(...args),
  getClient: jest.fn(() => Promise.resolve({ query: (...args) => mockQuery(...args), release: jest.fn() })),
}));

jest.mock('../../src/utils/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(),
}));
jest.mock('../../src/utils/algoliaService', () => ({
  saveUser: jest.fn().mockResolvedValue(),
  deleteUser: jest.fn().mockResolvedValue(),
  searchUsers: jest.fn(),
  indexAllUsers: jest.fn().mockResolvedValue(),
  testConnection: jest.fn(),
}));

const createTestApp = () => {
  const app = express();
  app.use(require('helmet')());
  app.use(express.json());
  app.use('/api/auth', require('../../src/routes/auth'));
  app.use('/api/admin', require('../../src/routes/admin'));
  app.use('/api/marketing', require('../../src/routes/marketing'));
  app.use(require('../../src/middleware/errorHandler'));
  return app;
};

const adminToken = jwt.sign(
  { id: ADMIN_USER.id, email: ADMIN_USER.email, role: ADMIN_USER.role },
  process.env.JWT_SECRET, { expiresIn: '15m' }
);
const marketingToken = jwt.sign(
  { id: MARKETING_USER.id, email: MARKETING_USER.email, role: MARKETING_USER.role },
  process.env.JWT_SECRET, { expiresIn: '15m' }
);

const defaultQuery = (handlers) => {
  mockQuery.mockImplementation((sql, params) => {
    for (const [pattern, handler] of handlers) {
      if (sql.includes(pattern)) return handler(sql, params);
    }
    return { rows: [] };
  });
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CATEGORY_UUID = 'd3b07384-d113-4a00-a541-b8448fb8b801';
const SUBCATEGORY_UUID = 'e4c07384-d113-4a00-a541-b8448fb8b999';

const CATEGORY = {
  id: CATEGORY_UUID,
  category_name: 'Technology',
  status: 'Active',
  created_at: '2026-07-01T10:00:00.000Z',
  updated_at: '2026-07-01T10:00:00.000Z',
};

const CATEGORY2 = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  category_name: 'Digital Marketing',
  status: 'Active',
  created_at: '2026-07-01T10:00:00.000Z',
  updated_at: '2026-07-01T10:00:00.000Z',
};

const INACTIVE_CATEGORY = {
  id: 'a7b8c9d0-e1f2-3456-abcd-567890123456',
  category_name: 'E-commerce',
  status: 'Inactive',
  created_at: '2026-07-01T10:00:00.000Z',
  updated_at: '2026-07-01T10:00:00.000Z',
};

const SUBCATEGORY = {
  id: SUBCATEGORY_UUID,
  category_id: CATEGORY_UUID,
  sub_category_name: 'Software',
  status: 'Active',
  category_name: 'Technology',
  created_at: '2026-07-01T10:00:00.000Z',
  updated_at: '2026-07-01T10:00:00.000Z',
};

const CATEGORY3 = {
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  category_name: 'Consulting',
  status: 'Active',
  created_at: '2026-07-01T10:00:00.000Z',
  updated_at: '2026-07-01T10:00:00.000Z',
};

const ALL_CATEGORIES = [CATEGORY2, CATEGORY3, INACTIVE_CATEGORY];
const ACTIVE_CATEGORIES = [CATEGORY2, CATEGORY3];

// For paginated queries ΓÇö add subCategoryCount
const ALL_CATEGORIES_PAGINATED = ALL_CATEGORIES.map(c => ({ ...c, subCategoryCount: 0 }));
const ACTIVE_CATEGORIES_PAGINATED = ACTIVE_CATEGORIES.map(c => ({ ...c, subCategoryCount: 0 }));

const CATEGORY_DROPDOWN_ACTIVE = [
  { id: CATEGORY2.id, category_name: CATEGORY2.category_name },
  { id: CATEGORY3.id, category_name: CATEGORY3.category_name },
];

const SUBCATEGORY_DROPDOWN_ACTIVE = [
  { id: SUBCATEGORY_UUID, sub_category_name: 'Software' },
];

beforeEach(() => {
  mockQuery.mockReset();
});

// ============================================================
// API-1: POST /admin/categories
// ============================================================
describe('API-1: POST /admin/categories', () => {
  test('TEST-EP3-CAT-001: Positive ΓÇö Category Created ΓÇö 201', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories', () => ({ rows: ALL_CATEGORIES })],
      ['INSERT INTO business_categories', () => ({ rows: [CATEGORY] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_name: 'Technology' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Category created successfully');
    expect(res.body.data.category_name).toBe('Technology');
    expect(res.body.data.id).toMatch(UUID_PATTERN);
    expect(res.body.data.status).toBe('Active');
  });

  test('TEST-EP3-CAT-002: Failed ΓÇö Duplicate Category Name ΓÇö 409', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories', () => ({ rows: ALL_CATEGORIES })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_name: 'Digital Marketing' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('TEST-EP3-CAT-003: Failed ΓÇö Missing Mandatory Field ΓÇö 400', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/validation failed/i);
  });

  test('TEST-EP3-CAT-004: Failed ΓÇö Unauthorized (Non-Admin) ΓÇö 403', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ category_name: 'Retail' });
    expect(res.status).toBe(403);
  });
});

// ============================================================
// API-2: GET /admin/categories
// ============================================================
describe('API-2: GET /admin/categories', () => {
  test('TEST-EP3-CAT-005: Positive ΓÇö List All Categories ΓÇö 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)::int AS total FROM business_categories c', () => ({ rows: [{ total: 3 }] })],
      ['SELECT c.id, c.category_name, c.status,', () => ({ rows: ALL_CATEGORIES_PAGINATED })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCount).toBe(3);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.data.length).toBe(3);
    expect(res.body.data.data[0].category_name).toBeDefined();
    expect(res.body.data.data[0].subCategoryCount).toBeDefined();
  });

  test('TEST-EP3-CAT-006: Positive ΓÇö Search by Name ΓÇö 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['category_name ILIKE', () => ({ rows: [{ total: 1 }] })],
      ['SELECT c.id, c.category_name, c.status,', () => ({ rows: [ALL_CATEGORIES_PAGINATED[0]] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/categories?search=Digital')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCount).toBe(1);
  });

  test('TEST-EP3-CAT-007: Failed ΓÇö Unauthenticated ΓÇö 401', async () => {
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/categories');
    expect(res.status).toBe(401);
  });
});

// ============================================================
// API-3: GET /admin/categories/:id
// ============================================================
describe('API-3: GET /admin/categories/:id', () => {
  test('TEST-EP3-CAT-008: Positive ΓÇö Category Retrieved ΓÇö 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [CATEGORY] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get(`/api/admin/categories/${CATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.category_name).toBe('Technology');
  });

  test('TEST-EP3-CAT-009: Failed ΓÇö Category Not Found ΓÇö 404', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get(`/api/admin/categories/${CATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/category not found/i);
  });
});

// ============================================================
// API-4: PUT /admin/categories/:id
// ============================================================
describe('API-4: PUT /admin/categories/:id', () => {
  test('TEST-EP3-CAT-010: Positive ΓÇö Category Updated ΓÇö 200', async () => {
    const updatedCategory = { ...CATEGORY, category_name: 'IT & Technology Services' };
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [CATEGORY] })],
      ['SELECT * FROM business_categories', () => ({ rows: ALL_CATEGORIES })],
      ['UPDATE business_categories SET', () => ({ rows: [updatedCategory] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/admin/categories/${CATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_name: 'IT & Technology Services' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.category_name).toBe('IT & Technology Services');
  });

  test('TEST-EP3-CAT-011: Failed ΓÇö Category Not Found ΓÇö 404', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/admin/categories/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_name: 'Ghost Category' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/category not found/i);
  });

  test('TEST-EP3-CAT-012: Failed ΓÇö Duplicate Name on Update ΓÇö 409', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [CATEGORY] })],
      ['SELECT * FROM business_categories', () => ({ rows: ALL_CATEGORIES })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/admin/categories/${CATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_name: 'Digital Marketing' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });
});

// ============================================================
// API-5: PATCH /admin/categories/:id/status
// ============================================================
describe('API-5: PATCH /admin/categories/:id/status', () => {
  test('TEST-EP3-CAT-013: Positive ΓÇö Category Deactivated ΓÇö 200', async () => {
    const deactivatedCat = { ...CATEGORY, status: 'Inactive' };
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [CATEGORY] })],
      ['UPDATE business_categories SET', () => ({ rows: [deactivatedCat] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch(`/api/admin/categories/${CATEGORY_UUID}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Inactive' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Inactive');
    expect(res.body.message).toMatch(/deactivated/i);
  });

  test('TEST-EP3-CAT-014: Failed ΓÇö Category Not Found ΓÇö 404', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch(`/api/admin/categories/00000000-0000-0000-0000-000000000000/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Inactive' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('TEST-EP3-CAT-015: Failed ΓÇö Status Unchanged ΓÇö 400', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [CATEGORY] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch(`/api/admin/categories/${CATEGORY_UUID}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Active' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/category is already/i);
  });

  test('PATCH with invalid status value ΓÇö 400', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch(`/api/admin/categories/${CATEGORY_UUID}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================
// API-6: DELETE /admin/categories/:id
// ============================================================
describe('API-6: DELETE /admin/categories/:id', () => {
  test('TEST-EP3-CAT-016: Positive ΓÇö Category Deleted (Unused) ΓÇö 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [CATEGORY] })],
      ['COUNT(*)::int AS count FROM business_sub_categories WHERE category_id = $1', () => ({ rows: [{ count: 0 }] })],
      ['COUNT(*)::int AS count FROM leads WHERE category = $1', () => ({ rows: [{ count: 0 }] })],
      ['DELETE FROM business_categories WHERE id = $1', () => ({ rows: [CATEGORY] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .delete(`/api/admin/categories/${CATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(CATEGORY_UUID);
  });

  test('TEST-EP3-CAT-017: Failed ΓÇö Category In Use (Blocked) ΓÇö 409', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [CATEGORY] })],
      ['COUNT(*)::int AS count FROM business_sub_categories WHERE category_id = $1', () => ({ rows: [{ count: 0 }] })],
      ['COUNT(*)::int AS count FROM leads WHERE category = $1', () => ({ rows: [{ count: 3 }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .delete(`/api/admin/categories/${CATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Category is in use and cannot be deleted');
    expect(res.body.body.error).toMatch(/linked to 0 Sub-Categories \/ 3 active leads/i);
  });

  test('TEST-EP3-CAT-018: Failed ΓÇö Category Not Found ΓÇö 404', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .delete(`/api/admin/categories/${CATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================
// API-7: POST /admin/subcategories
// ============================================================
describe('API-7: POST /admin/subcategories', () => {
  test('TEST-EP3-CAT-019: Positive ΓÇö Sub-Category Created ΓÇö 201', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [CATEGORY] })],
      ['FROM business_sub_categories s LEFT JOIN', () => ({ rows: [] })],
      ['INSERT INTO business_sub_categories', () => ({ rows: [SUBCATEGORY] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/subcategories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_id: CATEGORY_UUID, sub_category_name: 'Software' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sub_category_name).toBe('Software');
    expect(res.body.data.category_id).toBe(CATEGORY_UUID);
  });

  test('TEST-EP3-CAT-020: Failed ΓÇö Parent Category Not Found ΓÇö 404', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/subcategories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_id: '00000000-0000-0000-0000-000000000999', sub_category_name: 'Hardware' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('TEST-EP3-CAT-021: Failed ΓÇö Duplicate Sub-Category Name Under Same Parent ΓÇö 409', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [CATEGORY] })],
      ['FROM business_sub_categories s LEFT JOIN', () => ({ rows: [{ id: 'existing-id', sub_category_name: 'Software' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/subcategories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_id: CATEGORY_UUID, sub_category_name: 'Software' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Duplicate Sub-Category name under same parent');
  });

  test('TEST-EP3-CAT-022: Failed ΓÇö Missing Mandatory Fields ΓÇö 400', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/subcategories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================
// API-8: GET /admin/subcategories
// ============================================================
describe('API-8: GET /admin/subcategories', () => {
  test('TEST-EP3-CAT-023: Positive ΓÇö List Filtered By Parent ΓÇö 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM business_sub_categories s LEFT JOIN', () => ({ rows: [SUBCATEGORY] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get(`/api/admin/subcategories?category_id=${CATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data.length).toBe(1);
  });

  test('TEST-EP3-CAT-024: Failed ΓÇö Unauthenticated ΓÇö 401', async () => {
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/subcategories');
    expect(res.status).toBe(401);
  });
});

// ============================================================
// API-9: GET /admin/subcategories/:id
// ============================================================
describe('API-9: GET /admin/subcategories/:id', () => {
  test('TEST-EP3-CAT-025: Positive ΓÇö Sub-Category Retrieved ΓÇö 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE s.id = $1', () => ({ rows: [SUBCATEGORY] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get(`/api/admin/subcategories/${SUBCATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sub_category_name).toBe('Software');
  });

  test('TEST-EP3-CAT-026: Failed ΓÇö Sub-Category Not Found ΓÇö 404', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE s.id = $1', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get(`/api/admin/subcategories/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/sub-category not found/i);
  });
});

// ============================================================
// API-10: PUT /admin/subcategories/:id
// ============================================================
describe('API-10: PUT /admin/subcategories/:id', () => {
  test('TEST-EP3-CAT-027: Positive ΓÇö Sub-Category Updated ΓÇö 200', async () => {
    const updatedSub = { ...SUBCATEGORY, sub_category_name: 'Web & E-commerce Development' };
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE s.id = $1', () => ({ rows: [SUBCATEGORY] })],
      ['FROM business_sub_categories s LEFT JOIN', () => ({ rows: [SUBCATEGORY] })],
      ['UPDATE business_sub_categories SET', () => ({ rows: [updatedSub] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/admin/subcategories/${SUBCATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sub_category_name: 'Web & E-commerce Development' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sub_category_name).toBe('Web & E-commerce Development');
  });

  test('TEST-EP3-CAT-028: Failed ΓÇö Sub-Category Not Found ΓÇö 404', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE s.id = $1', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/admin/subcategories/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sub_category_name: 'Ghost' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================
// API-11: PATCH /admin/subcategories/:id/status
// ============================================================
describe('API-11: PATCH /admin/subcategories/:id/status', () => {
  test('TEST-EP3-CAT-030: Positive ΓÇö Sub-Category Deactivated ΓÇö 200', async () => {
    const deactivatedSub = { ...SUBCATEGORY, status: 'Inactive' };
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE s.id = $1', () => ({ rows: [SUBCATEGORY] })],
      ['UPDATE business_sub_categories SET', () => ({ rows: [deactivatedSub] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch(`/api/admin/subcategories/${SUBCATEGORY_UUID}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Inactive' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Inactive');
  });

  test('TEST-EP3-CAT-031: Failed ΓÇö Sub-Category Not Found ΓÇö 404', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE s.id = $1', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch(`/api/admin/subcategories/00000000-0000-0000-0000-000000000000/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Inactive' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================
// API-12: DELETE /admin/subcategories/:id
// ============================================================
describe('API-12: DELETE /admin/subcategories/:id', () => {
  test('TEST-EP3-CAT-032: Positive ΓÇö Sub-Category Deleted (Unused) ΓÇö 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE s.id = $1', () => ({ rows: [SUBCATEGORY] })],
      ['COUNT(*)::int AS count FROM leads WHERE sub_category = $1', () => ({ rows: [{ count: 0 }] })],
      ['DELETE FROM business_sub_categories WHERE id = $1', () => ({ rows: [SUBCATEGORY] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .delete(`/api/admin/subcategories/${SUBCATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(SUBCATEGORY_UUID);
  });

  test('TEST-EP3-CAT-033: Failed ΓÇö Sub-Category In Use (Blocked) ΓÇö 409', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE s.id = $1', () => ({ rows: [SUBCATEGORY] })],
      ['COUNT(*)::int AS count FROM leads WHERE sub_category = $1', () => ({ rows: [{ count: 2 }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .delete(`/api/admin/subcategories/${SUBCATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Sub-Category is in use and cannot be deleted');
    expect(res.body.body.error).toMatch(/linked to active leads/i);
  });

  test('TEST-EP3-CAT-034: Failed ΓÇö Sub-Category Not Found ΓÇö 404', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE s.id = $1', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .delete(`/api/admin/subcategories/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================
// API-13: GET /categories/active
// ============================================================
describe('API-13: GET /categories/active', () => {
  test('TEST-EP3-CAT-035: Positive ΓÇö Active Categories for Dropdown ΓÇö 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT id, category_name FROM business_categories WHERE status = $1', () => ({ rows: CATEGORY_DROPDOWN_ACTIVE })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/categories/active')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data.length).toBe(2);
    expect(res.body.data.count).toBe(2);
    expect(res.body.data.data[0].category_name).toBeDefined();
  });
});

// ============================================================
// API-14: GET /subcategories/active
// ============================================================
describe('API-14: GET /subcategories/active', () => {
  test('TEST-EP3-CAT-036: Positive ΓÇö Active Sub-Categories for Selected Category ΓÇö 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [CATEGORY] })],
      ['category_id = $1 AND status = $2', () => ({ rows: SUBCATEGORY_DROPDOWN_ACTIVE })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get(`/api/admin/subcategories/active?category_id=${CATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data.length).toBe(1);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.category_id).toBe(CATEGORY_UUID);
  });

  test('TEST-EP3-CAT-037: Positive ΓÇö No Sub-Categories for Category ΓÇö 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [CATEGORY2] })],
      ['category_id = $1 AND status = $2', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get(`/api/admin/subcategories/active?category_id=${CATEGORY2.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toEqual([]);
    expect(res.body.data.count).toBe(0);
  });

  test('TEST-EP3-CAT-038: Failed ΓÇö Missing category_id ΓÇö 400', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/subcategories/active')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/validation failed/i);
  });
});

// ============================================================
// API-15: POST /admin/categories/seed-defaults
// ============================================================
describe('API-15: POST /admin/categories/seed-defaults', () => {
  test('TEST-EP3-CAT-039: Positive ΓÇö Default Taxonomy Seeded ΓÇö 200', async () => {
    let insertCount = 0;
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories', () => ({ rows: [] })],
      ['INSERT INTO business_categories', () => {
        insertCount++;
        return { rows: [{ id: `cat-${insertCount}`, category_name: 'Test', status: 'Active' }] };
      }],
      ['INSERT INTO business_sub_categories', () => ({ rows: [{ id: 'sub-1' }] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/categories/seed-defaults')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.categoriesCreated).toBe(8);
    expect(res.body.data.subCategoriesCreated).toBe(34);
  });

  test('TEST-EP3-CAT-040: Failed ΓÇö Already Seeded ΓÇö 409', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories', () => ({ rows: ALL_CATEGORIES })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/categories/seed-defaults')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already seeded/i);
  });
});

// ============================================================
// Audit Log Integration (legacy)
// ============================================================
describe('Audit Log Integration', () => {
  test('Audit Log on Category Create', async () => {
    let auditInserted = false;
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories', () => ({ rows: ALL_CATEGORIES })],
      ['INSERT INTO business_categories', () => ({ rows: [CATEGORY] })],
      ['INSERT INTO audit_logs', () => {
        auditInserted = true;
        return { rows: [] };
      }],
    ]);
    const app = createTestApp();
    await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_name: 'Technology' });
    expect(auditInserted).toBe(true);
  });

  test('Audit Log on Category Update', async () => {
    let auditInserted = false;
    const updatedCat = { ...CATEGORY, category_name: 'Info Tech' };
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [CATEGORY] })],
      ['SELECT * FROM business_categories', () => ({ rows: ALL_CATEGORIES })],
      ['UPDATE business_categories SET', () => ({ rows: [updatedCat] })],
      ['INSERT INTO audit_logs', () => {
        auditInserted = true;
        return { rows: [] };
      }],
    ]);
    const app = createTestApp();
    await request(app)
      .put(`/api/admin/categories/${CATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category_name: 'Info Tech' });
    expect(auditInserted).toBe(true);
  });

  test('Audit Log on Status Change', async () => {
    let auditInserted = false;
    const deactivatedCat = { ...CATEGORY, status: 'Inactive' };
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT * FROM business_categories WHERE id = $1', () => ({ rows: [CATEGORY] })],
      ['UPDATE business_categories SET', () => ({ rows: [deactivatedCat] })],
      ['INSERT INTO audit_logs', () => {
        auditInserted = true;
        return { rows: [] };
      }],
    ]);
    const app = createTestApp();
    await request(app)
      .patch(`/api/admin/categories/${CATEGORY_UUID}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Inactive' });
    expect(auditInserted).toBe(true);
  });
});
