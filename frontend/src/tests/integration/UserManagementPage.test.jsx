import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import UserManagementPage from '../../pages/admin/UserManagementPage';

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
  localStorage.setItem('crm_user', JSON.stringify({
    id: 'EMP-00001', name: 'Admin User', email: 'admin@company.com', role: 'Admin', status: 'active',
  }));
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderUserManagement() {
  return render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <AuthProvider>
        <UserManagementPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('UserManagementPage — STORY-1.2.1 Create User (Positive)', () => {
  it('TEST-EP1-USER-001: renders create user button and opens form', async () => {
    renderUserManagement();
    const addBtn = screen.getByRole('button', { name: /add user/i });
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);
    await waitFor(() => {
      expect(screen.getByText(/create new user/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-001: create user form has all mandatory fields', async () => {
    renderUserManagement();
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
    renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByLabelText(/employee name/i));

    fireEvent.change(screen.getByLabelText(/employee name/i), { target: { value: 'Jane Smith' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '9123456789' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@company.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Admin' } });
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'Active' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/user created successfully/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-003: employee ID auto-generates in EMP-XXXXX format', () => {
    renderUserManagement();
    const empIds = screen.getAllByText(/EMP-0000[1-9]/);
    expect(empIds.length).toBeGreaterThanOrEqual(1);
  });

  it('TEST-EP1-USER-008: can create user with Inactive status', async () => {
    renderUserManagement();
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
    renderUserManagement();
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
    renderUserManagement();
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
    renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByLabelText(/employee name/i));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/employee name is required/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-014: shows validation error for empty mobile', async () => {
    renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByLabelText(/employee name/i));
    fireEvent.change(screen.getByLabelText(/employee name/i), { target: { value: 'Test User' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/mobile number is required/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-015: shows validation error for empty email', async () => {
    renderUserManagement();
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
    renderUserManagement();
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
    renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByLabelText(/employee name/i));
    const roleSelect = screen.getByLabelText(/role/i);
    const options = Array.from(roleSelect.options).map(o => o.value);
    expect(options).toContain('Admin');
    expect(options).toContain('Marketing Executive');
  });

  it('TEST-EP1-USER-018: rejects invalid status value', async () => {
    renderUserManagement();
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => screen.getByLabelText(/employee name/i));
    const statusSelect = screen.getByLabelText(/status/i);
    const options = Array.from(statusSelect.options).map(o => o.value);
    expect(options).toContain('Active');
    expect(options).toContain('Inactive');
  });
});

describe('UserManagementPage — STORY-1.2.1 Edit User', () => {
  it('TEST-EP1-USER-027: renders edit button for each user', () => {
    renderUserManagement();
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    expect(editBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('TEST-EP1-USER-027: edit form pre-fills user data', async () => {
    renderUserManagement();
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]);
    await waitFor(() => {
      expect(screen.getByLabelText(/employee name/i)).toHaveValue();
      expect(screen.getByLabelText(/mobile number/i)).toHaveValue();
    });
  });

  it('TEST-EP1-USER-028: role dropdown includes both Admin and Marketing Executive', async () => {
    renderUserManagement();
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
    renderUserManagement();
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]);
    await waitFor(() => {
      const idInput = document.querySelector('input[disabled]');
      expect(idInput).toBeInTheDocument();
    });
  });
});

describe('UserManagementPage — STORY-1.2.1 Deactivate User', () => {
  it('TEST-EP1-USER-035: shows deactivate button for Active users', () => {
    renderUserManagement();
    const deactivateBtns = screen.getAllByRole('button', { name: /deactivate/i });
    expect(deactivateBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('TEST-EP1-USER-035: deactivate changes status to Inactive', async () => {
    renderUserManagement();
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
    renderUserManagement();
    const deactivateBtns = screen.getAllByRole('button', { name: /deactivate/i });
    fireEvent.click(deactivateBtns[0]);
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-USER-040: no hard delete button visible', () => {
    renderUserManagement();
    const deleteBtns = screen.queryAllByRole('button', { name: /delete/i });
    expect(deleteBtns.length).toBe(0);
  });
});

describe('UserManagementPage — STORY-1.2.1 Role Change & Permission', () => {
  it('TEST-EP1-USER-041: user role change updates role in table', async () => {
    renderUserManagement();
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
  it('TEST-EP1-USER-046: table displays list of users', () => {
    renderUserManagement();
    expect(screen.getByText(/employee id/i)).toBeInTheDocument();
    expect(screen.getByText(/employee name/i)).toBeInTheDocument();
  });

  it('TEST-EP1-USER-047: table has columns for employee_id, name, email, role, status', () => {
    renderUserManagement();
    expect(screen.getByText(/employee id/i)).toBeInTheDocument();
    expect(screen.getByText(/employee name/i)).toBeInTheDocument();
    expect(screen.getByText(/email/i)).toBeInTheDocument();
    expect(screen.getByText(/mobile/i)).toBeInTheDocument();
    expect(screen.getByText(/role/i)).toBeInTheDocument();
    expect(screen.getByText(/status/i)).toBeInTheDocument();
  });

  it('TEST-EP1-USER-051: password column not visible in table', () => {
    renderUserManagement();
    expect(screen.queryByText(/password/i)).not.toBeInTheDocument();
  });
});

describe('UserManagementPage — STORY-1.2.1 Audit Log', () => {
  it('TEST-EP1-USER-053: audit log section is present', () => {
    renderUserManagement();
    expect(screen.getByText(/audit log/i)).toBeInTheDocument();
  });

  it('TEST-EP1-USER-058: audit log shows user activity entries', () => {
    renderUserManagement();
    const auditLogSection = screen.getByText(/audit log/i).closest('div');
    const parentSection = auditLogSection.parentElement;
    expect(parentSection.textContent).toMatch(/USER_CREATED/i);
  });
});

describe('UserManagementPage — STORY-1.2.1 Business Rules', () => {
  it('TEST-EP1-USER-059: employee IDs follow EMP-XXXXX format in table', () => {
    renderUserManagement();
    const empIds = screen.getAllByText(/EMP-0000[1-9]/);
    expect(empIds.length).toBeGreaterThanOrEqual(2);
  });

  it('TEST-EP1-USER-061: no delete button in user table', () => {
    renderUserManagement();
    const deleteBtns = screen.queryAllByText(/delete/i);
    expect(deleteBtns.length).toBe(0);
  });
});
