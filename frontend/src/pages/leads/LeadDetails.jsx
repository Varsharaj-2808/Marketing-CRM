import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchLeadById,
  fetchAdminLeadById,
  updateAdminLeadFull,
  updateAdminLeadPartial,
  deleteAdminLead,
  fetchLeadHistory,
  assignLead,
  updateLeadStage,
  closeLeadAsLost,
  closeLeadAsWon,
  reopenLead,
  createFollowup,
  fetchTimeline,
  addCorrection,
  queueOfflineFollowup,
  processOfflineQueue,
} from '../../services/leadService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Badge from '../../components/common/Badge';
import Toast from '../../components/common/Toast';
import AssignLeadModal from '../../components/leads/AssignLeadModal';
import EditLeadModal from '../../components/leads/EditLeadModal';
import DeleteLeadModal from '../../components/leads/DeleteLeadModal';
import StageControl from '../../components/leads/StageControl';
import LostClosureModal from '../../components/leads/LostClosureModal';
import WonClosureModal from '../../components/leads/WonClosureModal';
import ReopenLeadModal from '../../components/leads/ReopenLeadModal';
import FollowUpModal from '../../components/leads/FollowUpModal';
import Timeline from '../../components/leads/Timeline';
import FieldHistory from '../../components/leads/FieldHistory';
import { getLeadField, toDisplayText } from '../../utils/leadDisplay';

const STATUS_MAP = {
  Won: 'converted',
  Lost: 'lost',
};

const TIMELINE_INITIAL_COUNT = 20;
const TIMELINE_LOAD_MORE_COUNT = 20;
const SUBMIT_TIMEOUT_MS = 10000;

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateStr);
  }
}

