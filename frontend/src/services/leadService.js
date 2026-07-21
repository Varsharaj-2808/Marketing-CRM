import { API_BASE_URL } from "../constants";
import { addNotification } from "./notificationService";
import { apiClient } from "../utils/apiClient";
export async function fetchCategories(params = {}) {
  const json = await apiClient("/admin/categories", { params });
  if (json?.data) {
    if (Array.isArray(json.data)) {
      return json;
    }
    if (json.data.data && Array.isArray(json.data.data)) {
      return { ...json, data: json.data.data };
    }
    return json;
  }
  return json;
}
export async function fetchUsers() {
  return await apiClient("/admin/users");
}
export async function fetchSubCategories(categoryId, params = {}) {
  if (categoryId) {
    const json = await apiClient(`/admin/categories/${categoryId}/sub-categories`, {
      params,
    });
    if (json?.data) {
      const list = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.data?.data)
          ? json.data.data
          : [];
      return { success: true, data: list };
    }
    return json;
  }
  const json = await apiClient("/subcategories", { params });
  if (json?.data) {
    const list = Array.isArray(json.data)
      ? json.data
      : Array.isArray(json.data?.data)
        ? json.data.data
        : [];
    return { success: true, data: list };
  }
  return json;
}
export async function checkDuplicateLead(mobileNumber) {
  return await apiClient("/marketing/leads/check-duplicate", {
    method: "POST",
    body: { mobileNumber },
  });
}
export async function createLead(data) {
  return await apiClient("/marketing/leads", {
    method: "POST",
    body: data,
  });
}
export async function fetchLeads(params = {}) {
  return await apiClient("/marketing/leads", { params });
}
export async function fetchAdminLeads(params = {}) {
  return await apiClient("/admin/leads", { params });
}
export async function fetchMarketingLeads(params = {}) {
  return await apiClient("/marketing/leads", { params });
}
export async function updateAdminLeadFull(id, data) {
  return await apiClient(`/admin/leads/${id}`, {
    method: "PUT",
    body: data,
  });
}
export async function updateAdminLeadPartial(id, data) {
  return await apiClient(`/admin/leads/${id}`, {
    method: "PATCH",
    body: data,
  });
}
export async function deleteAdminLead(id) {
  return await apiClient(`/admin/leads/${id}`, {
    method: "DELETE",
  });
}
export async function fetchLeadById(id, cacheBuster) {
  return await apiClient(`/marketing/leads/${id}`);
}
export async function fetchLeadSources() {
  return await apiClient("/admin/lead_sources");
}
export async function createLeadSource(data) {
  return await apiClient("/admin/lead_sources", {
    method: "POST",
    body: data,
  });
}
export async function updateLeadSource(id, data) {
  return await apiClient(`/admin/lead_sources/${id}`, {
    method: "PUT",
    body: data,
  });
}
export async function deleteLeadSource(id) {
  return await apiClient(`/admin/lead_sources/${id}`, {
    method: "DELETE",
  });
}
export async function fetchServices() {
  return await apiClient("/admin/services");
}
export async function createService(data) {
  return await apiClient("/admin/services", {
    method: "POST",
    body: data,
  });
}
export async function updateService(id, data) {
  return await apiClient(`/admin/services/${id}`, {
    method: "PUT",
    body: data,
  });
}
export async function deleteService(id) {
  return await apiClient(`/admin/services/${id}`, {
    method: "DELETE",
  });
}
export async function createCategory(data) {
  return await apiClient("/admin/categories", {
    method: "POST",
    body: data,
  });
}
export async function updateCategory(id, data) {
  return await apiClient(`/admin/categories/${id}`, {
    method: "PUT",
    body: data,
  });
}
export async function deleteCategory(id) {
  return await apiClient(`/admin/categories/${id}`, {
    method: "DELETE",
  });
}
export async function createSubCategory(categoryId, data) {
  return await apiClient(`/admin/categories/${categoryId}/sub-categories`, {
    method: "POST",
    body: data,
  });
}
export async function updateSubCategory(categoryId, subId, data) {
  return await apiClient(
    `/admin/categories/${categoryId}/sub-categories/${subId}`,
    { method: "PUT", body: data },
  );
}
export async function deleteSubCategory(categoryId, subId) {
  return await apiClient(
    `/admin/categories/${categoryId}/sub-categories/${subId}`,
    { method: "DELETE" },
  );
}
export async function toggleCategoryStatus(id, isActive) {
  return await apiClient(`/admin/categories/${id}`, {
    method: "PUT",
    body: { isActive },
  });
}
export async function toggleSubCategoryStatus(categoryId, subId, isActive) {
  return await apiClient(
    `/admin/categories/${categoryId}/sub-categories/${subId}`,
    { method: "PUT", body: { isActive } },
  );
}
export async function checkCategoryInUse(id) {
  return await apiClient(`/admin/categories/${id}/in-use`);
}
export async function checkSubCategoryInUse(categoryId, subId) {
  return await apiClient(
    `/admin/categories/${categoryId}/sub-categories/${subId}/in-use`,
  );
}
export async function fetchActiveCategories() {
  return await apiClient("/admin/categories/active");
}
export async function fetchActiveSubCategories(categoryId) {
  return await apiClient(
    `/admin/categories/${categoryId}/sub-categories/active`,
  );
}
export async function fetchCategoryAuditLog(id) {
  const json = await apiClient("/admin/categories/audit-log", {
    params: { category_id: id },
  });
  if (json?.data) {
    const list = Array.isArray(json.data) ? json.data : [];
    const filtered = id
      ? list.filter((entry) => entry.entityId === id)
      : list;
    return { success: true, data: filtered };
  }
  return json;
}
export async function fetchSavedViews() {
  return await apiClient("/admin/leads/saved-views");
}
export async function createSavedView(data) {
  return await apiClient("/admin/leads/saved-views", {
    method: "POST",
    body: data,
  });
}
export async function deleteSavedView(id) {
  return await apiClient(`/admin/leads/saved-views/${id}`, {
    method: "DELETE",
  });
}
export async function reassignLeads(leadIds, _targetUserId) {
  return await apiClient("/admin/leads/bulk-assign", {
    method: "POST",
    body: { lead_ids: leadIds, assigned_to: _targetUserId },
  });
}
export async function fetchLeadHistory(leadId) {
  return await apiClient(`/marketing/leads/${leadId}/lead-history`);
}
export async function fetchAdminLeadById(id, cacheBuster) {
  return await apiClient(`/admin/leads/${id}`);
}
export async function assignLead(leadId, assignedTo, reason) {
  const json = await apiClient(`/admin/leads/${leadId}/assign`, {
    method: "PATCH",
    body: { assigned_to: assignedTo, reason },
  });
  addNotification({
    type: "assignment",
    message: `Lead ${leadId} has been assigned to ${assignedTo}`,
    leadId,
    read: false,
    role: "Admin",
    createdAt: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  }).catch(() => {});
  return json || { success: true, message: "Lead assigned successfully" };
}
export async function updateLeadStage(leadId, stage) {
  return await apiClient(`/marketing/leads/${leadId}/status`, {
    method: "PUT",
    body: { stage },
  });
}
export async function closeLeadAsLost(leadId, reason) {
  return closeLead(leadId, { stage: "Lost", lost_reason: reason });
}
export async function closeLeadAsWon(leadId, dealValue, closureDate) {
  return closeLead(leadId, {
    stage: "Won",
    final_deal_value: dealValue,
    closure_date: closureDate,
  });
}
export async function reopenLead(leadId, reason) {
  return await apiClient(`/admin/leads/${leadId}/reopen`, {
    method: "POST",
    body: { reason },
  });
}
export async function bulkAssignLeads(leadIds, assignedTo, reason) {
  return await apiClient("/admin/leads/bulk-assign", {
    method: "POST",
    body: { lead_ids: leadIds, assigned_to: assignedTo, reason },
  });
}
export async function fetchWonRateByCategory(params = {}) {
  return await apiClient("/admin/dashboard/category/won-rate", { params });
}
export async function fetchLeadVolumeByCategory(params = {}) {
  return await apiClient("/admin/dashboard/category/lead-volume", { params });
}
export async function fetchDashboardKpis(params = {}) {
  return await apiClient("/admin/dashboard/kpis", { params });
}
export async function fetchMarketingDashboard(params = {}) {
  const res = await apiClient("/marketing/dashboard", { params });
  if (res?.success && res.data) {
    if (res.data.total_leads !== undefined && res.data.cards === undefined) {
      res.data.cards = {
        my_leads: Number(res.data.total_leads || 0),
        my_followups_today: Number(res.data.today_followups || 0),
        my_won_leads: Number(res.data.won_leads || 0),
        my_lost_leads: Number(res.data.lost_leads || 0)
      };
      res.data.conversion_rate = {
        won: Number(res.data.won_leads || 0),
        lost: Number(res.data.lost_leads || 0),
        rate: res.data.conversion_rate || '0%'
      };
    }
  }
  return res;
}
export async function exportLeads(params = {}, isAdmin = true) {
  const endpoint = isAdmin ? "/admin/leads/export" : "/marketing/leads/export";
  return await apiClient(endpoint, { params, responseType: "blob" });
}
export async function exportReport(params = {}) {
  return await apiClient("/admin/reports/export", {
    params,
    responseType: "blob",
  });
}
let FOLLOWUP_STORE = [];
function openOfflineQueueDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("crm_offline_queue", 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("followups")) {
        db.createObjectStore("followups", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}
export async function queueOfflineFollowup(leadId, data) {
  try {
    const db = await openOfflineQueueDB();
    const tx = db.transaction("followups", "readwrite");
    const store = tx.objectStore("followups");
    store.add({ leadId, data, createdAt: new Date().toISOString() });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
    });
    db.close();
    return { success: true, message: "Follow-up queued for sync." };
  } catch {
    return { success: false, message: "Failed to queue follow-up." };
  }
}
export async function processOfflineQueue() {
  try {
    const db = await openOfflineQueueDB();
    const tx = db.transaction("followups", "readonly");
    const store = tx.objectStore("followups");
    const items = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
    if (!items || items.length === 0) {
      db.close();
      return;
    }
    for (const item of items) {
      try {
        await createFollowup(item.leadId, item.data);
        const delTx = db.transaction("followups", "readwrite");
        const delStore = delTx.objectStore("followups");
        delStore.delete(item.id);
        await new Promise((resolve, reject) => {
          delTx.oncomplete = resolve;
          delTx.onerror = (e) => reject(e.target.error);
        });
      } catch {
        break;
      }
    }
    db.close();
  } catch {
    /* silently fail */
  }
}
export async function createFollowup(leadId, data, signal) {
  const json = await apiClient(`/marketing/leads/${leadId}/followups`, {
    method: "POST",
    body: data,
    signal,
  });
  const followup = json?.data || json;
  FOLLOWUP_STORE.push(followup);
  return (
    json || {
      success: true,
      data: followup,
      message: "Follow-up recorded successfully",
    }
  );
}
export async function fetchTimeline(leadId, params = {}) {
  const { signal, ...queryParams } = params;
  return await apiClient(`/marketing/leads/${leadId}/timeline`, {
    params: queryParams,
  });
}
export async function fetchTodayFollowups(params = {}) {
  return await apiClient("/marketing/followups/today", { params });
}
export async function fetchOverdueFollowups() {
  return await apiClient("/marketing/followups/overdue");
}
export async function addCorrection(leadId, followupId, correctionNotes) {
  return await apiClient(
    `/marketing/leads/${leadId}/followups/${followupId}/correction`,
    { method: "POST", body: { correction_notes: correctionNotes } },
  );
}
function buildAtRiskBreakdown(leads) {
  const map = {};
  leads.forEach(lead => {
    let user = 'Unassigned';
    if (lead.assigned_to) {
      if (typeof lead.assigned_to === 'object') {
        user = lead.assigned_to.name || lead.assigned_to.employee_name || 'Assigned';
      } else {
        user = lead.assigned_to;
      }
    } else if (lead.assignedTo) {
      if (typeof lead.assignedTo === 'object') {
        user = lead.assignedTo.name || lead.assignedTo.employee_name || 'Assigned';
      } else {
        user = lead.assignedTo;
      }
    }
    if (!map[user]) {
      map[user] = {
        user_name: user,
        at_risk_count: 0,
        oldest_overdue_days: 0
      };
    }
    map[user].at_risk_count++;
    const overdue = Number(lead.days_overdue || 0);
    if (overdue > map[user].oldest_overdue_days) {
      map[user].oldest_overdue_days = overdue;
    }
  });
  return Object.values(map);
}

