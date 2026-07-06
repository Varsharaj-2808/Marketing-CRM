import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications, markNotificationRead } from '../../services/notificationService';
import { toDisplayText } from '../../utils/leadDisplay';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS[d.getMonth()] || 'Jan';
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    fetchNotifications().then((res) => {
      const data = res?.data || [];
      setNotifications(Array.isArray(data) ? data : []);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    if (dropdownOpen) {
      // Focus the first notification button in dropdown
      setTimeout(() => {
        const firstBtn = dropdownRef.current?.querySelector('button.notification-item');
        if (firstBtn) {
          firstBtn.focus();
        }
      }, 50);
    }
  }, [dropdownOpen]);

  async function handleNotificationClick(notification) {
    const leadId = notification.leadId || notification.lead_id || notification.resourceId || notification.reference_id;
    if (leadId) {
      // Let's decide admin path based on window location or notification role
      const isAdminRoute = window.location.pathname.startsWith('/admin') || notification.role === 'Admin';
      navigate(`${isAdminRoute ? '/admin' : '/marketing'}/leads/${leadId}`);
    }
    if (!notification.read) {
      await markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
    }
    setDropdownOpen(false);
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setDropdownOpen(false);
      bellRef.current?.focus();
    }
  };

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        ref={bellRef}
        onClick={() => setDropdownOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setDropdownOpen((prev) => !prev);
          }
        }}
        className="p-1.5 rounded-full hover:bg-primary/5 transition-colors relative"
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
        {unreadCount > 0 && (
          <span 
            aria-label={`${unreadCount} unread notifications`}
            className="absolute top-0.5 right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-error text-white text-[10px] font-bold rounded-full px-1 leading-none"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl bg-white shadow-xl border border-outline-variant/20 z-50 animate-fade-in-scale">
          <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-outline-variant/10 px-4 py-3">
            <h3 className="font-headline-md text-headline-md text-on-surface">Notifications</h3>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <span className="material-symbols-outlined text-[32px] text-on-surface-variant/30 mb-2">notifications_off</span>
              <p className="font-body-md text-body-md text-on-surface-variant/70">No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {notifications.map((n) => {
                const actionText = toDisplayText(n.message || n.action || n.description, '');
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-4 py-3 transition-colors hover:bg-primary/5 notification-item ${
                      !n.read ? 'bg-primary/[0.03]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        !n.read ? 'bg-primary/10' : 'bg-surface-container-high'
                      }`}>
                        <span className={`material-symbols-outlined text-[16px] ${
                          !n.read ? 'text-primary' : 'text-on-surface-variant'
                        }`}>
                          {n.type === 'assignment' ? 'assignment' : 'notifications'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-body-md text-body-md ${
                          !n.read ? 'text-on-surface font-semibold' : 'text-on-surface-variant'
                        }`}>
                          {actionText || 'Notification'}
                        </p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant/60 mt-0.5">
                          {formatDate(n.createdAt || n.timestamp)}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-error shrink-0 mt-1.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
