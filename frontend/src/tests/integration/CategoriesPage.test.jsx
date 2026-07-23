import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import CategoriesPage from '../../pages/admin/CategoriesPage';

function mockRes(data, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(data),
  });
}

const adminUser = {
  id: 'ADM-001',
  employee_id: 'ADM-001',
  name: 'Admin User',
  email: 'admin@company.com',
  role: 'Admin',
  status: 'active',
};

const MOCK_CATEGORIES = [
  { id: 'cat-001', name: 'IT Services', isActive: true },
  { id: 'cat-002', name: 'Digital Marketing', isActive: true },
  { id: 'cat-003', name: 'Consulting', isActive: true },
  { id: 'cat-004', name: 'Real Estate', isActive: false },
];

const MOCK_SUBS = {
  'cat-001': [
    { id: 'sub-001', name: 'Web Development', isActive: true, category_id: 'cat-001' },
    { id: 'sub-002', name: 'Mobile App Development', isActive: true, category_id: 'cat-001' },
  ],
  'cat-002': [
    { id: 'sub-005', name: 'SEO Services', isActive: true, category_id: 'cat-002' },
    { id: 'sub-006', name: 'Social Media Management', isActive: false, category_id: 'cat-002' },
  ],
  'cat-003': [],
  'cat-004': [{ id: 'sub-009', name: 'Business Strategy', isActive: true, category_id: 'cat-004' }],
};

function findExpandButton(categoryName) {
  const rows = screen.getAllByRole('row');
  const catRow = rows.find(r => r.textContent.includes(categoryName));
  if (!catRow) return null;
  return Array.from(catRow.querySelectorAll('button'))
    .find(btn => btn.querySelector('[class*="material-symbols"]'));
}

