import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAuditLogEntry } from '../../services/leadService';
import Skeleton from '../../components/common/Skeleton';

const ACTION_LABEL_MAP = {
  'lead.exported': 'Lead Exported',
  'lead.assigned': 'Lead Assigned',
  'user.activated': 'User Activated',
  'user.deactivated': 'User Deactivated',
  'user.role_changed': 'User Role Changed',
  'lead.status_changed': 'Lead Status Changed',
  'lead.field_updated': 'Lead Field Updated',
};

function formatActionType(actionType) {
  if (!actionType) return '-';
  return ACTION_LABEL_MAP[actionType] || actionType;
}

function formatResult(res) {
  if (!res) return '-';
  return res.charAt(0).toUpperCase() + res.slice(1);
}

function formatEntity(entity) {
  if (!entity) return '-';
  return entity.charAt(0).toUpperCase() + entity.slice(1);
}

export default function AuditLogDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchAuditLogEntry(id)
      .then((res) => {
        if (res?.success && res.data) {
          setEntry(res.data);
        } else if (res?.data) {
          setEntry(res.data);
        } else {
          setError('Audit log entry not found.');
        }
      })
      .catch(() => setError('Failed to load audit log entry.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mt-4">
        <Skeleton width="120px" height="14px" rounded className="mb-4" />
        <div className="glass-card rounded-3xl p-6">
          <Skeleton width="200px" height="24px" rounded className="mb-4" />
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton width="100px" height="14px" rounded />
                <Skeleton width="200px" height="14px" rounded />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4">
        <p className="font-body-md text-body-md text-error">{error}</p>
        <button
          onClick={() => navigate('/admin/audit-logs')}
          className="mt-4 px-4 py-2 rounded-xl bg-primary text-white font-label-sm text-label-sm"
        >
          Back to Audit Logs
        </button>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="mt-4">
        <p className="font-body-md text-body-md text-on-surface-variant">Audit log entry not found.</p>
        <button
          onClick={() => navigate('/admin/audit-logs')}
          className="mt-4 px-4 py-2 rounded-xl bg-primary text-white font-label-sm text-label-sm"
        >
          Back to Audit Logs
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        onClick={() => navigate('/admin/audit-logs')}
        className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface transition-colors font-label-md text-label-md mb-4"
      >
        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        Back to Audit Logs
      </button>

      <div className="glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />

        <h2 className="font-headline-md text-headline-md text-on-surface mb-6">Audit Log Detail</h2>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
            <dt className="text-label-sm font-label-sm text-on-surface-variant mb-1">Action Type</dt>
            <dd className="font-body-md text-body-md text-on-surface">{formatActionType(entry.action_type || entry.action)}</dd>
          </div>
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
            <dt className="text-label-sm font-label-sm text-on-surface-variant mb-1">Entity</dt>
            <dd className="font-body-md text-body-md text-on-surface">{formatEntity(entry.entity_affected || entry.entity || entry.resource || entry.resource_type)}</dd>
          </div>
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
            <dt className="text-label-sm font-label-sm text-on-surface-variant mb-1">Entity ID</dt>
            <dd className="font-body-md text-body-md text-on-surface">{entry.entity_id || entry.entityId || entry.resource_id || entry.resourceId || '-'}</dd>
          </div>
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
            <dt className="text-label-sm font-label-sm text-on-surface-variant mb-1">Actor</dt>
            <dd className="font-body-md text-body-md text-on-surface">
              {(() => {
                const actorName = entry.actor?.name || entry.performed_by?.name || (typeof entry.actor === 'string' ? entry.actor : '') || entry.user_name || entry.email || entry.user || '';
                const actorRole = entry.actor?.role || entry.performed_by?.role || '';
                return actorName ? `${actorName}${actorRole ? ` (${actorRole})` : ''}` : '-';
              })()}
            </dd>
          </div>
          {entry.result && (
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <dt className="text-label-sm font-label-sm text-on-surface-variant mb-1">Result</dt>
              <dd className="font-body-md text-body-md text-on-surface">{formatResult(entry.result)}</dd>
            </div>
          )}
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
            <dt className="text-label-sm font-label-sm text-on-surface-variant mb-1">IP Address</dt>
            <dd className="font-body-md text-body-md text-on-surface">{entry.ip_address || entry.ip || '-'}</dd>
          </div>
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
            <dt className="text-label-sm font-label-sm text-on-surface-variant mb-1">Timestamp</dt>
            <dd className="font-body-md text-body-md text-on-surface">{new Date(entry.created_at || entry.createdAt || entry.timestamp).toLocaleString()}</dd>
          </div>
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 md:col-span-2">
            <dt className="text-label-sm font-label-sm text-on-surface-variant mb-1">Details</dt>
            <dd className="font-body-md text-body-md text-on-surface whitespace-pre-wrap">{entry.details || entry.description || '-'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
