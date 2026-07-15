import { useState, useEffect, useCallback } from 'react';

export function useLockoutTimer(lockoutUntil) {
  const [remainingMs, setRemainingMs] = useState(0);

  const update = useCallback(() => {
    if (!lockoutUntil) {
      setRemainingMs(0);
      return;
    }
    const remaining = lockoutUntil - Date.now();
    setRemainingMs(remaining > 0 ? remaining : 0);
  }, [lockoutUntil]);

  useEffect(() => {
    update();
    if (!lockoutUntil || Date.now() >= lockoutUntil) return;

    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil, update]);

  const formatTime = (ms) => {
    if (ms <= 0) return '';
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    remainingMs,
    formatted: formatTime(remainingMs),
    isActive: remainingMs > 0,
  };
}