function normalizeAtRiskResponse(res) {
  if (res?.success && res.data) {
    if (Array.isArray(res.data)) {
      const leads = res.data;
      res.data = {
        total_at_risk: leads.length,
        breakdown: buildAtRiskBreakdown(leads),
        leads: leads
      };
    } else if (res.data.leads && !Array.isArray(res.data)) {
      if (res.data.total_at_risk === undefined) {
        res.data.total_at_risk = res.data.leads.length;
      }
      if (res.data.breakdown === undefined) {
        res.data.breakdown = buildAtRiskBreakdown(res.data.leads);
      }
    }
  }
  return res;
}

export async function fetchAtRiskLeads(overdueDays = 3) {
  const res = await apiClient("/admin/dashboard/at-risk", {
    params: { overdue_days: overdueDays },
  });
  return normalizeAtRiskResponse(res);
}
export async function fetchFieldHistory(leadId, params = {}) {
  return await apiClient(`/marketing/leads/${leadId}/field-history`, {
    params,
  });
}
export async function fetchAdminFieldHistory(leadId, params = {}) {
  return await apiClient(`/admin/leads/${leadId}/field-history`, { params });
}
export async function exportFieldHistory(leadId) {
  return await apiClient(`/admin/leads/${leadId}/field-history/export`, {
    params: { format: "csv" },
    responseType: "blob",
  });
}
export async function fetchAuditLogEntries(params = {}) {
  return await apiClient("/admin/audit-log", { params });
}
export async function fetchAuditLogEntry(id) {
  return await apiClient(`/admin/audit-log/${id}`);
}
export async function exportAuditLog(params = {}) {
  return await apiClient("/admin/audit-log/export", {
    params: { ...params, format: "csv" },
    responseType: "blob",
  });
}
export async function fetchRetentionSettings() {
  return await apiClient("/admin/system-settings/audit-retention");
}
export async function updateRetentionSettings(value) {
  return await apiClient("/admin/system-settings/audit-retention", {
    method: "PUT",
    body: { value },
  });
}
export async function closeLead(leadId, payload) {
  return await apiClient(`/marketing/leads/${leadId}/close`, {
    method: "PUT",
    body: payload,
  });
}
export async function reopenLeadAdmin(leadId, reason) {
  return await apiClient(`/admin/leads/${leadId}/reopen`, {
    method: "PUT",
    body: { reopen_reason: reason },
  });
}
export async function fetchCategoryVolume(params = {}) {
  const res = await apiClient("/admin/dashboard/category-volume", { params });
  if (res?.success && res.data) {
    if (Array.isArray(res.data)) {
      const mapped = res.data.map(item => ({
        category: item.category || '',
        sub_category: item.sub_category || item.subCategory || 'Stage',
        lead_count: Number(item.lead_count ?? item.count ?? 0)
      }));
      return { ...res, data: mapped };
    } else if (typeof res.data === "object") {
      const flat = res.data;
      const stages = [
        "new",
        "contacted",
        "qualified",
        "meeting",
        "proposal",
        "negotiation",
        "won",
        "lost",
        "hold",
      ];
      const mapped = stages
        .filter((stage) => flat[stage] !== undefined)
        .map((stage) => ({
          category: stage.charAt(0).toUpperCase() + stage.slice(1),
          sub_category: "Stage",
          lead_count: Number(flat[stage] || 0),
        }));
      return { success: true, data: mapped };
    }
  }
  return res;
}
export async function fetchWonRateBySource(params = {}) {
  return await apiClient("/admin/dashboard/won-rate-by-source", { params });
}
export async function fetchAdminAtRisk(params = {}) {
  const res = await apiClient("/admin/dashboard/at-risk", { params });
  return normalizeAtRiskResponse(res);
}
export async function fetchMeDashboardCards() {
  return await apiClient("/marketing/dashboard/cards");
}
export async function fetchMeConversionRate(params = {}) {
  return await apiClient("/marketing/dashboard/conversion-rate", { params });
}
export async function fetchExportHistory(params = {}) {
  return await apiClient("/admin/audit-log", {
    params: { ...params, action: "lead.exported" },
  });
}
export async function downloadExportFile(id) {
  return await apiClient(`/admin/leads/export/history/${id}/download`, {
    responseType: "blob",
  });
}
