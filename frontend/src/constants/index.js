// API base URL. In development, Vite proxies /api -> Mockoon (http://localhost:3001)
// to avoid CORS errors. Set VITE_API_BASE_URL in .env to switch backends:
//   - Via Vite proxy (default, no CORS):           /api
//   - Direct to Mockoon:                           http://localhost:3001
//   - Postman Mock Server:                         https://54c19606-357c-410a-a421-e16b93fcf051.mock.pstmn.io
//   - Production backend:                          <your-production-url>
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api';

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
