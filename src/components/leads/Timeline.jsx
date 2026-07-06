import { useState, useMemo } from 'react';

const FOLLOWUP_TYPE_ICONS = {
  'Call': 'phone',
  'WhatsApp': 'chat',
  'Email': 'mail',
  'Online Meeting': 'videocam',
  'Client Meeting': 'groups',
  'Demo': 'smart_display',
  'Proposal Discussion': 'description',
};

const OUTCOME_VARIANTS = {
  'Interested': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  'Need More Info': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  'Proposal Requested': { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
  'Budget Discussion': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  'Decision Pending': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  'Not Interested': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
};

const OUTCOME_DEFAULT = { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };

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

function getRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return formatDate(dateStr);
}

function formatCurrency(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getTimelineMeta(type, followupType) {
  if (type === 'followup' && followupType) {
    const icon = FOLLOWUP_TYPE_ICONS[followupType] || 'note';
    return { icon, bg: 'bg-blue-500/10', color: 'text-blue-600' };
  }
  const lower = (type || '').toLowerCase();
  if (lower.includes('created')) return { icon: 'add_circle', bg: 'bg-green-500/10', color: 'text-green-600' };
  if (lower.includes('status') || lower.includes('changed')) return { icon: 'sync', bg: 'bg-amber-500/10', color: 'text-amber-600' };
  if (lower.includes('assign')) return { icon: 'assignment', bg: 'bg-purple-500/10', color: 'text-purple-600' };
  return { icon: 'history', bg: 'bg-primary/5', color: 'text-primary' };
}

function SkeletonCard() {
  return (
    <div className="flex items-start gap-3 p-3 bg-white/30 rounded-xl border border-outline-variant/20 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
      </div>
    </div>
  );
}

function TimelineCard({ entry, idx, currentUserId, isReadOnly, isAdmin, onAddCorrection }) {
  const entryType = entry.type || (entry.followup_type ? 'followup' : '');
  const entryAction = entry.action || entry.message || entry.description || '';
  const meta = entryType === 'followup'
    ? getTimelineMeta('followup', entry.followup_type)
    : getTimelineMeta(entryType || entryAction);

  const userName = entry.created_by?.name || entry.user || entry.createdBy?.name || entry.createdBy || '';
  const timestamp = entry.created_at || entry.createdAt || entry.timestamp || '';
  const creatorId = entry.created_by?.id || entry.createdById || '';
  const isOwnFollowup = creatorId === currentUserId;

  const outcomeVariant = OUTCOME_VARIANTS[entry.outcome] || OUTCOME_DEFAULT;

  const notes = entry.notes || '';
  const proposalAmount = entry.proposal_amount ?? entry.proposalAmount;
  const correctionNotes = entry.correction_notes || entry.correctionNotes;
  const correctionBy = entry.correction_by?.name || entry.correctionByName || '';
  const correctionAt = entry.correction_at || entry.correctionAt;
  const stageAtLog = entry.stage_at_log || entry.stageAtLog;

  const [showFullNotes, setShowFullNotes] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [correctionSaving, setCorrectionSaving] = useState(false);
  const [correctionError, setCorrectionError] = useState('');

  const notesTruncated = notes.length > 100;
  const displayNotes = showFullNotes ? notes : notes.slice(0, 100);

  async function handleSaveCorrection() {
    const trimmed = correctionText.trim();
    if (!trimmed) {
      setCorrectionError('Correction notes cannot be empty.');
      return;
    }
    setCorrectionSaving(true);
    setCorrectionError('');
    try {
      await onAddCorrection(entry.id, trimmed);
      setCorrectionOpen(false);
      setCorrectionText('');
    } catch {
      setCorrectionError('Failed to save correction. Please try again.');
    } finally {
      setCorrectionSaving(false);
    }
  }

  const showAddCorrection = entryType === 'followup' && !isReadOnly && (isOwnFollowup || isAdmin) && !correctionOpen;

  return (
    <div
      key={entry.id || entry._id || idx}
      className="flex items-start gap-3 p-3 bg-white/30 rounded-xl border border-outline-variant/20"
    >
      <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center shrink-0`}>
        <span className={`material-symbols-outlined text-[18px] ${meta.color}`} aria-hidden="true">
          {meta.icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {entry.followup_type && (
            <span className="font-body-md text-body-md text-on-surface font-medium">
              {entry.followup_type}
            </span>
          )}
          {entry.outcome && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-xs font-label-xs border ${outcomeVariant.bg} ${outcomeVariant.text} ${outcomeVariant.border}`}>
              {entry.outcome}
            </span>
          )}
          {entryType === 'followup' && !entry.followup_type && (
            <span className="font-body-md text-body-md text-on-surface">Follow-up</span>
          )}
          {entryType !== 'followup' && entryAction && (
            <span className="font-body-md text-body-md text-on-surface">{entryAction}</span>
          )}
        </div>
        {entryType !== 'followup' && entry.message && entry.message !== entryAction && (
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">{entry.message}</p>
        )}

        {entryType === 'followup' && notes && (
          <div className="mt-1.5">
            <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-wrap">
              {displayNotes}
              {notesTruncated && !showFullNotes && '...'}
            </p>
            {notesTruncated && (
              <button
                onClick={() => setShowFullNotes(!showFullNotes)}
                className="text-label-sm font-label-sm text-primary hover:underline mt-0.5"
              >
                {showFullNotes ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {entryType === 'followup' && !notes && (
          <p className="font-label-sm text-label-sm text-on-surface-variant/50 mt-1 italic">No notes</p>
        )}

        {entryType === 'followup' && proposalAmount !== null && proposalAmount !== undefined && (
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
            Proposal Amount: <span className="font-medium text-on-surface">{formatCurrency(proposalAmount)}</span>
          </p>
        )}

        {stageAtLog && (
          <p className="font-label-sm text-label-sm text-on-surface-variant/50 mt-0.5">
            Stage at log: {stageAtLog}
          </p>
        )}

        {correctionNotes && (
          <div className="mt-2 pt-2 border-t border-dashed border-outline-variant/40 bg-amber-50/50 rounded-lg p-2">
            <p className="font-label-sm text-label-sm text-amber-800 italic">
              Correction added by {correctionBy || 'Unknown'}{correctionAt ? ` on ${formatDate(correctionAt)}` : ''}: {correctionNotes}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <p className="font-label-sm text-label-sm text-on-surface-variant/70">
            {userName && <span>by {userName}</span>}
            {timestamp && (
              <span title={formatDate(timestamp)} className="cursor-help">
                {' '}{getRelativeTime(timestamp)}
              </span>
            )}
          </p>

          {showAddCorrection && (
            <button
              onClick={() => setCorrectionOpen(true)}
              className="text-label-sm font-label-sm text-primary hover:underline"
            >
              Add Correction
            </button>
          )}
        </div>

        {correctionOpen && (
          <div className="mt-2 space-y-2">
            <textarea
              value={correctionText}
              onChange={(e) => { setCorrectionText(e.target.value); setCorrectionError(''); }}
              placeholder="Enter correction notes..."
              className={`w-full bg-white/50 border rounded-xl py-2 px-3 font-body-md text-body-md text-on-surface transition-all focus:outline-none input-focus-effect resize-none min-h-[60px] ${
                correctionError ? 'border-error' : 'border-outline-variant'
              }`}
              rows={2}
            />
            {correctionError && (
              <p className="text-label-sm font-label-sm text-error" role="alert">{correctionError}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveCorrection}
                disabled={correctionSaving}
                className="px-3 py-1.5 rounded-xl bg-primary text-white text-label-sm font-label-sm hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center gap-1"
              >
                {correctionSaving ? (
                  <>
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : 'Save Correction'}
              </button>
              <button
                onClick={() => { setCorrectionOpen(false); setCorrectionText(''); setCorrectionError(''); }}
                disabled={correctionSaving}
                className="px-3 py-1.5 rounded-xl border border-outline-variant text-label-sm font-label-sm text-on-surface hover:bg-white/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {entryType !== 'followup' && entryAction && (
          <p className="font-label-sm text-label-sm text-on-surface-variant/70 mt-0.5">
            {userName && <span>By: {userName}</span>}
            {timestamp && <span> on {formatDate(timestamp)}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Timeline({
  timeline,
  loading,
  hasMore,
  onLoadMore,
  loadingMore,
  currentUserId,
  isAdmin,
  isReadOnly,
  isLeadOwner,
  onAddCorrection,
  emptyMessage = 'No follow-up activity logged yet.',
  showLogFollowUpButton = false,
  onLogFollowUp,
}) {
  const sortedTimeline = useMemo(() => {
    const sorted = [...(timeline || [])].sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || a.timestamp || 0).getTime();
      const dateB = new Date(b.created_at || b.createdAt || b.timestamp || 0).getTime();
      if (dateB === dateA) {
        return (b.id || '').localeCompare(a.id || '');
      }
      return dateB - dateA;
    });
    return sorted;
  }, [timeline]);

  const canLogFollowUp = !isReadOnly && (isLeadOwner || isAdmin);

  if (loading) {
    return (
      <div className="space-y-3" data-testid="timeline-loading">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!sortedTimeline || sortedTimeline.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-3">
          timeline
        </span>
        <p className="font-body-md text-body-md text-on-surface-variant/70">
          {emptyMessage}
        </p>
        <p className="font-label-sm text-label-sm text-on-surface-variant/50 mt-1">
          Log a follow-up to document client interactions.
        </p>
        {showLogFollowUpButton && canLogFollowUp && (
          <button
            onClick={onLogFollowUp}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white font-label-sm text-label-sm hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Log Follow-up
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedTimeline.map((entry, idx) => (
        <TimelineCard
          key={entry.id || entry._id || idx}
          entry={entry}
          idx={idx}
          currentUserId={currentUserId}
          isReadOnly={isReadOnly}
          isAdmin={isAdmin}
          onAddCorrection={onAddCorrection}
        />
      ))}

      {hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-sm font-label-sm text-primary hover:bg-primary/5 border border-primary/20 transition-all disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </>
            ) : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
