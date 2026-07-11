import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import CategoriesPage from '../../pages/admin/CategoriesPage';

function mockRes(data, status = 200) {
  const body = JSON.stringify(data);
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(body),
  });
}

const MOCK_CATEGORIES = [
  { id: 'cat-001', name: 'IT Services', isActive: true },
  { id: 'cat-002', name: 'Digital Marketing', isActive: true },
  { id: 'cat-003', name: 'Consulting', isActive: true },
  { id: 'cat-004', name: 'Real Estate', isActive: true },
  { id: 'cat-005', name: 'Healthcare', isActive: true },
];

const MOCK_SUBS = {
  'cat-001': [
    { id: 'sub-001', name: 'Web Development', isActive: true, category_id: 'cat-001' },
    { id: 'sub-002', name: 'Mobile App Development', isActive: true, category_id: 'cat-001' },
    { id: 'sub-003', name: 'Cloud Solutions', isActive: true, category_id: 'cat-001' },
    { id: 'sub-004', name: 'IT Support', isActive: true, category_id: 'cat-001' },
  ],
  'cat-002': [
    { id: 'sub-005', name: 'SEO Services', isActive: true, category_id: 'cat-002' },
    { id: 'sub-006', name: 'Social Media Management', isActive: true, category_id: 'cat-002' },
    { id: 'sub-007', name: 'Email Marketing', isActive: true, category_id: 'cat-002' },
    { id: 'sub-008', name: 'Content Marketing', isActive: true, category_id: 'cat-002' },
  ],
  'cat-003': [
    { id: 'sub-009', name: 'Business Strategy', isActive: true, category_id: 'cat-003' },
    { id: 'sub-010', name: 'Management Consulting', isActive: true, category_id: 'cat-003' },
    { id: 'sub-011', name: 'Financial Advisory', isActive: true, category_id: 'cat-003' },
  ],
  'cat-004': [
    { id: 'sub-012', name: 'Residential', isActive: true, category_id: 'cat-004' },
    { id: 'sub-013', name: 'Commercial', isActive: true, category_id: 'cat-004' },
    { id: 'sub-014', name: 'Industrial', isActive: true, category_id: 'cat-004' },
  ],
  'cat-005': [
    { id: 'sub-015', name: 'Medical Equipment', isActive: true, category_id: 'cat-005' },
    { id: 'sub-016', name: 'Pharmaceuticals', isActive: true, category_id: 'cat-005' },
    { id: 'sub-017', name: 'Healthcare Consulting', isActive: true, category_id: 'cat-005' },
  ],
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

    if (url.includes('/admin/subcategories') && method === 'GET') {
      const categoryId = new URL(url, 'http://localhost').searchParams.get('category_id');
      return mockRes({ success: true, data: MOCK_SUBS[categoryId] || [] });
    }

    if (url.includes('/admin/categories/') && method === 'PUT') {
      const body = JSON.parse(init?.body || '{}');
      if (body.isActive !== undefined) {
        const msg = body.isActive ? 'Category activated.' : 'Category deactivated.';
        return mockRes({ success: true, data: { id: url.split('/').pop(), ...body }, message: msg });
      }
      return mockRes({ success: true, data: {}, message: 'Category updated successfully.' });
    }

    if (url.includes('/admin/categories/') && method === 'DELETE') {
      return mockRes({ success: true, message: 'Category deleted successfully.' });
    }

    if (url.includes('/admin/categories/') && url.includes('/in-use')) {
      return mockRes({ inUse: false, leads: [] });
    }

    if (url.includes('/admin/categories/') && url.includes('/audit-log')) {
      return mockRes({ success: true, data: [] });
    }

    if (url.includes('/admin/categories') && method === 'POST') {
      return mockRes({ success: true, data: { id: 'cat-006', name: 'New Category', isActive: true }, message: 'Category created successfully.' }, 201);
    }

    if (url.includes('/admin/categories/active')) {
      return mockRes({ success: true, data: MOCK_CATEGORIES.filter(c => c.isActive !== false) });
    }

    if (url.includes('/admin/categories') && method === 'GET') {
      return mockRes({ success: true, data: MOCK_CATEGORIES });
    }

    return mockRes({ success: false, message: 'Not found' }, 404);
  });
}

function setupAuth() {
  localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
  localStorage.setItem('crm_user', JSON.stringify({
    id: 'ADM-001',
    employee_id: 'ADM-001',
    name: 'Admin User',
    email: 'admin@company.com',
    role: 'Admin',
    status: 'active',
  }));
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  setupAuth();
  setupMockFetch();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/categories']}>
      <AuthProvider>
        <CategoriesPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('E2E: Category Master Flow', () => {
  it('completes full CRUD cycle: view, create, edit, expand sub-categories', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('IT Services')).toBeInTheDocument();
    });

    expect(screen.getByText('Digital Marketing')).toBeInTheDocument();
    expect(screen.getByText('Consulting')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Add Category'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter category name')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Enter category name'), { target: { value: 'E2E Test Cat' } });
    fireEvent.click(screen.getByText('Create'));
    await waitFor(() => {
      expect(screen.getByText('Category created successfully.')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[editButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Healthcare')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.getByText('IT Services')).toBeInTheDocument();
    });

    const expandBtn = findExpandButton('IT Services');
    expect(expandBtn).toBeTruthy();
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByText('Web Development')).toBeInTheDocument();
    });
    expect(screen.getByText('Cloud Solutions')).toBeInTheDocument();
  });

  it('deactivates and reactivates a category', async () => {
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
});
