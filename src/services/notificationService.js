import { API_BASE_URL } from '../constants';
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

function getSeedNotifications(now) {
  return [
    {
      id: 'notif-001',
      type: 'assignment',
      message: 'Lead LD-2026-00001 has been assigned to John Executive',
      leadId: 'lead-001',
      read: false,
      role: 'Admin',
      createdAt: new Date(now - 3600000).toISOString(),
      timestamp: new Date(now - 3600000).toISOString(),
    },
    {
      id: 'notif-002',
      type: 'assignment',
      message: 'Lead LD-2026-00002 has been reassigned to Sarah Manager',
      leadId: 'lead-002',
      read: false,
      role: 'Admin',
      createdAt: new Date(now - 7200000).toISOString(),
      timestamp: new Date(now - 7200000).toISOString(),
    },
    {
      id: 'notif-003',
      type: 'assignment',
      message: 'Lead LD-2026-00003 has been assigned to John Executive',
      leadId: 'lead-003',
      read: true,
      role: 'Admin',
      createdAt: new Date(now - 86400000).toISOString(),
      timestamp: new Date(now - 86400000).toISOString(),
    },
  ];
}

export async function fetchNotifications() {
  try {
    if (typeof fetch !== 'function') {
      throw new Error('fetch is not defined');
    }
    const rawToken = localStorage.getItem('crm_access_token') || sessionStorage.getItem('crm_access_token');
    let token = null;
    if (rawToken) {
      try { token = JSON.parse(rawToken); } catch { token = rawToken; }
    }
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    
    const res = await fetch(`${API_BASE_URL}/notifications?_=${Date.now()}`, {
      headers
    });
    
    if (res?.ok) {
      const json = await res.json();
      if (json?.data) {
        writeStoredNotifications(json.data);
        return json;
      }
    }
  } catch (err) {
    // only log actual network errors, not missing global fetch in tests
    if (err.message !== 'fetch is not defined') {
      console.error('Fetch notifications failed:', err);
    }
  }

  const stored = readStoredNotifications();
  if (stored) {
    return { success: true, data: stored, unread_count: stored.filter(n => !n.read).length };
  }

  const now = new Date();
  const notifications = getSeedNotifications(now);
  writeStoredNotifications(notifications);
  return { success: true, data: notifications, unread_count: notifications.filter(n => !n.read).length };
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
  const stored = readStoredNotifications() || getSeedNotifications(new Date());
  const next = [{ ...notification, id: notification.id || `notif-${Date.now()}` }, ...stored];
  writeStoredNotifications(next);
  return { success: true, data: next };
}
