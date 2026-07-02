import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchLeadById,
  fetchAdminLeadById,
  fetchLeadHistory,
  assignLead,
  updateLeadStage,
  closeLeadAsLost,
  closeLeadAsWon,
  reopenLead,
} from '../../services/leadService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Badge from '../../components/common/Badge';
import Toast from '../../components/common/Toast';
import AssignLeadModal from '../../components/leads/AssignLeadModal';
import StageControl from '../../components/leads/StageControl';
import LostClosureModal from '../../components/leads/LostClosureModal';
import WonClosureModal from '../../components/leads/WonClosureModal';
import ReopenLeadModal from '../../components/leads/ReopenLeadModal';
import { getLeadField, toDisplayText } from '../../utils/leadDisplay';

const STATUS_MAP = {
  Won: 'converted',
  Lost: 'lost',
};

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

function getTimelineMeta(action) {
  const lower = (action || '').toLowerCase();
  if (lower.includes('created')) return { icon: 'add_circle', bg: 'bg-green-500/10', color: 'text-green-600' };
  if (lower.includes('status') || lower.includes('changed')) return { icon: 'sync', bg: 'bg-amber-500/10', color: 'text-amber-600' };
  if (lower.includes('note') || lower.includes('comment')) return { icon: 'note', bg: 'bg-blue-500/10', color: 'text-blue-600' };
  if (lower.includes('assign') || lower.includes('reassign')) return { icon: 'assignment', bg: 'bg-purple-500/10', color: 'text-purple-600' };
  return { icon: 'history', bg: 'bg-primary/5', color: 'text-primary' };
}

