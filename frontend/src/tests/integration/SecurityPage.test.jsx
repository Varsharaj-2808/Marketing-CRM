import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import SecurityPage from '../../pages/admin/SecurityPage';

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

function renderSecurityPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/security']}>
      <AuthProvider>
        <SecurityPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('SecurityPage — Admin Security Settings', () => {
  it('renders security configuration heading', () => {
    renderSecurityPage();
    expect(screen.getByText(/security configuration/i)).toBeInTheDocument();
  });

  it('renders Account Lockout Policy section', () => {
    renderSecurityPage();
    expect(screen.getByText(/account lockout policy/i)).toBeInTheDocument();
  });

  it('renders lockout threshold input with default value 5', () => {
    renderSecurityPage();
    const threshold = screen.getByLabelText(/lockout threshold/i);
    expect(threshold).toBeInTheDocument();
    expect(threshold).toHaveValue(5);
  });

  it('renders lockout duration input with default value 15', () => {
    renderSecurityPage();
    const duration = screen.getByLabelText(/lockout duration/i);
    expect(duration).toBeInTheDocument();
    expect(duration).toHaveValue(15);
  });

  it('renders Multi-Factor Auth section', () => {
    renderSecurityPage();
    expect(screen.getByText(/multi-factor auth/i)).toBeInTheDocument();
  });

  it('renders Session Timeout section', () => {
    renderSecurityPage();
    expect(screen.getByText(/session timeout/i)).toBeInTheDocument();
  });

  it('renders Recent Security Events table', () => {
    renderSecurityPage();
    expect(screen.getByText(/recent security events/i)).toBeInTheDocument();
  });

  it('security events table has Event, Source IP, Timestamp, Status columns', () => {
    renderSecurityPage();
    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).toEqual(
      expect.arrayContaining(['Event', 'Source IP', 'Timestamp', 'Status'])
    );
  });

  it('renders Save Changes and Cancel buttons', () => {
    renderSecurityPage();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('save shows success toast', async () => {
    renderSecurityPage();
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(screen.getByText(/settings saved/i)).toBeInTheDocument();
    });
  });

  it('lockout threshold can be changed', async () => {
    renderSecurityPage();
    const threshold = screen.getByLabelText(/lockout threshold/i);
    fireEvent.change(threshold, { target: { value: '3' } });
    expect(threshold).toHaveValue(3);
  });

  it('lockout duration can be changed', async () => {
    renderSecurityPage();
    const duration = screen.getByLabelText(/lockout duration/i);
    fireEvent.change(duration, { target: { value: '30' } });
    expect(duration).toHaveValue(30);
  });
});
