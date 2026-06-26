import { API_BASE_URL } from '../constants';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('crm_access_token') || sessionStorage.getItem('crm_access_token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();
  return { status: response.status, ...data };
}

export async function login({ email, password, rememberMe }) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password, rememberMe }),
  });
}

export async function logout() {
  return request('/auth/logout', { method: 'POST' });
}

export async function forgotPassword(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
  });
}

export async function refreshToken(refreshTokenValue) {
  return request('/auth/refresh-token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
  });
}