function setupMockFetch() {
  global.fetch = vi.fn().mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';

    if (url.includes('/admin/categories/') && url.includes('/audit-log')) {
      return mockRes({
        success: true,
        data: [
          { id: 'log-1', action: 'CATEGORY_CREATED', entityId: 'cat-001', details: 'Category "IT Services" created', createdAt: '2026-06-15T10:00:00.000Z' },
        ],
      });
    }

    if (url.includes('/admin/categories/') && url.includes('/in-use')) {
      const id = url.match(/\/admin\/categories\/([^/]+)\/in-use/)?.[1];
      if (id === 'cat-001') {
        return mockRes({ inUse: true, leads: [{ id: 'lead-001', companyName: 'Acme Corp' }] });
      }
      return mockRes({ inUse: false, leads: [] });
    }

    if (url.includes('/admin/categories/') && url.includes('/sub-categories/') && url.includes('/in-use')) {
      const subId = url.match(/\/sub-categories\/([^/]+)\/in-use/)?.[1];
      if (subId === 'sub-001') {
        return mockRes({ inUse: true, leads: [{ id: 'lead-001', companyName: 'Acme Corp' }] });
      }
      return mockRes({ inUse: false, leads: [] });
    }

    if (url.includes('/admin/subcategories') && !url.includes('/admin/categories/')) {
      const categoryId = url.match(/category_id=([^&]+)/)?.[1];
      return mockRes({ success: true, data: MOCK_SUBS[categoryId] || [] });
    }

    if (url.includes('/admin/categories/') && url.includes('/sub-categories/active')) {
      const categoryId = url.match(/\/admin\/categories\/([^/]+)\/sub-categories/)?.[1];
      const subs = MOCK_SUBS[categoryId] || [];
      return mockRes({ success: true, data: subs.filter(s => s.isActive !== false) });
    }

    if (url.includes('/admin/categories/') && url.includes('/sub-categories')) {
      const categoryId = url.match(/\/admin\/categories\/([^/]+)\/sub-categories/)?.[1];
      return mockRes({ success: true, data: MOCK_SUBS[categoryId] || [] });
    }

    if (url.includes('/admin/categories') && method === 'DELETE') {
      const id = url.match(/\/admin\/categories\/([^/]+)$/)?.[1];
      if (id === 'cat-001') {
        return mockRes({ success: false, message: 'Cannot delete. Category is in use by one or more leads.' }, 409);
      }
      return mockRes({ success: true, message: 'Category deleted successfully.' });
    }

    if (url.includes('/admin/categories') && method === 'POST') {
      const body = JSON.parse(init?.body || '{}');
      return mockRes({ success: true, data: { id: 'cat-006', name: body.name || 'New Category', isActive: true }, message: 'Category created successfully.' }, 201);
    }

    if (url.includes('/admin/categories') && method === 'PUT') {
      const body = JSON.parse(init?.body || '{}');
      if (body.isActive !== undefined) {
        const msg = body.isActive ? 'Category activated.' : 'Category deactivated.';
        return mockRes({ success: true, data: { id: url.split('/').pop(), ...body }, message: msg });
      }
      return mockRes({ success: true, data: { id: url.split('/').pop(), ...body }, message: 'Category updated successfully.' });
    }

    if (url.includes('/admin/categories') && method === 'GET') {
      if (url.includes('/admin/categories/active')) {
        return mockRes({ success: true, data: MOCK_CATEGORIES.filter(c => c.isActive !== false) });
      }
      return mockRes({ success: true, data: MOCK_CATEGORIES });
    }

    return mockRes({ success: false, message: 'Not found' }, 404);
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/categories']}>
      <AuthProvider>
        <CategoriesPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
  localStorage.setItem('crm_user', JSON.stringify(adminUser));
  setupMockFetch();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CategoriesPage — TASK-3.1.1 (Category Master Screen)', () => {
  it('FE-TC-3.1.1-01: View Category Master screen — displays list of categories', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('IT Services')).toBeInTheDocument();
    });
    expect(screen.getByText('Digital Marketing')).toBeInTheDocument();
    expect(screen.getByText('Consulting')).toBeInTheDocument();
    expect(screen.getByText('Real Estate')).toBeInTheDocument();
    const headings = screen.getAllByText('Categories');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('FE-TC-3.1.1-02: Create new Category — opens form, saves, and shows in list', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('IT Services')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Category'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter category name')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter category name');
    fireEvent.change(nameInput, { target: { value: 'New Category' } });

    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('Category created successfully.')).toBeInTheDocument();
    });
  });

  it('FE-TC-3.1.1-03: Edit existing Category — opens edit form, updates, and reflects changes', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('IT Services')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue('IT Services')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('IT Services');
    fireEvent.change(nameInput, { target: { value: 'Updated Category' } });

    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => {
      expect(screen.getByText('Category updated successfully.')).toBeInTheDocument();
    });
  });
});

