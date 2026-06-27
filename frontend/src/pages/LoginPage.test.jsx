import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import LoginPage from './LoginPage';

const LOCKOUT_TIMEOUT = 15000;

function mockRes(data, status = 200) {
  const body = JSON.stringify(data);
  return { ok: status < 400, status, json: () => Promise.resolve(data), text: () => Promise.resolve(body) };
}

beforeEach(() => {
  global.fetch = vi.fn().mockImplementation(async (url, options) => {
    const body = JSON.parse(options.body);
    if (body.email === 'admin@company.com' && body.password === 'SecurePass123!') {
      return mockRes({ success: true, data: { token: 'x', refreshToken: 'x', user: { id: '1', name: 'Admin', email: 'admin@company.com', role: 'Admin', status: 'active' } } });
    }
    return mockRes({ success: false, status: 401, message: 'Invalid email or password' }, 401);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('LoginPage — TASK-1.1.1-01 (Login UI)', () => {
  afterEach(cleanup);
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('TEST-EP1-LOGIN-010: shows error when email is empty', async () => {
    renderLoginPage();
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.blur(emailInput);
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('TEST-EP1-LOGIN-012: shows error for invalid email format', async () => {
    renderLoginPage();
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    const form = screen.getByTestId('loginForm');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText(/Invalid.*Email format/i)).toBeInTheDocument();
    });
  });

  it('TEST-EP1-LOGIN-011: shows error when password is empty', async () => {
    renderLoginPage();
    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.blur(passwordInput);
    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('TEST-EP1-LOGIN-013: shows error for password less than 6 chars', async () => {
    renderLoginPage();
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(emailInput, { target: { value: 'admin@company.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    const form = screen.getByTestId('loginForm');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument();
    });
  });

  it('TEST-EP1-LOGIN-001: renders email, password, remember me, sign in button', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('TEST-EP1-LOGIN-001: shows glassmorphism card and branding', () => {
    renderLoginPage();
    expect(screen.getByText('ApexCRM')).toBeInTheDocument();
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText(/enter your credentials/i)).toBeInTheDocument();
  });

  it('has Forgot Password link', () => {
    renderLoginPage();
    const links = screen.getAllByText('Forgot Password?');
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it('TEST-EP1-LOGIN-007: shows generic error for invalid credentials', async () => {
    renderLoginPage();
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(emailInput, { target: { value: 'admin@company.com' } });
    fireEvent.change(passwordInput, { target: { value: 'WrongPass123!' } });
    const form = screen.getByTestId('loginForm');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('TEST-EP1-LOGIN-049: Remember Me checkbox toggles', () => {
    renderLoginPage();
    const checkbox = screen.getByLabelText(/remember me/i);
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('shows loading spinner on submit', async () => {
    renderLoginPage();
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(emailInput, { target: { value: 'admin@company.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
    const form = screen.getByTestId('loginForm');
    fireEvent.submit(form);
    expect(screen.getByText('Authenticating...')).toBeInTheDocument();
  });

  it('TEST-EP1-LOGIN-004: trims whitespace from email', async () => {
    renderLoginPage();
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(emailInput, { target: { value: '  admin@company.com  ' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
    const form = screen.getByTestId('loginForm');
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.queryByText('Invalid Email format')).not.toBeInTheDocument();
    });
  });
});

describe('LoginPage — TASK-1.1.1-06 (Account Lockout)', () => {
  afterEach(cleanup);
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('TEST-EP1-LOGIN-014: shows lockout after 5 failed attempts', async () => {
    renderLoginPage();
    const form = screen.getByTestId('loginForm');

    for (let i = 0; i < 5; i++) {
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@company.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'WrongPass123!' } });
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      }, { timeout: 4000 });
    }

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@company.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'WrongPass123!' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/account temporarily locked/i)).toBeInTheDocument();
    }, { timeout: 4000 });
  }, LOCKOUT_TIMEOUT);

  it('TEST-EP1-LOGIN-015: button disabled during lockout', async () => {
    renderLoginPage();
    const form = screen.getByTestId('loginForm');

    for (let i = 0; i < 5; i++) {
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@company.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'WrongPass123!' } });
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      }, { timeout: 4000 });
    }

    await waitFor(() => {
      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      expect(submitBtn).toBeDisabled();
    }, { timeout: 3000 });
  }, LOCKOUT_TIMEOUT);

  it('TEST-EP1-LOGIN-014: shows lockout remaining time', async () => {
    renderLoginPage();
    const form = screen.getByTestId('loginForm');

    for (let i = 0; i < 5; i++) {
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@company.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'WrongPass123!' } });
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      }, { timeout: 4000 });
    }

    await waitFor(() => {
      expect(screen.getByText(/lockout remaining/i)).toBeInTheDocument();
    }, { timeout: 4000 });
  }, LOCKOUT_TIMEOUT);
});

describe('LoginPage — TASK-1.1.1-05 (Remember Me)', () => {
  afterEach(cleanup);
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('Remember Me checkbox exists and is functional', () => {
    renderLoginPage();
    const checkbox = screen.getByLabelText(/remember me/i);
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('type', 'checkbox');
  });
});
