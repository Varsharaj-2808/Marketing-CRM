export async function fetchNotifications() {
  const now = new Date();
  return {
    success: true,
    data: [
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
    ],
  };
}

export async function markNotificationRead(_notificationId) {
  return { success: true };
}