describe('CategoriesPage — TASK-3.1.1-02 (Sub-Category Master Screen)', () => {
  it('FE-TC-3.1.1-04: View Sub-Category Master screen — sub-categories expandable with parent links', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('IT Services')).toBeInTheDocument();
    });

    const expandBtn = findExpandButton('IT Services');
    expect(expandBtn).toBeTruthy();
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByText('Web Development')).toBeInTheDocument();
    });
    expect(screen.getByText('Mobile App Development')).toBeInTheDocument();
  });

  it('FE-TC-3.1.1-05: Create new Sub-Category — opens form, selects parent, saves', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Digital Marketing')).toBeInTheDocument();
    });

    const addSubButtons = screen.getAllByText('Add Sub');
    const dmBtn = addSubButtons.find(b => b.closest('tr')?.textContent?.includes('Digital Marketing'));
    expect(dmBtn).toBeTruthy();
    fireEvent.click(dmBtn);

    await waitFor(() => {
      expect(screen.getByText('Add Sub-Category')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter sub-category name');
    fireEvent.change(nameInput, { target: { value: 'New Sub Cat' } });

    global.fetch = vi.fn().mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';

      if (url.includes('/admin/categories/') && url.includes('/sub-categories') && method === 'POST') {
        return mockRes({ success: true, data: { id: 'sub-020', name: 'New Sub Cat', isActive: true }, message: 'Sub-category created successfully.' }, 201);
      }

      if (url.includes('/admin/subcategories') && !url.includes('/admin/categories/') && method === 'GET') {
        const categoryId = url.match(/category_id=([^&]+)/)?.[1];
        return mockRes({ success: true, data: MOCK_SUBS[categoryId] || [] });
      }

      if (url.includes('/admin/categories/') && url.includes('/sub-categories') && method === 'GET') {
        const categoryId = url.match(/\/admin\/categories\/([^/]+)\/sub-categories/)?.[1];
        return mockRes({ success: true, data: MOCK_SUBS[categoryId] || [] });
      }

      if (url.includes('/admin/categories') && method === 'GET') {
        return mockRes({ success: true, data: MOCK_CATEGORIES });
      }

      return mockRes({ success: false, message: 'Not found' }, 404);
    });

    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('Sub-category created successfully.')).toBeInTheDocument();
    });
  });

  it('FE-TC-3.1.1-06: Edit existing Sub-Category — opens form, modifies, and saves', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('IT Services')).toBeInTheDocument();
    });

    const expandBtn = findExpandButton('IT Services');
    expect(expandBtn).toBeTruthy();
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByText('Web Development')).toBeInTheDocument();
    });

    const editSubButtons = screen.getAllByText('Edit');
    const editSubBtn = editSubButtons.find(b => {
      const row = b.closest('tr');
      return row?.textContent?.includes('Web Development') && !row?.textContent?.includes('IT Services');
    });
    expect(editSubBtn).toBeTruthy();
    fireEvent.click(editSubBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Web Development')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Web Development');
    fireEvent.change(nameInput, { target: { value: 'Updated Web Dev' } });

    global.fetch = vi.fn().mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';

      if (url.includes('/admin/categories/') && url.includes('/sub-categories') && method === 'PUT') {
        return mockRes({ success: true, data: { id: 'sub-001', name: 'Updated Web Dev', isActive: true }, message: 'Sub-category updated successfully.' });
      }

      if (url.includes('/admin/subcategories') && !url.includes('/admin/categories/') && method === 'GET') {
        const categoryId = url.match(/category_id=([^&]+)/)?.[1];
        return mockRes({ success: true, data: MOCK_SUBS[categoryId] || [] });
      }

      if (url.includes('/admin/categories/') && url.includes('/sub-categories') && method === 'GET') {
        const categoryId = url.match(/\/admin\/categories\/([^/]+)\/sub-categories/)?.[1];
        return mockRes({ success: true, data: MOCK_SUBS[categoryId] || [] });
      }

      if (url.includes('/admin/categories') && method === 'GET') {
        return mockRes({ success: true, data: MOCK_CATEGORIES });
      }

      return mockRes({ success: false, message: 'Not found' }, 404);
    });

    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => {
      expect(screen.getByText('Sub-category updated successfully.')).toBeInTheDocument();
    });
  });
});

describe('CategoriesPage — TASK-3.1.1-03 (Cascading Dropdown)', () => {
  it('FE-TC-3.1.1-07: CategoryDropdown shows only active categories', async () => {
    const CategoryDropdown = (await import('../../components/leads/CategoryDropdown')).default;
    render(
      <CategoryDropdown
        value=""
        onChange={() => {}}
        error=""
        categories={MOCK_CATEGORIES}
        loading={false}
      />
    );

    const select = screen.getByRole('combobox');
    const options = Array.from(select.options).map(o => o.value);
    expect(options).not.toContain('cat-004');
    expect(options).toContain('cat-001');
    expect(options).toContain('cat-002');
    expect(options).toContain('cat-003');
  });

  it('FE-TC-3.1.1-08: Sub-Category dropdown filters by parent', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('IT Services')).toBeInTheDocument();
    });

    const expandBtn = findExpandButton('IT Services');
    expect(expandBtn).toBeTruthy();
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByText('Web Development')).toBeInTheDocument();
    });

    expect(screen.getByText('Mobile App Development')).toBeInTheDocument();
    expect(screen.queryByText('SEO Services')).not.toBeInTheDocument();
  });

  it('FE-TC-3.1.1-09: Changing category clears sub-category', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('IT Services')).toBeInTheDocument();
    });

    const expandBtn = findExpandButton('IT Services');
    expect(expandBtn).toBeTruthy();
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByText('Web Development')).toBeInTheDocument();
    });

    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.queryByText('Web Development')).not.toBeInTheDocument();
    });
  });
});

