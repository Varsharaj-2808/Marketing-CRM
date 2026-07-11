import { apiClient } from '../utils/apiClient';

const STORAGE_KEY = 'crm_notifications';

function readStoredNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredNotifications(notifications) {
  const payload = JSON.stringify(notifications);
  localStorage.setItem(STORAGE_KEY, payload);
  sessionStorage.setItem(STORAGE_KEY, payload);
}

export async function fetchNotifications() {
  try {
    const json = await apiClient('/marketing/notifications');
    if (json?.data) {
      writeStoredNotifications(json.data);
      return json;
    }
  } catch {}

  const stored = readStoredNotifications();
  if (stored) {
    return { success: true, data: stored, unread_count: stored.filter(n => !n.read).length };
  }

  return { success: true, data: [], unread_count: 0 };
}

export async function markNotificationRead(notificationId) {
  const stored = readStoredNotifications();
  if (!stored) {
    return { success: true };
  }
  const next = stored.map((notification) => (
    notification.id === notificationId ? { ...notification, read: true } : notification
  ));
  writeStoredNotifications(next);
  return { success: true, data: next };
}

export async function addNotification(notification) {
  const stored = readStoredNotifications() || [];
  const next = [{ ...notification, id: notification.id || `notif-${Date.now()}` }, ...stored];
  writeStoredNotifications(next);
  return { success: true, data: next };
}
