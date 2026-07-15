import { createContext, useState, useCallback, useEffect } from 'react';
import {
  LOCKOUT_THRESHOLD,
  LOCKOUT_DURATION_MS,
  STORAGE_KEYS,
} from '../constants';
import { api } from '../services/api';

export const AuthContext = createContext(null);

function getFromStorage(key) {
  try {
    const val = localStorage.getItem(key) || sessionStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

function setTokenStorage(key, value, rememberMe) {
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(key, JSON.stringify(value));
}

function removeFromAllStorage(key) {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getFromStorage(STORAGE_KEYS.USER));
  const [token, setToken] = useState(() => getFromStorage(STORAGE_KEYS.ACCESS_TOKEN));
  const [refreshTokenValue, setRefreshTokenValue] = useState(() => getFromStorage(STORAGE_KEYS.REFRESH_TOKEN));
  const [failedAttempts, setFailedAttempts] = useState(() => {
    const stored = getFromStorage(STORAGE_KEYS.FAILED_ATTEMPTS);
    return stored ?? 0;
  });
  const [lockoutUntil, setLockoutUntil] = useState(() => getFromStorage(STORAGE_KEYS.LOCKOUT_UNTIL));
  const [rememberMe, setRememberMe] = useState(() => !!getFromStorage(STORAGE_KEYS.REMEMBER_ME));

  const isLockedOut = useCallback(() => {
    if (!lockoutUntil) return false;
    return Date.now() < lockoutUntil;
  }, [lockoutUntil]);

  const getLockoutRemainingMs = useCallback(() => {
    if (!lockoutUntil) return 0;
    const remaining = lockoutUntil - Date.now();
    return remaining > 0 ? remaining : 0;
  }, [lockoutUntil]);

  const recordFailedAttempt = useCallback(() => {
    const newCount = failedAttempts + 1;
    setFailedAttempts(newCount);
    sessionStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, JSON.stringify(newCount));

    if (newCount >= LOCKOUT_THRESHOLD) {
      const until = Date.now() + LOCKOUT_DURATION_MS;
      setLockoutUntil(until);
      localStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, JSON.stringify(until));
      setFailedAttempts(0);
      sessionStorage.removeItem(STORAGE_KEYS.FAILED_ATTEMPTS);
    }

    return newCount;
  }, [failedAttempts]);

  const resetFailedAttempts = useCallback(() => {
    setFailedAttempts(0);
    sessionStorage.removeItem(STORAGE_KEYS.FAILED_ATTEMPTS);
  }, []);

  const loginAction = useCallback(
    async (email, password, remember = false) => {
      if (isLockedOut()) {
        return { success: false, status: 429, message: 'Account temporarily locked.' };
      }

      const result = await api.login(email, password);

      if (result.success) {
        setUser(result.user);
        setToken(result.token);
        setRememberMe(remember);
        setTokenStorage(STORAGE_KEYS.ACCESS_TOKEN, result.token, remember);
        if (remember) {
          setRefreshTokenValue(result.refreshToken || 'mock-refresh-token');
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, JSON.stringify(result.refreshToken || 'mock-refresh-token'));
          localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, JSON.stringify(true));
        }
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.user));
        resetFailedAttempts();
      } else {
        recordFailedAttempt();
        if (isLockedOut()) {
          return { success: false, status: 429, message: 'Account temporarily locked. Please try again after 15 minutes.' };
        }
      }

      return result;
    },
    [isLockedOut, recordFailedAttempt, resetFailedAttempts]
  );

  const logoutAction = useCallback(() => {
    setUser(null);
    setToken(null);
    setRefreshTokenValue(null);
    removeFromAllStorage(STORAGE_KEYS.ACCESS_TOKEN);
    removeFromAllStorage(STORAGE_KEYS.REFRESH_TOKEN);
    removeFromAllStorage(STORAGE_KEYS.USER);
    removeFromAllStorage(STORAGE_KEYS.REMEMBER_ME);
  }, []);

  useEffect(() => {
    if (lockoutUntil && Date.now() >= lockoutUntil) {
      setLockoutUntil(null);
      localStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);
    }
  }, [lockoutUntil]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken: refreshTokenValue,
        rememberMe,
        failedAttempts,
        lockoutUntil,
        isLockedOut,
        getLockoutRemainingMs,
        login: loginAction,
        logout: logoutAction,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
