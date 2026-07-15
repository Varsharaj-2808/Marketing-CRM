import { apiClient } from '../utils/apiClient';
import { userService } from './userService';

export const api = {
  async login(email, password) {
    try {
      const json = await apiClient('/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password },
      });
      if (json?.success && json?.data) {
        return {
          success: true,
          status: 200,
          token: json.data.token,
          user: json.data.user,
          refreshToken: json.data.refreshToken,
          redirect: '/dashboard',
        };
      }
    } catch (err) {
      const status = err?.status;
      if (status === 401 || status === 403) {
        try {
          const deactivatedUsers = await userService.getDeactivatedUsers();
          if (deactivatedUsers?.data?.some(u => u.email === email)) {
            return { success: false, status: 403, message: 'Your account has been deactivated. Please contact an administrator.' };
          }
        } catch {}
      }
      return { success: false, status: status || 500, message: err?.message || 'Login failed.' };
    }

    return { success: false, status: 401, message: 'Invalid email or password' };
  },

  async forgotPassword(email) {
    try {
      return await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim() },
      });
    } catch (err) {
      return { success: false, message: err?.message || 'Network error. Please try again.' };
    }
  },
};