describe('CategoriesPage — TASK-3.1.1-04 (Seed Initial Taxonomy)', () => {
  it('FE-TC-3.1.1-10: Default taxonomy is visible in data grids', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('IT Services')).toBeInTheDocument();
    });

    expect(screen.getByText('Digital Marketing')).toBeInTheDocument();
    expect(screen.getByText('Consulting')).toBeInTheDocument();
    expect(screen.getByText('Real Estate')).toBeInTheDocument();
  });
});

describe('CategoriesPage — TASK-3.1.1-05 (Delete/Deactivate)', () => {
  it('FE-TC-3.1.1-11: Delete item IN USE shows error modal', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('IT Services')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Cannot Delete')).toBeInTheDocument();
    });

    expect(screen.getByText(/in use/i)).toBeInTheDocument();
  });

  it('FE-TC-3.1.1-12: Delete item NOT IN USE shows confirmation then removes', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Consulting')).toBeInTheDocument();
    });

    const consultingRow = screen.getByText('Consulting').closest('tr');
    const deleteBtn = Array.from(consultingRow?.querySelectorAll('button') || []).find(b => b.textContent === 'Delete');
    expect(deleteBtn).toBeTruthy();
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText('Delete Category')).toBeInTheDocument();
    });
  });

  it('FE-TC-3.1.1-13: Deactivate an item toggles status', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('IT Services')).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByText('Deactivate');
    fireEvent.click(deactivateButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Category deactivated.')).toBeInTheDocument();
    });
  });

  it('FE-TC-3.1.1-14: Inactive items hidden from dropdowns — CategoryDropdown filters inactive', async () => {
    const CategoryDropdown = (await import('../../components/leads/CategoryDropdown')).default;
    render(
      <CategoryDropdown
        value=""
        onChange={() => {}}
        error=""
        categories={MOCK_CATEGORIES}
        loading={false}
      />
    );

    const select = screen.getByRole('combobox');
    const options = Array.from(select.options).map(o => o.value);
    expect(options).not.toContain('cat-004');
  });

  it('FE-TC-3.1.1-16: Reject purely numeric Category name', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('IT Services')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Category'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter category name')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter category name');
    fireEvent.change(nameInput, { target: { value: '1234567' } });

    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('Category name cannot be purely numeric')).toBeInTheDocument();
    });
  });

  it('FE-TC-3.1.1-17: Reject purely numeric Sub-Category name', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Digital Marketing')).toBeInTheDocument();
    });

    const addSubButtons = screen.getAllByText('Add Sub');
    const dmBtn = addSubButtons.find(b => b.closest('tr')?.textContent?.includes('Digital Marketing'));
    expect(dmBtn).toBeTruthy();
    fireEvent.click(dmBtn);

    await waitFor(() => {
      expect(screen.getByText('Add Sub-Category')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter sub-category name');
    fireEvent.change(nameInput, { target: { value: '98765' } });

    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('Sub-category name cannot be purely numeric')).toBeInTheDocument();
    });
  });
});

describe('CategoriesPage — TASK-3.1.1-06 (Audit Log)', () => {
  it('FE-TC-3.1.1-15: View Category Audit Log', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('IT Services')).toBeInTheDocument();
    });

    const auditButtons = screen.getAllByText('Audit');
    fireEvent.click(auditButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Audit Log:/)).toBeInTheDocument();
    });

    expect(screen.getByText('CATEGORY_CREATED')).toBeInTheDocument();
  });
});
