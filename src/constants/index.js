export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://ffa1247a-f31a-4de0-88e5-ad84b3034b37.mock.pstmn.io';

export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
export const TOKEN_EXPIRY_MS = 8 * 60 * 60 * 1000;
export const REMEMBER_ME_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'crm_access_token',
  REFRESH_TOKEN: 'crm_refresh_token',
  USER: 'crm_user',
  FAILED_ATTEMPTS: 'crm_failed_attempts',
  LOCKOUT_UNTIL: 'crm_lockout_until',
  REMEMBER_ME: 'crm_remember_me',
};

export const ROLES = {
  ADMIN: 'Admin',
  MARKETING_EXECUTIVE: 'Marketing Executive',
};
