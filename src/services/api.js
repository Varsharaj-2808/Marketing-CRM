import { API_BASE_URL } from '../constants';
import { DEMO_ACCOUNTS } from '../constants/demoAccounts';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const api = {
  async login(email, password) {
    if (email === 'fail@test.com') {
      return { success: false, status: 401, message: 'Invalid email or password' };
    }


    const demoAccount = DEMO_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (demoAccount && password === demoAccount.password) {
      return {
        success: true,
        status: 200,
        token: `mock-jwt-token-${Date.now()}`,
        user: { ...demoAccount.user },
        refreshToken: 'mock-refresh-token',
        redirect: '/dashboard',
      };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        console.error('Login API returned status:', res.status);
        return { success: false, status: res.status, message: 'Invalid email or password' };
      }
      const text = await res.text();
      const sanitized = text.replace(/[\u00A0\uFEFF]/g, ' ');
      let json;
      try { json = JSON.parse(sanitized); } catch { json = null; }
      if (json && json.success && json.data) {
        return {
          success: true,
          status: 200,
          token: json.data.token,
          user: json.data.user,
          refreshToken: json.data.refreshToken,
          redirect: '/dashboard',
        };
      }
      return {
        success: false,
        status: json?.status || res.status || 401,
        message: json?.message || 'Invalid email or password',
      };
    } catch (e) {
      console.error('Login API network error:', e);
      return { success: false, status: 500, message: 'Network error. Please try again.' };
    }
  },

  async forgotPassword(email) {
    await delay(800);
    return {
      success: true,
      status: 200,
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  },
};
