import { API_BASE_URL } from '../constants';
import { userService } from './userService';

export const api = {
  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login?_=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
        body: JSON.stringify({ email, password }),
      });
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

      if (!res.ok && (res.status === 401 || res.status === 403)) {
        const deactivatedUsers = await userService.getDeactivatedUsers();
        if (deactivatedUsers?.data?.some(u => u.email === email)) {
          return { success: false, status: 403, message: 'Your account has been deactivated. Please contact an administrator.' };
        }
      }
    } catch (e) {
      console.error('Login API network error:', e);
    }

    return { success: false, status: 401, message: 'Invalid email or password' };
  },

  async forgotPassword(email) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password?_=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
        body: JSON.stringify({ email }),
      });
      const text = await res.text();
      try { return JSON.parse(text); } catch { return { success: false, message: 'Failed to process request.' }; }
    } catch (e) {
      console.error('Forgot password API error:', e);
      return { success: false, message: 'Network error. Please try again.' };
    }
  },
};
