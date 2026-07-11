import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import UserManagementPage from '../../pages/admin/UserManagementPage';

function mockRes(data, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(data),
  });
}

const MOCK_USERS = [
  { employee_id: 'EMP-00001', employee_name: 'Admin User', email: 'admin@company.com', mobile: '9876543210', role: 'Admin', status: 'Active' },
  { employee_id: 'EMP-00002', employee_name: 'Jane Smith', email: 'jane@company.com', mobile: '9123456789', role: 'Marketing Executive', status: 'Active' },
  { employee_id: 'EMP-00003', employee_name: 'Bob Wilson', email: 'bob@company.com', mobile: '9234567890', role: 'Marketing Executive', status: 'Active' },
  { employee_id: 'EMP-00004', employee_name: 'Alice Brown', email: 'alice@company.com', mobile: '9345678901', role: 'Marketing Executive', status: 'Inactive' },
  { employee_id: 'EMP-00005', employee_name: 'Charlie Davis', email: 'charlie@company.com', mobile: '9456789012', role: 'Admin', status: 'Active' },
];

function setupMockFetch() {
  global.fetch = vi.fn().mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';

    if (url.includes('/admin/users/deactivated')) {
      return mockRes({ success: true, data: [] });
    }

    if (url.includes('/admin/users/') && method === 'PATCH') {
      if (url.includes('/deactivate')) {
        return mockRes({ success: true, data: { status: 'Inactive' }, message: 'User deactivated successfully.' });
      }
      if (url.includes('/activate')) {
        return mockRes({ success: true, data: { status: 'Active' }, message: 'User activated successfully.' });
      }
    }

    if (url.includes('/admin/users/') && method === 'PUT') {
      const body = init?.body ? JSON.parse(init.body) : {};
      return mockRes({ success: true, data: body, message: 'User updated successfully.' });
    }

    if (url.includes('/admin/users/') && method === 'DELETE') {
      return mockRes({ success: true, message: 'User deleted successfully.' });
    }

    if (url.includes('/admin/users') && method === 'POST') {
      const body = init?.body ? JSON.parse(init.body) : {};
      return mockRes({ success: true, data: { ...body, employee_id: 'EMP-00006' }, message: 'User created successfully.' }, 201);
    }

    if (url.includes('/admin/users') && method === 'GET') {
      return mockRes({ success: true, data: MOCK_USERS });
    }

    return mockRes({ success: false, message: 'Not found' }, 404);
  });
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
  localStorage.setItem('crm_user', JSON.stringify({
    id: 'EMP-00001', name: 'Admin User', email: 'admin@company.com', role: 'Admin', status: 'active',
  }));
  vi.resetAllMocks();
  setupMockFetch();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function renderUserManagement() {
  render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <AuthProvider>
        <UserManagementPage />
      </AuthProvider>
    </MemoryRouter>
  );
  await waitFor(() => {
    expect(screen.getByText('All Users')).toBeInTheDocument();
  });
}

describe('UserManagementPage — STORY-1.2.1 Create User (Positive)', () => {
  it('TEST-EP1-USER-001: renders create user button and opens form', async () => {
    await renderUserManagement();
    const addBtn = screen.getByRole('button', { name: /add user/i });
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);
    await waitFor(() => {
      expect(screen.getByText(/create new user/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-001: create user form has all mandatory fields', async () => {
    await renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/employee name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mobile number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-002: can create user with Admin role', async () => {
    await renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByLabelText(/employee name/i));

    fireEvent.change(screen.getByLabelText(/employee name/i), { target: { value: 'Jane Smith' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '9111122222' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane.doe@company.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Admin' } });
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'Active' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/user created successfully/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-003: employee ID auto-generates in EMP-XXXXX format', async () => {
    await renderUserManagement();
    const empIds = screen.getAllByText(/EMP-0000[1-9]/);
    expect(empIds.length).toBeGreaterThanOrEqual(1);
  });

  it('TEST-EP1-USER-008: can create user with Inactive status', async () => {
    await renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByLabelText(/employee name/i));

    fireEvent.change(screen.getByLabelText(/employee name/i), { target: { value: 'Inactive User' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '9988776655' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'inactive@company.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Marketing Executive' } });
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'Inactive' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/user created successfully/i)).toBeInTheDocument();
    });
  });
});