export default function LeadDetails() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdmin = user?.role === 'Admin';

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [stageLoading, setStageLoading] = useState(false);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [wonModalOpen, setWonModalOpen] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [toastShow, setToastShow] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  function loadLeadData(fromMutation) {
    setLoading(true);
    setTimeline([]);
    setAccessDenied(false);
    setErrorMessage('');
    const leadFetcher = isAdminRoute ? fetchAdminLeadById : fetchLeadById;
    const cacheBuster = fromMutation ? Date.now() : null;
    leadFetcher(leadId, cacheBuster)
      .then((res) => {
        const leadData = res?.data || res?.lead || res || null;
        setLead(leadData);

        if (leadData?.timeline && leadData.timeline.length > 0) {
          setTimeline(leadData.timeline);
        } else if (leadData) {
          setHistoryLoading(true);
          fetchLeadHistory(leadId)
            .then((historyRes) => {
              const historyData = historyRes?.data || [];
              if (historyData.length > 0) {
                setTimeline(historyData);
              } else if (leadData.createdAt) {
                const userName = typeof leadData.createdBy === 'object' ? leadData.createdBy?.name : leadData.createdBy;
                setTimeline([{
                  action: 'Lead Created',
                  message: 'Lead Created',
                  user: userName || '',
                  createdBy: leadData.createdBy,
                  createdAt: leadData.createdAt,
                  timestamp: leadData.createdAt,
                }]);
              }
            })
            .catch(() => {
              if (leadData.createdAt) {
                const userName = typeof leadData.createdBy === 'object' ? leadData.createdBy?.name : leadData.createdBy;
                setTimeline([{
                  action: 'Lead Created',
                  message: 'Lead Created',
                  user: userName || '',
                  createdBy: leadData.createdBy,
                  createdAt: leadData.createdAt,
                  timestamp: leadData.createdAt,
                }]);
              }
            })
            .finally(() => setHistoryLoading(false));
        }
      })
      .catch((err) => {
        if (err?.status === 403) {
          setAccessDenied(true);
        } else if (err?.status === 404) {
          setErrorMessage('Lead not found.');
        } else {
          setErrorMessage('Failed to load lead.');
        }
        setLead(null);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (leadId) loadLeadData(false);
  }, [leadId, isAdmin, user]);

  async function handleAssign(assignedTo, reason, userName) {
    setAssigning(true);
    const hasOwner = !!(lead?.assignedTo ?? lead?.assigned_to);
    try {
      await assignLead(leadId, assignedTo, reason);
      setAssignModalOpen(false);
      setToastMessage(hasOwner ? `Lead reassigned to ${userName}` : `Lead assigned to ${userName}`);
      setToastType('success');
      setToastShow(true);
      loadLeadData(true);
    } catch (err) {
      if (err?.status === 404) {
        setAssignModalOpen(false);
        setToastMessage('Lead not found. It may have been deleted.');
        setToastType('error');
        setToastShow(true);
        navigate(isAdminRoute ? '/admin/leads' : '/marketing/leads');
      } else {
        setToastMessage('Failed to assign lead. Please try again.');
        setToastType('error');
        setToastShow(true);
      }
    } finally {
      setAssigning(false);
    }
  }

  async function handleStageChange(event) {
    const nextStage = event.target.value;
    if (!nextStage || nextStage === lead.stage) return;
    if (nextStage === 'Lost') {
      setLostModalOpen(true);
      return;
    }
    setStageLoading(true);
    try {
      await updateLeadStage(leadId, nextStage);
      setToastMessage(`Stage updated to ${nextStage}`);
      setToastType('success');
      setToastShow(true);
      loadLeadData(true);
    } catch {
      setToastMessage('Failed to update stage. Please try again.');
      setToastType('error');
      setToastShow(true);
    } finally {
      setStageLoading(false);
    }
  }

  async function handleCloseAsWon() {
    setWonModalOpen(true);
  }

  async function handleLostConfirm(reason) {
    setStageLoading(true);
    try {
      await closeLeadAsLost(leadId, reason);
      setLostModalOpen(false);
      setToastMessage('Lead closed as Lost');
      setToastType('success');
      setToastShow(true);
      loadLeadData(true);
    } catch {
      setLostModalOpen(false);
      setToastMessage('Failed to close lead. Please try again.');
      setToastType('error');
      setToastShow(true);
    } finally {
      setStageLoading(false);
    }
  }

  async function handleWonConfirm(dealValue, closureDate) {
    setStageLoading(true);
    try {
      await closeLeadAsWon(leadId, dealValue, closureDate);
      setWonModalOpen(false);
      setToastMessage('Lead closed as Won');
      setToastType('success');
      setToastShow(true);
      loadLeadData(true);
    } catch {
      setWonModalOpen(false);
      setToastMessage('Failed to close lead. Please try again.');
      setToastType('error');
      setToastShow(true);
    } finally {
      setStageLoading(false);
    }
  }

  async function handleReopenConfirm(reason) {
    setStageLoading(true);
    try {
      await reopenLead(leadId, reason);
      setReopenModalOpen(false);
      setToastMessage('Lead reopened successfully. Stage set to Contacted.');
      setToastType('success');
      setToastShow(true);
      loadLeadData(true);
    } catch {
      setReopenModalOpen(false);
      setToastMessage('Failed to reopen lead. Please try again.');
      setToastType('error');
      setToastShow(true);
    } finally {
      setStageLoading(false);
    }
  }

  const sortedTimeline = [...timeline].sort((a, b) => {
    const dateA = new Date(a.timestamp || a.createdAt || 0).getTime();
    const dateB = new Date(b.timestamp || b.createdAt || 0).getTime();
    return dateB - dateA;
  });
  const leadStatus = getLeadField(lead, ['status'], 'New');
  const leadPriority = getLeadField(lead, ['priority'], '-');
  const servicesInterested = Array.isArray(lead?.servicesInterested)
    ? lead.servicesInterested
    : Array.isArray(lead?.services_interested)
      ? lead.services_interested
      : [];

  const assignedToDisplay = toDisplayText(lead?.assignedTo ?? lead?.assigned_to, 'Unassigned');
  const assignedAtVal = lead?.assignedAt || lead?.assigned_at || lead?.updatedAt || lead?.updated_at || '';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <button
        onClick={() => navigate(isAdminRoute ? '/admin/leads' : '/marketing/leads')}
        className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface transition-colors font-label-md text-label-md mb-3"
      >
        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        Back to Leads
      </button>

      {loading ? (
        <LoadingSpinner text="Loading lead details..." />
      ) : accessDenied ? (
        <div className="glass-card rounded-3xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />
          <p className="font-headline-md text-headline-md text-error">
            Access Denied
          </p>
        </div>
      ) : errorMessage || !lead ? (
        <div className="glass-card rounded-3xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />
          <p className="font-body-md text-body-md text-on-surface-variant">
            {errorMessage || 'Lead not found.'}
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Lead Details
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant/70">
                {getLeadField(lead, ['leadId', 'lead_id', 'id'], `LD-${leadId}`)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={STATUS_MAP[leadStatus] || 'new'}>
                {leadStatus}
              </Badge>
              {isAdmin && (
                <button
                  onClick={() => setAssignModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white font-label-sm text-label-sm hover:bg-primary/90 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                  {assignedToDisplay === 'Unassigned' ? 'Assign' : 'Reassign'}
                </button>
              )}
            </div>
          </div>

          <div className="mb-6">
            <StageControl
              currentStage={getLeadField(lead, ['stage'], 'New')}
              currentStatus={getLeadField(lead, ['status'], '')}
              isAdmin={isAdmin}
              onStageChange={handleStageChange}
              onCloseAsWon={handleCloseAsWon}
              onOpenReopen={() => setReopenModalOpen(true)}
              disabled={stageLoading}
              loading={stageLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Company Name</p>
              <p className="font-body-md text-body-md text-on-surface">{getLeadField(lead, ['companyName', 'company_name', 'company'], '-')}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Website</p>
              <p className="font-body-md text-body-md text-on-surface">{getLeadField(lead, ['website'], '-')}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Contact Person</p>
              <p className="font-body-md text-body-md text-on-surface">{getLeadField(lead, ['contactPerson', 'contact_person', 'contactName'], '-')}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Mobile Number</p>
              <p className="font-body-md text-body-md text-on-surface">{getLeadField(lead, ['mobileNumber', 'mobile_number', 'mobile', 'phone'], '-')}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Email</p>
              <p className="font-body-md text-body-md text-on-surface">{getLeadField(lead, ['email'], '-')}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">City</p>
              <p className="font-body-md text-body-md text-on-surface">{getLeadField(lead, ['city'], '-')}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Lead Source</p>
              <p className="font-body-md text-body-md text-on-surface">{getLeadField(lead, ['source', 'leadSource', 'lead_source'], '-')}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Priority</p>
              <p className="font-body-md text-body-md text-on-surface">
                <Badge variant={leadPriority.toLowerCase?.() || 'new'}>
                  {leadPriority}
                </Badge>
              </p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Estimated Value</p>
              <p className="font-body-md text-body-md text-on-surface">{getLeadField(lead, ['estimatedValue', 'estimated_value', 'value'], '-')}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Assigned To</p>
              <p className="font-body-md text-body-md text-on-surface">{assignedToDisplay}</p>
            </div>
            {assignedAtVal && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Assigned At</p>
                <p className="font-body-md text-body-md text-on-surface">{formatDate(assignedAtVal)}</p>
              </div>
            )}
          </div>

          {servicesInterested.length > 0 && (
            <div className="mt-6">
              <h3 className="font-label-md text-label-md text-on-surface-variant mb-2">Services Interested</h3>
              <div className="flex flex-wrap gap-2">
                {servicesInterested.map((svc, index) => (
                  <span
                    key={`${toDisplayText(svc, 'service')}-${index}`}
                    className="px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-xl text-label-sm font-label-sm text-primary"
                  >
                    {toDisplayText(svc, '-')}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-outline-variant/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Timeline
              </h3>
              <button
                onClick={() => navigate(`${isAdminRoute ? '/admin' : '/marketing'}/leads/${leadId}/lead-history`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-label-sm font-label-sm text-primary hover:bg-primary/5 border border-primary/20 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">history</span>
                View Full History
              </button>
            </div>
            {historyLoading ? (
              <LoadingSpinner text="Loading history..." />
            ) : sortedTimeline.length > 0 ? (
              <div className="space-y-3">
                {sortedTimeline.map((entry, idx) => {
                  const entryAction = toDisplayText(entry.action || entry.message || entry.description, 'Lead Updated');
                  const entryUser = toDisplayText(entry.user || entry.createdBy, '');
                  const entryTime = toDisplayText(entry.timestamp || entry.createdAt, '');
                  const meta = getTimelineMeta(entryAction);

                  const previousOwner = entry.previousOwner || entry.previous_owner || entry.oldOwner || '';
                  const newOwner = entry.newOwner || entry.new_owner || '';
                  const reasonText = entry.reason || '';

                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-white/30 rounded-xl border border-outline-variant/20"
                    >
                      <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center shrink-0`}>
                        <span className={`material-symbols-outlined text-[18px] ${meta.color}`}>
                          {meta.icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body-md text-body-md text-on-surface">
                          {entryAction}
                        </p>
                        {previousOwner && newOwner && (
                          <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                            {toDisplayText(previousOwner, '')} &rarr; {toDisplayText(newOwner, '')}
                          </p>
                        )}
                        {reasonText && (
                          <p className="font-label-sm text-label-sm text-on-surface-variant/70 mt-0.5 italic">
                            Reason: {toDisplayText(reasonText, '')}
                          </p>
                        )}
                        <p className="font-label-sm text-label-sm text-on-surface-variant/70 mt-0.5">
                          {entryUser && (
                            <>By: {entryUser}</>
                          )}
                          {entryTime && (
                            <> on {formatDate(entryTime)}</>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-body-md text-body-md text-on-surface-variant/70">
                No history available.
              </p>
            )}
          </div>
        </div>
      )}

      <AssignLeadModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        lead={lead}
        onAssign={handleAssign}
        assigning={assigning}
      />

      <LostClosureModal
        isOpen={lostModalOpen}
        onClose={() => setLostModalOpen(false)}
        onConfirm={handleLostConfirm}
        loading={stageLoading}
      />

      <WonClosureModal
        isOpen={wonModalOpen}
        onClose={() => setWonModalOpen(false)}
        onConfirm={handleWonConfirm}
        loading={stageLoading}
      />

      <ReopenLeadModal
        isOpen={reopenModalOpen}
        onClose={() => setReopenModalOpen(false)}
        onConfirm={handleReopenConfirm}
        loading={stageLoading}
        closedStage={getLeadField(lead, ['status'], 'Closed')}
      />

      <Toast
        message={toastMessage}
        type={toastType}
        show={toastShow}
        onClose={() => setToastShow(false)}
      />
    </div>
  );
}
