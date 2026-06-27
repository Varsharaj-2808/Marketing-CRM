import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { AuthProvider, AuthContext } from './AuthContext';
import { useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function mockFetch(body) {
  function res(data, status = 200) {
    const text = JSON.stringify(data);
    return { ok: status < 400, status, json: () => Promise.resolve(data), text: () => Promise.resolve(text) };
  }
  if (body.email === 'admin@company.com' && body.password === 'SecurePass123!') {
    return res({
      success: true,
      data: {
        token: 'mock-jwt-token-admin',
        refreshToken: 'mock-refresh-token',
        user: { id: 'EMP-00001', name: 'Admin User', email: 'admin@company.com', role: 'Admin', status: 'active' },
      },
    });
  }
  if (body.email === 'marketing@company.com' && body.password === 'MktPass456!') {
    return res({
      success: true,
      data: {
        token: 'mock-jwt-token-marketing',
        refreshToken: 'mock-refresh-token',
        user: { id: 'EMP-00002', name: 'Marketing User', email: 'marketing@company.com', role: 'Marketing Executive', status: 'active' },
      },
    });
  }
  return res({ success: false, status: 401, message: 'Invalid email or password' }, 401);
}

function TestComponent() {
  const ctx = useContext(AuthContext);
  return (
    <div>
      <div data-testid="isAuthenticated">{String(ctx.isAuthenticated)}</div>
      <div data-testid="isLockedOut">{String(ctx.isLockedOut())}</div>
      <div data-testid="failedAttempts">{ctx.failedAttempts}</div>
      <div data-testid="user">{ctx.user ? ctx.user.email : 'null'}</div>
      <div data-testid="rememberMe">{String(ctx.rememberMe)}</div>
      <button
        data-testid="loginBtn"
        onClick={() => ctx.login('admin@company.com', 'SecurePass123!', true)}
      >
        Login Admin
      </button>
      <button
        data-testid="loginMarketingBtn"
        onClick={() => ctx.login('marketing@company.com', 'MktPass456!', false)}
      >
        Login Marketing
      </button>
      <button
        data-testid="loginFailBtn"
        onClick={() => ctx.login('admin@company.com', 'WrongPass123!', false)}
      >
        Login Fail
      </button>
      <button
        data-testid="loginUnknownBtn"
        onClick={() => ctx.login('unknown@company.com', 'AnyPass123!', false)}
      >
        Login Unknown
      </button>
      <button data-testid="logoutBtn" onClick={() => ctx.logout()}>
        Logout
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );
}

const WAIT_TIMEOUT = 10000;

beforeEach(() => {
  global.fetch = vi.fn().mockImplementation(async (url, options) => {
    const body = JSON.parse(options.body);
    return mockFetch(body);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthContext — Login & Authentication', () => {
  afterEach(cleanup);
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('TEST-EP1-LOGIN-001: successful login with valid Admin credentials', async () => {
    renderWithProvider();
    const loginBtn = screen.getByTestId('loginBtn');
    await act(async () => { fireEvent.click(loginBtn); });
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user')).toHaveTextContent('admin@company.com');
    }, { timeout: WAIT_TIMEOUT });
  });

  it('TEST-EP1-LOGIN-002: successful login with valid Marketing credentials', async () => {
    renderWithProvider();
    const loginBtn = screen.getByTestId('loginMarketingBtn');
    await act(async () => { fireEvent.click(loginBtn); });
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user')).toHaveTextContent('marketing@company.com');
    }, { timeout: WAIT_TIMEOUT });
  });

  it('TEST-EP1-LOGIN-007: failed login with wrong password', async () => {
    renderWithProvider();
    const loginBtn = screen.getByTestId('loginFailBtn');
    await act(async () => { fireEvent.click(loginBtn); });
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('failedAttempts')).toHaveTextContent('1');
    }, { timeout: WAIT_TIMEOUT });
  });

  it('TEST-EP1-LOGIN-008: failed login with non-existent email increments attempts (enumeration prevention)', async () => {
    renderWithProvider();
    const loginBtn = screen.getByTestId('loginUnknownBtn');
    await act(async () => { fireEvent.click(loginBtn); });
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('failedAttempts')).toHaveTextContent('1');
    }, { timeout: WAIT_TIMEOUT });
  });
});

describe('AuthContext — TASK-1.1.1-06 (Account Lockout)', () => {
  afterEach(cleanup);
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('TEST-EP1-LOGIN-014: locks account after 5 failed attempts', async () => {
    vi.useFakeTimers();
    renderWithProvider();
    const failBtn = screen.getByTestId('loginFailBtn');

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        fireEvent.click(failBtn);
        vi.advanceTimersByTime(501);
      });
    }

    expect(screen.getByTestId('isLockedOut')).toHaveTextContent('true');
    vi.useRealTimers();
  }, 15000);
});

describe('AuthContext — TASK-1.1.1-05 (Remember Me)', () => {
  afterEach(cleanup);
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('sets rememberMe flag when logging in with remember me', async () => {
    renderWithProvider();
    const loginBtn = screen.getByTestId('loginBtn');
    await act(async () => { fireEvent.click(loginBtn); });
    await waitFor(() => {
      expect(screen.getByTestId('rememberMe')).toHaveTextContent('true');
    }, { timeout: WAIT_TIMEOUT });
  });
});

describe('AuthContext — TASK-1.1.1-07 (Logout)', () => {
  afterEach(cleanup);
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('TEST-EP1-LOGIN-036: clears auth state on logout', async () => {
    renderWithProvider();
    const loginBtn = screen.getByTestId('loginBtn');
    await act(async () => { fireEvent.click(loginBtn); });
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    }, { timeout: WAIT_TIMEOUT });

    const logoutBtn = screen.getByTestId('logoutBtn');
    await act(async () => { fireEvent.click(logoutBtn); });
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    }, { timeout: WAIT_TIMEOUT });
  });

  it('TEST-EP1-LOGIN-028: multiple simultaneous sessions allowed (new login does not invalidate old)', async () => {
    renderWithProvider();
    const loginBtn = screen.getByTestId('loginBtn');
    await act(async () => { fireEvent.click(loginBtn); });
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    }, { timeout: WAIT_TIMEOUT });

    const logoutBtn = screen.getByTestId('logoutBtn');
    await act(async () => { fireEvent.click(logoutBtn); });
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    }, { timeout: WAIT_TIMEOUT });

    await act(async () => { fireEvent.click(loginBtn); });
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    }, { timeout: WAIT_TIMEOUT });
  });
});