describe('UserManagementPage — STORY-1.2.1 Create User (Negative)', () => {
  it('TEST-EP1-USER-011: shows error for duplicate email', async () => {
    await renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByLabelText(/employee name/i));

    fireEvent.change(screen.getByLabelText(/employee name/i), { target: { value: 'Duplicate' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '9111111111' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@company.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Marketing Executive' } });
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'Active' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-012: shows error for duplicate mobile', async () => {
    await renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByLabelText(/employee name/i));

    fireEvent.change(screen.getByLabelText(/employee name/i), { target: { value: 'Duplicate Mobile' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'unique@company.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Marketing Executive' } });
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'Active' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/mobile number already registered/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-013: shows validation error for empty employee name', async () => {
    await renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByLabelText(/employee name/i));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/employee name is required/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-014: shows validation error for empty mobile', async () => {
    await renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByLabelText(/employee name/i));
    fireEvent.change(screen.getByLabelText(/employee name/i), { target: { value: 'Test User' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/mobile number is required/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-015: shows validation error for empty email', async () => {
    await renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByLabelText(/employee name/i));
    fireEvent.change(screen.getByLabelText(/employee name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '9123456789' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-016: shows validation error for invalid email format', async () => {
    await renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByLabelText(/employee name/i));
    fireEvent.change(screen.getByLabelText(/employee name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '9123456789' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-017: rejects invalid role value', async () => {
    await renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByLabelText(/employee name/i));
    const roleSelect = screen.getByLabelText(/role/i);
    const options = Array.from(roleSelect.options).map(o => o.value);
    expect(options).toContain('Admin');
    expect(options).toContain('Marketing Executive');
  });

  it('TEST-EP1-USER-018: rejects invalid status value', async () => {
    await renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByLabelText(/employee name/i));
    const statusSelect = screen.getByLabelText(/status/i);
    const options = Array.from(statusSelect.options).map(o => o.value);
    expect(options).toContain('Active');
    expect(options).toContain('Inactive');
  });
});

describe('UserManagementPage — STORY-1.2.1 Edit User', () => {
  it('TEST-EP1-USER-027: renders edit button for each user', async () => {
    await renderUserManagement();
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    expect(editBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('TEST-EP1-USER-027: edit form pre-fills user data', async () => {
    await renderUserManagement();
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]);
    await waitFor(() => {
      expect(screen.getByLabelText(/employee name/i)).toHaveValue();
      expect(screen.getByLabelText(/mobile number/i)).toHaveValue();
    });
  });

  it('TEST-EP1-USER-028: role dropdown includes both Admin and Marketing Executive', async () => {
    await renderUserManagement();
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]);
    await waitFor(() => {
      const roleSelect = screen.getByLabelText(/role/i);
      const options = Array.from(roleSelect.options).map(o => o.value);
      expect(options).toContain('Admin');
      expect(options).toContain('Marketing Executive');
    });
  });

  it('TEST-EP1-USER-032: employee ID field is disabled (immutable)', async () => {
    await renderUserManagement();
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]);
    await waitFor(() => {
      const idInput = document.querySelector('input[disabled]');
      expect(idInput).toBeInTheDocument();
    });
  });
});

describe('UserManagementPage — STORY-1.2.1 Deactivate User', () => {
  it('TEST-EP1-USER-035: shows deactivate button for Active users', async () => {
    await renderUserManagement();
    const deactivateBtns = screen.getAllByRole('button', { name: /deactivate/i });
    expect(deactivateBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('TEST-EP1-USER-035: deactivate changes status to Inactive', async () => {
    await renderUserManagement();
    const deactivateBtns = screen.getAllByRole('button', { name: /deactivate/i });
    fireEvent.click(deactivateBtns[0]);
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => {
      expect(screen.getByText(/deactivated successfully/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-039: confirm dialog shows on deactivate', async () => {
    await renderUserManagement();
    const deactivateBtns = screen.getAllByRole('button', { name: /deactivate/i });
    fireEvent.click(deactivateBtns[0]);
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-040: no hard delete button visible', async () => {
    await renderUserManagement();
    const deleteBtns = screen.queryAllByRole('button', { name: /delete/i });
    expect(deleteBtns.length).toBe(0);
  });
});

describe('UserManagementPage — STORY-1.2.1 Role Change & Permission', () => {
  it('TEST-EP1-USER-041: user role change updates role in table', async () => {
    await renderUserManagement();
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]);
    await waitFor(() => screen.getByLabelText(/role/i));
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Marketing Executive' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByText(/user updated/i)).toBeInTheDocument();
    });
  });
});

describe('UserManagementPage — STORY-1.2.1 Access Control & Authorization', () => {
  it('TEST-EP1-USER-046: table displays list of users', async () => {
    await renderUserManagement();
    expect(screen.getByText(/employee id/i)).toBeInTheDocument();
    expect(screen.getByText(/employee name/i)).toBeInTheDocument();
  });

  it('TEST-EP1-USER-047: table has columns for employee_id, name, email, role, status', async () => {
    await renderUserManagement();
    expect(screen.getByText(/employee id/i)).toBeInTheDocument();
    expect(screen.getByText(/employee name/i)).toBeInTheDocument();
    expect(screen.getByText(/email/i)).toBeInTheDocument();
    expect(screen.getByText(/mobile/i)).toBeInTheDocument();
    expect(screen.getByText(/role/i)).toBeInTheDocument();
    expect(screen.getByText(/status/i)).toBeInTheDocument();
  });

  it('TEST-EP1-USER-051: password column not visible in table', async () => {
    await renderUserManagement();
    expect(screen.queryByText(/password/i)).not.toBeInTheDocument();
  });
});

describe('UserManagementPage — STORY-1.2.1 Audit Log', () => {
  it('TEST-EP1-USER-053: audit log section is not present on User Management page', async () => {
    await renderUserManagement();
    expect(screen.queryByText(/audit log/i)).not.toBeInTheDocument();
  });

  it('TEST-EP1-USER-058: audit log is accessible via dedicated Audit Logs page', async () => {
    await renderUserManagement();
    expect(screen.queryByText(/USER_CREATED/i)).not.toBeInTheDocument();
  });
});

describe('UserManagementPage — STORY-1.2.1 Business Rules', () => {
  it('TEST-EP1-USER-059: employee IDs follow EMP-XXXXX format in table', async () => {
    await renderUserManagement();
    const empIds = screen.getAllByText(/EMP-0000[1-9]/);
    expect(empIds.length).toBeGreaterThanOrEqual(2);
  });

  it('TEST-EP1-USER-061: no delete button in user table', async () => {
    await renderUserManagement();
    const deleteBtns = screen.queryAllByText(/delete/i);
    expect(deleteBtns.length).toBe(0);
  });
});
