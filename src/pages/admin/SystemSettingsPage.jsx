import { useState, useEffect } from 'react';
import { fetchRetentionSettings, updateRetentionSettings } from '../../services/leadService';
import Toast from '../../components/common/Toast';

export default function SystemSettingsPage() {
  const [retentionValue, setRetentionValue] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Toast state
  const [toastShow, setToastShow] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await fetchRetentionSettings();
        if (active) {
          if (res?.success && res.data) {
            setRetentionValue(res.data.value || '');
            setDescription(res.data.description || '');
          } else {
            setLoadError('Failed to load retention settings');
          }
        }
      } catch (err) {
        if (active) {
          setLoadError('Failed to load retention settings');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadSettings();
    return () => { active = false; };
  }, []);

  const handleSave = async () => {
    setValidationError(null);

    // Validation checks: must be a positive integer
    const isPositiveInteger = /^[1-9]\d*$/.test(retentionValue.trim());
    if (!isPositiveInteger) {
      setValidationError('Retention period must be a positive integer (months)');
      return;
    }

    try {
      setSaving(true);
      const res = await updateRetentionSettings(retentionValue.trim());
      if (res?.success) {
        setToastMessage('Retention policy updated successfully');
        setToastShow(true);
        if (res.data) {
          setRetentionValue(res.data.value || retentionValue);
        }
      } else {
        setValidationError(res?.message || 'Failed to update retention policy');
      }
    } catch (err) {
      setValidationError(err?.payload?.message || err?.message || 'Failed to update retention settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4">
      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type="success"
        show={toastShow}
        onClose={() => setToastShow(false)}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 mb-6">
        <div>
          <nav className="flex items-center gap-1 text-label-sm text-on-surface-variant/60 mb-1">
            <span>Admin</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>System Settings</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-bold">Retention Policy</span>
          </nav>
          <h1 className="font-headline-lg text-on-surface">System Settings</h1>
          <p className="font-body-md text-on-surface-variant mt-1">
            Manage data retention and archival policies for system audit logs.
          </p>
        </div>
      </div>

      {/* Loading error banner */}
      {loadError && (
        <div className="mb-4 p-4 rounded-xl bg-error-container text-on-error-container border border-error/10 font-body-md flex items-center gap-2">
          <span className="material-symbols-outlined">warning</span>
          <span>{loadError}</span>
        </div>
      )}

      {/* Validation error message */}
      {validationError && (
        <div className="mb-4 p-4 rounded-xl bg-error-container text-on-error-container border border-error/10 font-body-md flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          <span className="font-medium">{validationError}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="glass-card rounded-3xl p-6 md:p-8 max-w-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary" />

        <h3 className="font-headline-md text-on-surface mb-6">Audit Log Retention Configuration</h3>

        {loading ? (
          <div className="space-y-4">
            <div className="h-4 bg-outline-variant/10 rounded w-1/4 animate-pulse" />
            <div className="h-10 bg-outline-variant/10 rounded w-full animate-pulse" />
            <div className="h-4 bg-outline-variant/10 rounded w-1/2 animate-pulse" />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label htmlFor="retention-period" className="block font-label-md text-on-surface mb-2 font-semibold">
                Audit Log Retention (Months)
              </label>
              <input
                id="retention-period"
                type="text"
                value={retentionValue}
                onChange={(e) => setRetentionValue(e.target.value)}
                placeholder="Enter retention period in months"
                disabled={!!loadError}
                className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-xl px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none disabled:opacity-50"
              />
              {description && (
                <p className="text-label-sm text-on-surface-variant/70 mt-2">
                  {description}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-outline-variant/10 flex justify-end gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !!loadError}
                className="px-5 py-2.5 bg-primary text-white rounded-xl font-label-sm shadow hover:bg-primary-hover active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none transition-all"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