function normalizeLeadDetail(leadData) {
  if (!leadData) return null;
  const progressStages = ['New', 'Contacted', 'Qualified', 'Meeting', 'Proposal', 'Negotiation', 'Closed', 'New Lead'];
  let status = leadData.lead_status || leadData.status || '';
  let stage = leadData.stage || leadData.leadStage || leadData.lead_stage || '';
  
  if (progressStages.includes(status) && !stage) {
    stage = status;
  }
  if (status === 'New Lead') {
    stage = 'New';
  }
  if (stage === 'New Lead') {
    stage = 'New';
  }

  const rawServices = leadData.servicesInterested ?? leadData.services_interested ?? leadData.service_interested ?? [];
  let servicesInterested = [];
  if (Array.isArray(rawServices)) {
    servicesInterested = rawServices;
  } else if (typeof rawServices === 'string') {
    try {
      const parsed = JSON.parse(rawServices);
      if (Array.isArray(parsed)) servicesInterested = parsed;
      else servicesInterested = [rawServices];
    } catch {
      servicesInterested = rawServices.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  
  return {
    ...leadData,
    status,
    stage: stage || 'New',
    servicesInterested,
    assignedTo: leadData.assignedTo ?? leadData.assigned_to ?? null,
    categoryName: leadData.category_name || leadData.categoryName || leadData.category || null,
    subCategoryName: leadData.sub_category_name || leadData.subCategoryName || leadData.subCategory || leadData.sub_category || null,
    nextFollowupDate: leadData.next_followup_date || leadData.nextFollowupDate || null,
    createdAt: leadData.created_at || leadData.createdAt || null,
    updatedAt: leadData.updated_at || leadData.updatedAt || null,
    finalDealValue: leadData.final_deal_value ?? leadData.finalDealValue ?? null,
    outcome: leadData.outcome || leadData.closure_reason || leadData.outcome_reason || null,
    closureDate: leadData.closure_date || leadData.closureDate || null,
    remarks: leadData.remarks || leadData.notes || null,
  };
}

export default function LeadDetails() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdmin = user?.role === 'Admin';
  const isReadOnly = user?.role === 'ReadOnly';
  const currentUserId = user?.id || user?.employee_id || '';

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timelineItems, setTimelineItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [timelinePagination, setTimelinePagination] = useState({ page: 1, totalPages: 1, has_more: false });
  const [timelinePage, setTimelinePage] = useState(1);
  const [loadingMoreTimeline, setLoadingMoreTimeline] = useState(false);

  const [activeFilter, setActiveFilter] = useState('all');
  const [timelineError, setTimelineError] = useState(false);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [updatingLead, setUpdatingLead] = useState(false);
  const [deletingLead, setDeletingLead] = useState(false);
  const [stageLoading, setStageLoading] = useState(false);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [wonModalOpen, setWonModalOpen] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);

  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [followUpServerError, setFollowUpServerError] = useState('');

  const [activeTab, setActiveTab] = useState('timeline');

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [toastShow, setToastShow] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const abortControllerRef = useRef(null);
  const followUpButtonRef = useRef(null);

  function showToast(message, type = 'success') {
    setToastMessage(message);
    setToastType(type);
    setToastShow(true);
  }

  const [categoriesMap, setCategoriesMap] = useState({});
  const [usersMap, setUsersMap] = useState({});

  useEffect(() => {
    import('../../services/leadService').then(({ fetchCategories, fetchUsers }) => {
      fetchCategories().then(res => {
        const list = res?.data?.categories || res?.data || [];
        if (Array.isArray(list)) {
          const map = {};
          list.forEach(c => map[c.id] = c.category_name || c.name);
          setCategoriesMap(map);
        }
      }).catch(() => {});
      fetchUsers().then(res => {
        const list = res?.data?.users || res?.data || [];
        if (Array.isArray(list)) {
          const map = {};
          list.forEach(u => map[u.id] = u);
          setUsersMap(map);
        }
      }).catch(() => {});
    });
  }, []);

  function loadLeadData(fromMutation) {
    setLoading(true);
    setTimelineItems([]);
    setAccessDenied(false);
    setErrorMessage('');
    setTimelinePage(1);
    setTimelinePagination({ page: 1, totalPages: 1, has_more: false });
    const leadFetcher = isAdminRoute ? fetchAdminLeadById : fetchLeadById;
    const cacheBuster = fromMutation ? Date.now() : null;
    leadFetcher(leadId, cacheBuster)
      .then((res) => {
        const leadData = res?.data || res?.lead || res || null;
        setLead(normalizeLeadDetail(leadData));
        loadTimeline(1, true, activeFilter);
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

  async function loadTimeline(page = 1, replace = false, filter = activeFilter) {
    if (page === 1) {
      setHistoryLoading(true);
      setTimelineError(false);
    } else {
      setLoadingMoreTimeline(true);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const queryParams = { page, limit: TIMELINE_INITIAL_COUNT, signal: controller.signal };
      if (filter !== 'all') {
        queryParams.type = filter;
      }
      const res = await fetchTimeline(leadId, queryParams);
      if (controller.signal.aborted) return;
      const data = res?.data || {};
      const newItems = data.timeline || [];
      
      const rawPagination = res?.pagination || data.pagination;
      const pagination = {
        page: rawPagination?.page ?? 1,
        totalPages: rawPagination?.totalPages ?? rawPagination?.total_pages ?? 1,
        totalCount: rawPagination?.totalCount ?? rawPagination?.total_count ?? 0,
        has_more: rawPagination?.has_more ?? rawPagination?.hasMore ?? false
      };
      
      if (replace) {
        setTimelineItems(newItems);
      } else {
        const prevLength = timelineItems.length;
        setTimelineItems(prev => [...prev, ...newItems]);
        
        setTimeout(() => {
          const firstNewCard = document.getElementById(`timeline-card-${prevLength}`);
          if (firstNewCard) {
            firstNewCard.focus();
          }
        }, 100);
      }
      setTimelinePagination(pagination);
      setTimelinePage(page);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      if (page === 1) {
        setTimelineError(true);
        const localLead = lead;
        if (localLead?.timeline && localLead.timeline.length > 0) {
          setTimelineItems(localLead.timeline);
        } else if (localLead?.createdAt) {
          const userName = typeof localLead.createdBy === 'object' ? localLead.createdBy?.name : localLead.createdBy;
          setTimelineItems([{
            action: 'Lead Created',
            message: 'Lead Created',
            user: userName || '',
            createdBy: localLead.createdBy,
            createdAt: localLead.createdAt,
            timestamp: localLead.createdAt,
          }]);
        }
      }
    } finally {
      setHistoryLoading(false);
      setLoadingMoreTimeline(false);
    }
  }

  useEffect(() => {
    if (leadId) loadLeadData(false);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [leadId, isAdmin, user, location.key]);

  useEffect(() => {
    function handleOnline() {
      processOfflineQueue();
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const isLeadOwner = useCallback(() => {
    if (!lead || !user) return false;
    const assigned = lead.assignedTo || lead.assigned_to || lead.assignedToId || '';
    if (!assigned) return false;

    const userId = user.id || user._id || '';
    const empId = user.employee_id || user.employeeId || '';
    const userName = user.name || user.employee_name || '';
    const userEmail = user.email || '';

    if (typeof assigned === 'object') {
      const aId = assigned.id || assigned._id || '';
      const aEmpId = assigned.employee_id || assigned.employeeId || '';
      const aName = assigned.name || assigned.employee_name || '';
      const aEmail = assigned.email || '';

      if (userId && (aId === userId || aEmpId === userId)) return true;
      if (empId && (aId === empId || aEmpId === empId)) return true;
      if (userName && aName && aName.toLowerCase() === userName.toLowerCase()) return true;
      if (userEmail && aEmail && aEmail.toLowerCase() === userEmail.toLowerCase()) return true;
      return false;
    }

    const strAssigned = String(assigned).trim();
    if (!strAssigned) return false;

    if (userId && strAssigned === String(userId)) return true;
    if (empId && strAssigned === String(empId)) return true;
    if (empId && strAssigned.includes(String(empId))) return true;
    if (userId && strAssigned.includes(String(userId))) return true;
    if (userName && strAssigned.toLowerCase().includes(userName.toLowerCase())) return true;
    if (userEmail && strAssigned.toLowerCase() === userEmail.toLowerCase()) return true;

    return false;
  }, [lead, user]);

  const canLogFollowUp = !isReadOnly && (isLeadOwner() || isAdmin) && !(lead?.status === 'Won' || lead?.status === 'Lost' || lead?.stage === 'Closed' || lead?.stage === 'Won' || lead?.stage === 'Lost');

  async function handleAssign(assignedTo, reason, userName) {
    setAssigning(true);
    const hasOwner = !!(lead?.assignedTo ?? lead?.assigned_to);
    try {
      await assignLead(leadId, assignedTo, reason);
      setAssignModalOpen(false);
      showToast(hasOwner ? `Lead reassigned to ${userName}` : `Lead assigned to ${userName}`);
      loadLeadData(true);
    } catch (err) {
      if (err?.status === 404) {
        setAssignModalOpen(false);
        showToast('Lead not found. It may have been deleted.', 'error');
        navigate(isAdminRoute ? '/admin/leads' : '/marketing/leads');
      } else {
        showToast('Failed to assign lead. Please try again.', 'error');
      }
    } finally {
      setAssigning(false);
    }
  }

  async function handleSaveFullLead(data) {
    setUpdatingLead(true);
    try {
      const res = await updateAdminLeadFull(leadId, data);
      setEditModalOpen(false);
      showToast(res?.message || 'Lead updated successfully');
      loadLeadData(true);
    } catch (err) {
      throw err;
    } finally {
      setUpdatingLead(false);
    }
  }

  async function handleSavePartialLead(data) {
    setUpdatingLead(true);
    try {
      const res = await updateAdminLeadPartial(leadId, data);
      setEditModalOpen(false);
      showToast(res?.message || 'Lead updated successfully');
      loadLeadData(true);
    } catch (err) {
      throw err;
    } finally {
      setUpdatingLead(false);
    }
  }

  async function handleDeleteLead() {
    setDeletingLead(true);
    try {
      const res = await deleteAdminLead(leadId);
      setDeleteModalOpen(false);
      navigate(isAdminRoute ? '/admin/leads' : '/marketing/leads', {
        state: { toastMessage: res?.message || 'Lead deleted successfully', toastType: 'success' }
      });
    } catch (err) {
      throw err;
    } finally {
      setDeletingLead(false);
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
      showToast(`Stage updated to ${nextStage}`);
      loadLeadData(true);
    } catch {
      showToast('Failed to update stage. Please try again.', 'error');
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
      showToast('Lead closed as Lost');
      loadLeadData(true);
    } catch {
      setLostModalOpen(false);
      showToast('Failed to close lead. Please try again.', 'error');
    } finally {
      setStageLoading(false);
    }
  }

  async function handleWonConfirm(dealValue, closureDate) {
    setStageLoading(true);
    try {
      await closeLeadAsWon(leadId, dealValue, closureDate);
      setWonModalOpen(false);
      showToast('Lead closed as Won');
      loadLeadData(true);
    } catch {
      setWonModalOpen(false);
      showToast('Failed to close lead. Please try again.', 'error');
    } finally {
      setStageLoading(false);
    }
  }

  async function handleReopenConfirm(reason) {
    setStageLoading(true);
    try {
      await reopenLead(leadId, reason);
      setReopenModalOpen(false);
      showToast('Lead reopened successfully. Stage set to Contacted.');
      loadLeadData(true);
    } catch {
      setReopenModalOpen(false);
      showToast('Failed to reopen lead. Please try again.', 'error');
    } finally {
      setStageLoading(false);
    }
  }

  async function handleFollowUpSubmit(payload) {
    setFollowUpSubmitting(true);
    setFollowUpServerError('');

    const tempId = `optimistic-${Date.now()}`;
    const optimisticEntry = {
      id: tempId,
      action: 'Follow-up Logged',
      message: `${payload.followup_type} - ${payload.outcome}`,
      followup_type: payload.followup_type,
      outcome: payload.outcome,
      notes: payload.notes,
      proposal_amount: payload.proposal_amount,
      createdBy: { name: 'Current User' },
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      isOptimistic: true,
    };
    setTimelineItems(prev => [optimisticEntry, ...prev]);

    if (!navigator.onLine) {
      await queueOfflineFollowup(leadId, payload);
      setFollowUpModalOpen(false);
      setFollowUpSubmitting(false);
      showToast('Offline Mode: Connection lost. Your changes will be saved locally and synced once connection is restored.', 'error');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, SUBMIT_TIMEOUT_MS);

    try {
      const res = await createFollowup(leadId, payload, controller.signal);
      clearTimeout(timeoutId);
      setFollowUpModalOpen(false);
      setFollowUpSubmitting(false);
      showToast('Follow-up recorded successfully');
      if (res?.lead_updated?.proposal_value !== undefined) {
        setLead(prev => prev ? { ...prev, estimated_value: res.lead_updated.proposal_value, proposal_value: res.lead_updated.proposal_value } : prev);
      }
      loadLeadData(true);
    } catch (err) {
      clearTimeout(timeoutId);
      setTimelineItems(prev => prev.filter(item => item.id !== tempId));
      setFollowUpSubmitting(false);
      if (err.name === 'AbortError') {
        showToast('Request timed out due to slow connection. Please try again.', 'error');
        return;
      }
      const status = err?.status;
      if (status === 400) {
        const serverMsg = err?.payload?.body?.error || err?.payload?.error || 'Validation failed.';
        setFollowUpServerError(serverMsg);
        setFollowUpSubmitting(false);
      } else if (status === 401) {
        setFollowUpModalOpen(false);
        const formData = JSON.stringify(payload);
        try { sessionStorage.setItem('crm_followup_draft', formData); } catch {}
        showToast('Session expired. Please log in again.', 'error');
        setTimeout(() => navigate('/app/login'), 1500);
      } else if (status === 403) {
        setFollowUpSubmitting(false);
        showToast('Access Denied: You are not authorized to log follow-ups for this lead.', 'error');
      } else if (status === 404) {
        setFollowUpModalOpen(false);
        showToast('Error: This lead no longer exists.', 'error');
        setTimeout(() => navigate(isAdminRoute ? '/admin/leads' : '/marketing/leads'), 1500);
      } else if (status === 429) {
        setFollowUpSubmitting(false);
        showToast('Rate limit exceeded. Please wait a moment before trying again.', 'error');
      } else {
        setFollowUpSubmitting(false);
        showToast('Server error occurred. Please try again. If issue persists, contact support.', 'error');
      }
    }
  }

  async function handleAddCorrection(followupId, correctionNotes) {
    await addCorrection(leadId, followupId, correctionNotes);
    await loadTimeline(1, true, activeFilter);
  }

  function handleLoadMoreTimeline() {
    loadTimeline(timelinePage + 1, false, activeFilter);
  }

  function handleFilterChange(filterId) {
    if (!navigator.onLine && filterId !== 'all') {
      showToast("Offline: Cannot filter timeline while offline.", "error");
      return;
    }
    setActiveFilter(filterId);
    loadTimeline(1, true, filterId);
  }

  function handleLogFollowUp() {
    if (!canLogFollowUp) return;
    setFollowUpModalOpen(true);
  }

  function handleFollowUpModalClose() {
    setFollowUpModalOpen(false);
    setFollowUpServerError('');
    setTimeout(() => followUpButtonRef.current?.focus(), 100);
  }

  function handleFollowUpServerClear() {
    setFollowUpServerError('');
  }

  const leadStatus = getLeadField(lead, ['lead_status', 'status'], 'New');
  const leadPriority = getLeadField(lead, ['priority'], '-');
  const leadStage = getLeadField(lead, ['stage'], 'New');
  const servicesInterested = Array.isArray(lead?.servicesInterested) && lead.servicesInterested.length > 0
    ? lead.servicesInterested
    : Array.isArray(lead?.services_interested) && lead.services_interested.length > 0
      ? lead.services_interested
      : Array.isArray(lead?.service_interested) && lead.service_interested.length > 0
        ? lead.service_interested
        : typeof lead?.service_interested === 'string'
          ? [lead.service_interested]
          : typeof lead?.services_interested === 'string'
            ? [lead.services_interested]
            : [];

  const assignedToName = getLeadField(lead, ['assigned_to_name', 'assignedToName'], '');
  const assignedEmployeeId = getLeadField(lead, ['assigned_employee_id', 'assignedEmployeeId'], '');
  let assignedToDisplay = 'Unassigned';
  if (assignedEmployeeId && assignedToName) {
    assignedToDisplay = `${assignedEmployeeId} (${assignedToName})`;
  } else if (assignedEmployeeId) {
    assignedToDisplay = assignedEmployeeId;
  } else if (assignedToName) {
    assignedToDisplay = assignedToName;
  } else if (lead?.assignedTo && typeof lead.assignedTo === 'object') {
    assignedToDisplay = lead.assignedTo.name || lead.assignedTo.employee_name || 'Unassigned';
  } else if (lead?.assigned_to && typeof lead.assigned_to === 'object') {
    assignedToDisplay = lead.assigned_to.name || lead.assigned_to.employee_name || 'Unassigned';
  } else if (typeof lead?.assignedTo === 'string') {
    const user = usersMap[lead.assignedTo];
    if (user && user.employee_id) assignedToDisplay = `${user.employee_id} (${user.name})`;
    else if (user) assignedToDisplay = user.name;
    else assignedToDisplay = lead.assignedTo;
  } else if (typeof lead?.assigned_to === 'string') {
    const user = usersMap[lead.assigned_to];
    if (user && user.employee_id) assignedToDisplay = `${user.employee_id} (${user.name})`;
    else if (user) assignedToDisplay = user.name;
    else assignedToDisplay = lead.assigned_to;
  }
  const assignedAtVal = lead?.assignedAt || lead?.assigned_at || lead?.updatedAt || lead?.updated_at || '';

  const isClosedLead = lead?.status === 'Won' || lead?.status === 'Lost' || lead?.stage === 'Closed' || lead?.stage === 'Won' || lead?.stage === 'Lost';
  
  const resolvedCategory = categoriesMap[getLeadField(lead, ['categoryName', 'category_name', 'category', 'businessCategory'], '')] || getLeadField(lead, ['categoryName', 'category_name', 'category', 'businessCategory'], '-');

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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Lead Details
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant/70">
                {getLeadField(lead, ['leadId', 'lead_id', 'id'], `LD-${leadId}`)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={STATUS_MAP[leadStatus] || 'new'}>
                {leadStatus}
              </Badge>
              {isAdmin && (
                <>
                  <button
                    onClick={() => setAssignModalOpen(true)}
                    aria-label={assignedToDisplay === 'Unassigned' ? 'Assign lead' : 'Reassign lead'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white font-label-sm text-label-sm hover:bg-primary/90 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">swap_horiz</span>
                    {assignedToDisplay === 'Unassigned' ? 'Assign' : 'Reassign'}
                  </button>
                  <button
                    onClick={() => setEditModalOpen(true)}
                    aria-label="Edit lead"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/30 text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit</span>
                    Edit Lead
                  </button>
                  <button
                    onClick={() => setDeleteModalOpen(true)}
                    aria-label="Delete lead"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-error font-label-sm text-label-sm hover:bg-red-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
                    Delete Lead
                  </button>
                </>
              )}
            </div>
          </div>

          {isReadOnly && !isLeadOwner() && lead?.assignedTo && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="font-label-sm text-label-sm text-amber-800">
                Read-only access: This lead is assigned to {getLeadField(lead, ['assigned_to_name', 'assignedToName', 'assignedTo', 'assigned_to'], 'another user')}.
              </p>
            </div>
          )}

          {!isLeadOwner() && !isAdmin && !isReadOnly && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="font-label-sm text-label-sm text-amber-800">
                Read-only access: This lead is assigned to {getLeadField(lead, ['assigned_to_name', 'assignedToName', 'assignedTo', 'assigned_to'], 'another user')}.
              </p>
            </div>
          )}

          <div className="mb-6">
            <StageControl
              currentStage={leadStage}
              currentStatus={getLeadField(lead, ['lead_status', 'status'], '')}
              isAdmin={isAdmin}
              isLeadOwner={isLeadOwner()}
              onStageChange={handleStageChange}
              onCloseAsWon={handleCloseAsWon}
              onCloseAsLost={() => setLostModalOpen(true)}
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
              <p className="font-body-md text-body-md text-on-surface break-all break-words">{getLeadField(lead, ['website'], '-')}</p>
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
              <p className="font-body-md text-body-md text-on-surface break-all break-words">{getLeadField(lead, ['email'], '-')}</p>
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
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Category</p>
              <p className="font-body-md text-body-md text-on-surface">{resolvedCategory}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Sub-Category</p>
              <p className="font-body-md text-body-md text-on-surface">{getLeadField(lead, ['subCategoryName', 'sub_category_name', 'subCategory', 'businessSubCategory'], '-')}</p>
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
              <p className="font-body-md text-body-md text-on-surface" id="estimated-value">
                {getLeadField(lead, ['estimatedValue', 'estimated_value', 'value'], '-')}
              </p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Assigned To</p>
              <p className="font-body-md text-body-md text-on-surface">{assignedToDisplay}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Next Follow-up</p>
              <p className="font-body-md text-body-md text-on-surface">
                {lead?.next_followup_date || lead?.nextFollowupDate ? formatDate(lead.next_followup_date || lead.nextFollowupDate) : '-'}
              </p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Created Date</p>
              <p className="font-body-md text-body-md text-on-surface">
                {lead?.created_at || lead?.createdAt ? formatDate(lead.created_at || lead.createdAt) : '-'}
              </p>
            </div>
            {assignedAtVal && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Assigned At / Updated At</p>
                <p className="font-body-md text-body-md text-on-surface">{formatDate(assignedAtVal)}</p>
              </div>
            )}
            {((lead?.final_deal_value !== undefined && lead?.final_deal_value !== null) || (lead?.finalDealValue !== undefined && lead?.finalDealValue !== null)) && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Final Deal Value</p>
                <p className="font-body-md text-body-md text-on-surface">{getLeadField(lead, ['final_deal_value', 'finalDealValue'], '-')}</p>
              </div>
            )}
            {(lead?.outcome || lead?.closure_reason) && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Outcome / Reason</p>
                <p className="font-body-md text-body-md text-on-surface">{getLeadField(lead, ['outcome', 'closure_reason'], '-')}</p>
              </div>
            )}
            {(lead?.closure_date || lead?.closureDate) && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Closure Date</p>
                <p className="font-body-md text-body-md text-on-surface">{formatDate(lead.closure_date || lead.closureDate)}</p>
              </div>
            )}
            {(lead?.remarks || lead?.notes) && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 md:col-span-2">
                <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Remarks</p>
                <p className="font-body-md text-body-md text-on-surface">{getLeadField(lead, ['remarks', 'notes'], '-')}</p>
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
            <div className="overflow-x-auto">
              <div className="flex items-center gap-4 sm:gap-6 border-b border-outline-variant/20 mb-4 min-w-max" role="tablist" aria-label="Lead detail tabs">
              <button
                role="tab"
                id="tab-timeline"
                aria-selected={activeTab === 'timeline'}
                aria-controls="panel-timeline"
                onClick={() => setActiveTab('timeline')}
                className={`pb-2 text-label-md font-label-md transition-colors relative whitespace-nowrap ${activeTab === 'timeline' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Timeline
                {activeTab === 'timeline' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
              </button>
              <button
                role="tab"
                id="tab-history"
                aria-selected={activeTab === 'history'}
                aria-controls="panel-history"
                onClick={() => setActiveTab('history')}
                className={`pb-2 text-label-md font-label-md transition-colors relative whitespace-nowrap ${activeTab === 'history' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                History
                {activeTab === 'history' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
              </button>
            </div>
            </div>

            <div role="tabpanel" id="panel-timeline" aria-labelledby="tab-timeline" className={activeTab !== 'timeline' ? 'hidden' : ''}>
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h3 className="font-headline-md text-headline-md text-on-surface">
                    Timeline
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {isClosedLead && !isReadOnly && (isLeadOwner() || isAdmin) && (
                      <span
                        className="text-label-sm text-on-surface-variant/50"
                        title="Cannot add follow-up to a closed lead."
                      >
                        <button
                          ref={followUpButtonRef}
                          disabled={true}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-200 text-gray-400 text-label-sm font-label-sm cursor-not-allowed"
                          title="Cannot add follow-up to a closed lead."
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          Log Follow-up
                        </button>
                      </span>
                    )}
                    {!isClosedLead && !canLogFollowUp && !isReadOnly && (
                      <span className="text-label-sm text-on-surface-variant/50">
                        Only the lead owner can log follow-up actions.
                      </span>
                    )}
                    {!isClosedLead && canLogFollowUp && (
                      <button
                        ref={followUpButtonRef}
                        onClick={handleLogFollowUp}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-label-sm font-label-sm hover:bg-primary/90 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Log Follow-up
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`${isAdminRoute ? '/admin' : '/marketing'}/leads/${leadId}/lead-history`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-label-sm font-label-sm text-primary hover:bg-primary/5 border border-primary/20 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">history</span>
                      View Full History
                    </button>
                  </div>
                </div>
                <Timeline
                  timeline={timelineItems}
                  loading={historyLoading}
                  hasMore={timelinePagination.has_more}
                  onLoadMore={handleLoadMoreTimeline}
                  loadingMore={loadingMoreTimeline}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  isReadOnly={isReadOnly}
                  isLeadOwner={isLeadOwner()}
                  onAddCorrection={handleAddCorrection}
                  emptyMessage="No history found for this lead."
                  showLogFollowUpButton={canLogFollowUp}
                  onLogFollowUp={handleLogFollowUp}
                  activeFilter={activeFilter}
                  onFilterChange={handleFilterChange}
                  timelineError={timelineError}
                  onRetry={() => loadTimeline(1, true, activeFilter)}
                />
              </div>
            </div>

            <div role="tabpanel" id="panel-history" aria-labelledby="tab-history" className={activeTab !== 'history' ? 'hidden' : ''}>
              <FieldHistory
                leadId={leadId}
                isAdminRoute={isAdminRoute}
                visible={activeTab === 'history'}
                valueResolvers={{
                  category: (val) => {
                    if (!val) return null;
                    const id = String(val);
                    return lead?.category_name || lead?.categoryName || (lead?.category === id ? lead?.category : null) || id;
                  },
                  sub_category: (val) => {
                    if (!val) return null;
                    const id = String(val);
                    return lead?.sub_category_name || lead?.subCategoryName || (lead?.sub_category === id ? lead?.sub_category : null) || id;
                  },
                  assigned_to: (val) => {
                    if (!val) return null;
                    const id = String(val);
                    const name = lead?.assigned_to_name || (lead?.assignedTo === id ? 'Current User' : null) || id;
                    const empId = lead?.assigned_employee_id || lead?.assignedEmployeeId || '';
                    if (empId && name && name !== id && name !== 'Current User') {
                      return `${empId} (${name})`;
                    }
                    if (empId) return empId;
                    return name;
                  },
                }}
              />
            </div>
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

      <EditLeadModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        lead={lead}
        onSaveFull={handleSaveFullLead}
        onSavePartial={handleSavePartialLead}
        saving={updatingLead}
      />

      <DeleteLeadModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        leadId={leadId}
        leadDisplayId={getLeadField(lead, ['leadId', 'lead_id', 'id'], `LD-${leadId}`)}
        onConfirm={handleDeleteLead}
        deleting={deletingLead}
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
        closedStage={getLeadField(lead, ['lead_status', 'status'], 'Closed')}
      />

      <FollowUpModal
        isOpen={followUpModalOpen}
        onClose={handleFollowUpModalClose}
        onSubmit={handleFollowUpSubmit}
        leadStage={leadStage}
        submitting={followUpSubmitting}
        serverError={followUpServerError}
        onClearServerError={handleFollowUpServerClear}
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
