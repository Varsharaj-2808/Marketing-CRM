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
      const payload = json.data;
      if (payload.notifications && Array.isArray(payload.notifications)) {
        writeStoredNotifications(payload.notifications);
        return { success: true, data: payload.notifications, unread_count: payload.unread_count || 0 };
      }
      if (Array.isArray(payload)) {
        writeStoredNotifications(payload);
        return { success: true, data: payload, unread_count: json.unread_count || 0 };
      }
    }
  } catch {}

  const stored = readStoredNotifications();
  if (stored) {
    return { success: true, data: stored, unread_count: stored.filter(n => !n.is_read && !n.read).length };
  }

  return { success: true, data: [], unread_count: 0 };
}

export async function markNotificationRead(notificationId) {
  try {
    await apiClient(`/notifications/${notificationId}/read`, { method: 'PUT' });
  } catch {}

  const stored = readStoredNotifications();
  if (stored) {
    const next = stored.map((notification) => (
      notification.id === notificationId ? { ...notification, is_read: true, read: true } : notification
    ));
    writeStoredNotifications(next);
    return { success: true, data: next };
  }
  return { success: true };
}

export async function markAllNotificationsRead() {
  try {
    await apiClient('/notifications/read-all', { method: 'PUT' });
  } catch {}

  const stored = readStoredNotifications();
  if (stored) {
    const next = stored.map((n) => ({ ...n, is_read: true, read: true }));
    writeStoredNotifications(next);
    return { success: true, data: next };
  }
  return { success: true };
}

export async function addNotification(notification) {
  const stored = readStoredNotifications() || [];
  const next = [{ ...notification, id: notification.id || `notif-${Date.now()}` }, ...stored];
  writeStoredNotifications(next);
  return { success: true, data: next };
}
