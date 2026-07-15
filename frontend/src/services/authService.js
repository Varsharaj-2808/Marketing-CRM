import { apiClient } from '../utils/apiClient';

export async function login({ email, password, rememberMe }) {
  return apiClient('/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password, rememberMe },
  });
}

export async function logout() {
  return apiClient('/auth/logout', { method: 'POST' });
}

export async function forgotPassword(email) {
  return apiClient('/auth/forgot-password', {
    method: 'POST',
    body: { email: email.trim() },
  });
}

export async function refreshToken(refreshTokenValue) {
  return apiClient('/auth/refresh-token', {
    method: 'POST',
    body: { refreshToken: refreshTokenValue },
  });
}

export async function resetPassword(token, newPassword) {
  return apiClient('/auth/reset-password', {
    method: 'POST',
    body: { token, newPassword },
  });
}

export async function getProfile() {
  return apiClient('/auth/profile', { method: 'GET' });
}

export async function changePassword({ currentPassword, newPassword }) {
  return apiClient('/auth/change-password', {
    method: 'PUT',
    body: { currentPassword, newPassword },
  });
}
