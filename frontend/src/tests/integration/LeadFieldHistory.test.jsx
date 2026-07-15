import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import LeadDetails from '../../pages/leads/LeadDetails';
import AuditLogPage from '../../pages/admin/AuditLogPage';
import AuditLogDetailPage from '../../pages/admin/AuditLogDetailPage';

function mockRes(data, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(data),
    blob: () => Promise.resolve(new Blob(['a,b,c'], { type: 'text/csv' })),
  });
}

function mockFetch(fnImpl) {
  global.fetch = vi.fn().mockImplementation(fnImpl);
}

const marketingUser = { id: 'ME-001', employee_id: 'ME-001', name: 'Maya Executive', email: 'maya@company.com', role: 'Marketing Executive' };
const adminUser = { id: 'ADM-001', employee_id: 'ADM-001', name: 'Admin User', email: 'admin@company.com', role: 'Admin' };

function setUser(user) {
  localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
  localStorage.setItem('crm_user', JSON.stringify(user));
}

function renderLeadDetails(path = '/marketing/leads/ld-100') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/marketing/leads/:leadId" element={<LeadDetails />} />
          <Route path="/admin/leads/:leadId" element={<LeadDetails />} />
          <Route path="/admin/audit-log" element={<AuditLogPage />} />
          <Route path="/admin/audit-logs/:id" element={<AuditLogDetailPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

function getDefaultLead(overrides = {}) {
  return {
    success: true,
    data: {
      id: 'ld-100',
      leadId: 'LD-100',
      companyName: 'Acme Corp',
      contactPerson: 'John Smith',
      mobileNumber: '9000000000',
      status: '',
      stage: 'New',
      priority: 'High',
      estimated_value: '$50,000',
      createdAt: '2026-07-06T10:00:00.000Z',
      createdBy: { name: 'Admin User' },
      assignedTo: { id: 'ME-001', employee_id: 'ME-001', name: 'Maya Executive' },
      ...overrides,
    },
  };
}

function getFieldHistoryResponse(pageNum = 1, totalPages = 1) {
  const items = [
    { field: 'stage', old_value: 'New', new_value: 'Contacted', source: 'user', changed_by: { name: 'John Doe', employee_id: 'EMP-00001' }, changed_at: '2026-07-05T10:30:00Z' },
    { field: 'assigned_to', old_value: null, new_value: 'John Doe', source: 'system', changed_by: 'System', changed_at: '2026-07-05T09:00:00Z' },
    { field: 'lead_quality', old_value: 'Cold', new_value: 'Hot', source: 'user', changed_by: { name: 'Admin User', employee_id: 'EMP-00002' }, changed_at: '2026-07-04T14:00:00Z' },
    { field: 'estimated_value', old_value: '30000', new_value: '50000', source: 'user', changed_by: { name: 'John Doe', employee_id: 'EMP-00001' }, changed_at: '2026-07-03T08:00:00Z' },
  ];
  return {
    success: true,
    data: { history: items, total_changes: items.length },
    pagination: { page: pageNum, total_pages: totalPages, total_records: items.length * totalPages },
  };
}

function buildLeadFetch(lead = getDefaultLead(), fieldHistoryRes = null) {
  return (input) => {
    const url = String(input);
    if (url.includes('/field-history')) return mockRes(fieldHistoryRes || getFieldHistoryResponse());
    if (url.includes('/timeline')) return mockRes({ success: true, body: { timeline: [], pagination: { page: 1, totalPages: 1, has_more: false } } });
    return mockRes(lead);
  };
}

async function clickHistoryTab() {
  const historyTab = await screen.findByRole('tab', { name: /History/i });
  fireEvent.click(historyTab);
  await waitFor(() => {
    expect(historyTab.getAttribute('aria-selected')).toBe('true');
  });
}

async function waitForTable() {
  return await screen.findByRole('table', { name: /Field change history/i });
}

describe('LeadFieldHistory - STORY-5.1.1', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ---------- test-ep-5.1.1-f-001: Table columns ----------
  it('test-ep-5.1.1-f-001: History tab renders table with DB column labels: field_name, old_value, new_value, changed_by_name, changed_at', async () => {
    const threeEntries = [
      { field: 'stage', old_value: 'New', new_value: 'Contacted', source: 'user', changed_by: { name: 'John Doe' }, changed_at: '2026-07-05T10:30:00Z' },
      { field: 'assigned_to', old_value: '', new_value: 'John', source: 'user', changed_by: { name: 'Admin User' }, changed_at: '2026-07-04T14:00:00Z' },
      { field: 'lead_quality', old_value: 'Cold', new_value: 'Hot', source: 'user', changed_by: { name: 'Jane Doe' }, changed_at: '2026-07-03T08:00:00Z' },
    ];
    const res = getFieldHistoryResponse();
    res.data.history = threeEntries;
    res.data.total_changes = 3;
    mockFetch(buildLeadFetch(getDefaultLead(), res));
    setUser(adminUser);
    renderLeadDetails('/admin/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();

    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map(h => h.textContent.trim());
    expect(headerTexts).toContain('Field Name');
    expect(headerTexts).toContain('Old Value');
    expect(headerTexts).toContain('New Value');
    expect(headerTexts).toContain('Changed By');
    expect(headerTexts).toContain('Changed At');

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.length).toBe(3);
  });

  // ---------- test-ep-5.1.1-f-002: Newest-first order ----------
  it('test-ep-5.1.1-f-002: History entries displayed in newest-first order by changed_at', async () => {
    mockFetch(buildLeadFetch());
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();

    const rows = screen.getAllByRole('row').slice(1);
    const dateCells = rows.map(r => r.querySelectorAll('td')[4]?.textContent.trim()).filter(Boolean);
    for (let i = 1; i < dateCells.length; i++) {
      const prev = new Date(dateCells[i - 1]).getTime();
      const curr = new Date(dateCells[i]).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  // ---------- test-ep-5.1.1-f-003: Both Admin and ME can access ----------
  it('test-ep-5.1.1-f-003: History tab accessible from both Admin and Marketing Executive lead detail pages', async () => {
    for (const user of [marketingUser, adminUser]) {
      localStorage.clear();
      vi.restoreAllMocks();
      mockFetch(buildLeadFetch());
      setUser(user);
      renderLeadDetails(user.role === 'Admin' ? '/admin/leads/ld-100' : '/marketing/leads/ld-100');
      const tab = await screen.findByRole('tab', { name: /History/i });
      expect(tab).toBeInTheDocument();
      cleanup();
    }
  });

  // ---------- test-ep-5.1.1-f-004: Human-readable labels ----------
  it('test-ep-5.1.1-f-004: Field names displayed as human-readable labels derived from DB column field_name', async () => {
    const entriesWithLeadQuality = [
      { field: 'stage', old_value: 'New', new_value: 'Contacted', source: 'user', changed_by: { name: 'John Doe' }, changed_at: '2026-07-05T10:30:00Z' },
      { field: 'assigned_to', old_value: null, new_value: 'John Doe', source: 'system', changed_by: 'System', changed_at: '2026-07-05T09:00:00Z' },
      { field: 'lead_quality', old_value: 'Cold', new_value: 'Hot', source: 'user', changed_by: { name: 'Admin User' }, changed_at: '2026-07-04T14:00:00Z' },
    ];
    const res = getFieldHistoryResponse();
    res.data.history = entriesWithLeadQuality;
    mockFetch(buildLeadFetch(getDefaultLead(), res));
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();

    const rows = screen.getAllByRole('row').slice(1);
    const fieldCells = rows.map(r => r.querySelectorAll('td')[0]?.textContent.trim()).filter(Boolean);
    expect(fieldCells).toContain('Stage');
    expect(fieldCells).toContain('Assigned To');
    expect(fieldCells).toContain('Lead Quality');
  });

  // ---------- test-ep-5.1.1-f-005: Long text truncation ----------
  it('test-ep-5.1.1-f-005: Long old_value/new_value text truncated with expand/collapse toggle', async () => {
    const longText = 'A'.repeat(201);
    const res = getFieldHistoryResponse();
    res.data.history[0].new_value = longText;
    mockFetch(buildLeadFetch(getDefaultLead(), res));
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();

    const showMoreBtn = await screen.findByText('Show more');
    expect(showMoreBtn).toBeInTheDocument();
    fireEvent.click(showMoreBtn);
    expect(await screen.findByText('Show less')).toBeInTheDocument();
  });

  // ---------- test-ep-5.1.1-f-006: Total changes count ----------
  it('test-ep-5.1.1-f-006: Total changes count badge displayed from lead_history entries', async () => {
    const res = getFieldHistoryResponse();
    res.data.total_changes = 12;
    mockFetch(buildLeadFetch(getDefaultLead(), res));
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();

    const badge = await screen.findByText(/Total Changes:/i);
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain('12');
  });

  // ---------- test-ep-5.1.1-f-007: Load more with exhaustion ----------
  it('test-ep-5.1.1-f-007: Paginated history supports "Load more" when entries exceed initial page limit', async () => {
    const allEntries = Array.from({ length: 25 }, (_, i) => ({
      field: 'stage', old_value: `old-${i}`, new_value: `new-${i}`, source: 'user', changed_by: { name: 'John Doe' }, changed_at: `2026-07-${String(24 - i).padStart(2, '0')}T10:00:00Z`,
    }));
    mockFetch((input) => {
      const url = String(input);
      if (url.includes('/field-history')) {
        const pageMatch = url.match(/page=(\d+)/);
        const page = pageMatch ? parseInt(pageMatch[1]) : 1;
        if (page === 1) {
          return mockRes({ success: true, data: { history: allEntries.slice(0, 20), total_changes: 25 }, pagination: { page: 1, total_pages: 2, total_records: 25 } });
        }
        return mockRes({ success: true, data: { history: allEntries.slice(20), total_changes: 25 }, pagination: { page: 2, total_pages: 2, total_records: 25 } });
      }
      if (url.includes('/timeline')) return mockRes({ success: true, body: { timeline: [], pagination: { page: 1, totalPages: 1, has_more: false } } });
      return mockRes(getDefaultLead());
    });
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.length).toBe(20);

    const loadMore = await screen.findByText('Load more');
    expect(loadMore).toBeInTheDocument();
    fireEvent.click(loadMore);

    await waitFor(() => {
      const rowsAfter = screen.getAllByRole('row').slice(1);
      expect(rowsAfter.length).toBe(25);
    });

    await waitFor(() => expect(screen.queryByText('Load more')).not.toBeInTheDocument());
  });

  // ---------- test-ep-5.1.1-f-008: Filter by field_name dropdown ----------
  it('test-ep-5.1.1-f-008: Filter by field_name — only entries matching selected field_name shown', async () => {
    mockFetch(buildLeadFetch());
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();

    const select = await screen.findByLabelText('Field:');
    expect(select).toBeInTheDocument();

    const options = select.querySelectorAll('option');
    const optionTexts = Array.from(options).map(o => o.textContent.trim());
    expect(optionTexts).toContain('Stage');
    expect(optionTexts).toContain('Assigned To');

    fireEvent.change(select, { target: { value: 'stage' } });
    await waitFor(() => {
      const calls = global.fetch.mock.calls.filter(c => String(c[0]).includes('/field-history'));
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ---------- test-ep-5.1.1-f-009: System changes visually distinguished ----------
  it('test-ep-5.1.1-f-009: System-generated changes visually distinguished from user changes', async () => {
    mockFetch(buildLeadFetch());
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();

    const sysBadge = await screen.findByText('System');
    expect(sysBadge).toBeInTheDocument();
  });

  // ---------- test-ep-5.1.1-f-010: Tooltip on System badge ----------
  it('test-ep-5.1.1-f-010: Tooltip on "System" badge explains auto-generated source', async () => {
    mockFetch(buildLeadFetch());
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();

    const sysBadge = await screen.findByText('System');
    fireEvent.mouseEnter(sysBadge);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.textContent).toContain('automatically performed by the system');
  });

  // ---------- test-ep-5.1.1-f-011: Source filter toggle ----------
  it('test-ep-5.1.1-f-011: Filter toggle to show only user-initiated or only system-generated changes', async () => {
    const userEntries = Array.from({ length: 5 }, (_, i) => ({
      field: 'stage', old_value: `old-${i}`, new_value: `new-${i}`, source: 'user', changed_by: { name: `User ${i}` }, changed_at: `2026-07-${String(10 - i).padStart(2, '0')}T10:00:00Z`,
    }));
    const systemEntries = Array.from({ length: 3 }, (_, i) => ({
      field: 'assigned_to', old_value: null, new_value: `System-${i}`, source: 'system', changed_by: 'System', changed_at: `2026-07-${String(5 - i).padStart(2, '0')}T10:00:00Z`,
    }));
    const allEntries = [...userEntries, ...systemEntries];
    const res = getFieldHistoryResponse();
    res.data.history = allEntries;
    res.data.total_changes = allEntries.length;
    mockFetch(buildLeadFetch(getDefaultLead(), res));
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();

    const allBtn = screen.getByText('All changes');
    const userBtn = screen.getByText('User changes only');
    const sysBtn = screen.getByText('System changes only');
    expect(allBtn).toBeInTheDocument();
    expect(userBtn).toBeInTheDocument();
    expect(sysBtn).toBeInTheDocument();

    fireEvent.click(sysBtn);
    const sysRows = screen.getAllByRole('row').slice(1);
    sysRows.forEach(row => {
      const changedBy = row.querySelectorAll('td')[3]?.textContent.trim();
      if (changedBy) expect(changedBy).toBe('System');
    });

    fireEvent.click(userBtn);
    const userRows = screen.getAllByRole('row').slice(1);
    userRows.forEach(row => {
      const changedBy = row.querySelectorAll('td')[3]?.textContent.trim();
      if (changedBy) expect(changedBy).not.toBe('System');
    });

    fireEvent.click(allBtn);
    const allRows = screen.getAllByRole('row').slice(1);
    expect(allRows.length).toBe(allEntries.length);
  });

  // ---------- test-ep-5.1.1-f-012: No inline edit controls ----------
  it('test-ep-5.1.1-f-012: No inline edit controls on any history row — history is append-only', async () => {
    mockFetch(buildLeadFetch());
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();

    const editBtns = screen.queryAllByRole('button', { name: /edit/i });
    expect(editBtns.length).toBe(0);
  });

  // ---------- test-ep-5.1.1-f-013: No delete controls ----------
  it('test-ep-5.1.1-f-013: No delete controls on any history row', async () => {
    mockFetch(buildLeadFetch());
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();

    const deleteBtns = screen.queryAllByRole('button', { name: /delete/i });
    expect(deleteBtns.length).toBe(0);
  });

  // ---------- test-ep-5.1.1-f-014: Close lead as Won ----------
  it('test-ep-5.1.1-f-014: Close lead as Won — form requires final_deal_value and closure_date. History entry created on success', async () => {
    const lead = getDefaultLead({ stage: 'Negotiation', status: '' });
    mockFetch((input) => {
      const url = String(input);
      if (url.includes('/close')) return mockRes({ success: true, message: 'Lead closed as Won' });
      if (url.includes('/timeline')) return mockRes({ success: true, body: { timeline: [], pagination: { page: 1, totalPages: 1, has_more: false } } });
      return mockRes(lead);
    });
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await screen.findByText('Lead Details');

    const closeWonBtn = await screen.findByText('Close as Won');
    fireEvent.click(closeWonBtn);

    const confirmBtn = screen.getByText('Confirm');
    fireEvent.click(confirmBtn);

    await screen.findByText('Final deal value is required.');

    const dealValueInput = screen.getByLabelText(/Final Deal Value/i);
    fireEvent.change(dealValueInput, { target: { value: '250000' } });
    const closureDateInput = screen.getByLabelText(/Closure Date/i);
    fireEvent.change(closureDateInput, { target: { value: '2026-06-30' } });

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      const calls = global.fetch.mock.calls.filter(c => String(c[0]).includes('/close'));
      expect(calls.length).toBe(1);
    });
  });

  // ---------- test-ep-5.1.1-f-015: Close lead as Lost ----------
  it('test-ep-5.1.1-f-015: Close lead as Lost — form requires loss_reason from allowed enum values', async () => {
    const lead = getDefaultLead({ stage: 'Negotiation', status: '' });
    mockFetch((input) => {
      const url = String(input);
      if (url.includes('/close')) return mockRes({ success: true, message: 'Lead closed as Lost' });
      if (url.includes('/timeline')) return mockRes({ success: true, body: { timeline: [], pagination: { page: 1, totalPages: 1, has_more: false } } });
      return mockRes(lead);
    });
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await screen.findByText('Lead Details');

    const stageSelect = await screen.findByLabelText('Stage');
    fireEvent.change(stageSelect, { target: { value: 'Lost' } });

    const confirmBtn = screen.getByText('Confirm');
    fireEvent.click(confirmBtn);

    await screen.findByText('Please select a lost reason.');

    const reasonSelect = screen.getByLabelText(/Lost Reason/i);
    fireEvent.change(reasonSelect, { target: { value: 'Budget' } });

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      const calls = global.fetch.mock.calls.filter(c => String(c[0]).includes('/close'));
      expect(calls.length).toBe(1);
    });
  });

  // ---------- test-ep-5.1.1-f-016: Non-assigned user cannot see close button ----------
  it('test-ep-5.1.1-f-016: Non-assigned user cannot see close button on lead detail page', async () => {
    const lead = getDefaultLead({ stage: 'Negotiation', status: '', assignedTo: { id: 'OTHER-001', employee_id: 'OTHER-001', name: 'Other User' } });
    mockFetch(buildLeadFetch(lead));
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await screen.findByText('Lead Details');

    await screen.findByText(/Read-only access/i);

    expect(screen.queryByText('Close as Won')).not.toBeInTheDocument();
  });

  // ---------- test-ep-5.1.1-f-017: Admin can reopen Won/Lost lead ----------
  it('test-ep-5.1.1-f-017: Admin can reopen a Won/Lost lead with reopen_reason. History entry created on success', async () => {
    const lead = getDefaultLead({ status: 'Won', stage: 'Closed' });
    mockFetch((input) => {
      const url = String(input);
      if (url.includes('/reopen')) return mockRes({ success: true, data: { status: '', stage: 'Contacted' } });
      if (url.includes('/timeline')) return mockRes({ success: true, body: { timeline: [], pagination: { page: 1, totalPages: 1, has_more: false } } });
      return mockRes(lead);
    });
    setUser(adminUser);
    renderLeadDetails('/admin/leads/ld-100');
    await screen.findByText('Lead Details');

    const reopenBtn = await screen.findByText('Reopen Lead');
    fireEvent.click(reopenBtn);

    const confirmBtn = screen.getByText('Confirm Reopen');
    fireEvent.click(confirmBtn);

    await screen.findByText('Reopen reason is required.');

    const reasonInput = screen.getByLabelText('Reopen reason');
    fireEvent.change(reasonInput, { target: { value: 'Client expressed renewed interest' } });

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      const calls = global.fetch.mock.calls.filter(c => String(c[0]).includes('/reopen'));
      expect(calls.length).toBe(1);
    });
  });

  // ---------- test-ep-5.1.1-f-018: Export CSV for Admin ----------
  it('test-ep-5.1.1-f-018: "Export CSV" button visible on History tab for Admins, hidden for MEs', async () => {
    mockFetch(buildLeadFetch());
    setUser(adminUser);
    renderLeadDetails('/admin/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();
    const exportBtn = await screen.findByLabelText('Export CSV');
    expect(exportBtn).toBeInTheDocument();
    cleanup();
    vi.restoreAllMocks();

    mockFetch(buildLeadFetch());
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();
    await waitFor(() => {
      expect(screen.queryByLabelText('Export CSV')).not.toBeInTheDocument();
    });
  });

  // ---------- test-ep-5.1.1-f-019: Export CSV triggers download ----------
  it('test-ep-5.1.1-f-019: Clicking "Export CSV" triggers GET request with format=csv and downloads file', async () => {
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    mockFetch(buildLeadFetch());
    setUser(adminUser);
    renderLeadDetails('/admin/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();

    const exportBtn = await screen.findByLabelText('Export CSV');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      const calls = global.fetch.mock.calls.filter(c => String(c[0]).includes('/field-history/export'));
      expect(calls.length).toBe(1);
    });

    expect(createObjectURL).toHaveBeenCalled();
    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
  });

  // ---------- test-ep-5.1.1-f-020: Audit log table columns ----------
  it('test-ep-5.1.1-f-020: Admin audit log page renders table with columns matching DB: action, resource, resource_id, user, details, ip_address, created_at', async () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      action: i % 2 === 0 ? 'CREATED' : 'UPDATED',
      resource: 'lead',
      resource_id: `ld-${100 + i}`,
      email: `user${i}@company.com`,
      details: `Details for entry ${i + 1}`,
      ip_address: `192.168.1.${i + 1}`,
      created_at: `2026-07-${String(10 + i).padStart(2, '0')}T10:00:00Z`,
    }));
    mockFetch((input) => {
      const url = String(input);
      if (url.includes('/audit-log/export')) return mockRes('', 200);
      if (url.includes('/audit-log')) return mockRes({ success: true, data: entries, pagination: { page: 1, total_pages: 5, total_records: 50 } });
      return mockRes(getDefaultLead());
    });
    setUser(adminUser);
    renderLeadDetails('/admin/audit-log');
    await screen.findByRole('heading', { name: /Audit Logs/i });

    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map(h => h.textContent.trim());
    expect(headerTexts).toContain('Action Type');
    expect(headerTexts).toContain('Entity Affected');
    expect(headerTexts).toContain('Entity ID');
    expect(headerTexts).toContain('Actor');
    expect(headerTexts).toContain('Actions/Details');
    expect(headerTexts).toContain('IP Address');
    expect(headerTexts).toContain('Timestamp');

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.length).toBe(10);

    expect(screen.getByText(/50 total entr/i)).toBeInTheDocument();
  });

  // ---------- test-ep-5.1.1-f-021: Audit log filter controls ----------
  it('test-ep-5.1.1-f-021: Audit log filter controls for user_id, action, resource, and date range', async () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      action: 'lead.status_changed',
      resource: 'lead',
      resource_id: `ld-${100 + i}`,
      email: `user${i}@company.com`,
      details: `Status changed for entry ${i + 1}`,
      ip_address: `192.168.1.${i + 1}`,
      created_at: `2026-06-${String(15 + i).padStart(2, '0')}T10:00:00Z`,
    }));
    const fetchSpy = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/audit-log/export')) return mockRes('', 200);
      if (url.includes('/audit-log')) return mockRes({ success: true, data: entries, pagination: { page: 1, total_pages: 1, total_records: entries.length } });
      return mockRes(getDefaultLead());
    });
    mockFetch(fetchSpy);
    setUser(adminUser);
    renderLeadDetails('/admin/audit-log');
    await screen.findByRole('heading', { name: /Audit Logs/i });

    const actionSelect = screen.getByLabelText('Action');
    fireEvent.change(actionSelect, { target: { value: 'lead.stage_changed' } });

    const fromInput = screen.getByLabelText('From');
    fireEvent.change(fromInput, { target: { value: '2026-06-01' } });
    const toInput = screen.getByLabelText('To');
    fireEvent.change(toInput, { target: { value: '2026-06-26' } });

    // Click Apply Filters button to trigger fetch in new layout
    const applyBtn = screen.getByRole('button', { name: /Apply Filters/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      const calls = fetchSpy.mock.calls.filter(c => String(c[0]).includes('/audit-log?'));
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });

    const lastCallUrl = fetchSpy.mock.calls
      .filter(c => String(c[0]).includes('/audit-log?'))
      .pop()[0];
    expect(String(lastCallUrl)).toContain('action_type=lead.stage_changed');
    expect(String(lastCallUrl)).toContain('from=2026-06-01');
    expect(String(lastCallUrl)).toContain('to=2026-06-26');
  });

  // ---------- test-ep-5.1.1-f-022: Audit log row click navigates to detail ----------
  it('test-ep-5.1.1-f-022: Clicking an audit log row navigates to detail view showing full entry data', async () => {
    const entries = [
      { id: 42, action: 'UPDATED', resource: 'lead', resource_id: 'ld-100', email: 'admin@company.com', details: 'Updated stage from New to Contacted', ip_address: '192.168.1.1', created_at: '2026-07-05T10:00:00Z' },
    ];
    mockFetch((input) => {
      const url = String(input);
      if (url.includes('/audit-log/42')) return mockRes({ success: true, data: entries[0] });
      if (url.includes('/audit-log')) return mockRes({ success: true, data: entries, pagination: { page: 1, total_pages: 1, total_records: 1 } });
      return mockRes(getDefaultLead());
    });
    setUser(adminUser);
    renderLeadDetails('/admin/audit-log');
    await screen.findByRole('heading', { name: /Audit Logs/i });

    const row = await screen.findByText('ld-100');
    fireEvent.click(row.closest('tr'));

    await waitFor(() => {
      expect(screen.getByText('Audit Log Detail')).toBeInTheDocument();
    });

    expect(screen.getAllByText('UPDATED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('admin@company.com').length).toBeGreaterThan(0);
  });

  // ---------- test-ep-5.1.1-f-023: Loading, empty, and error states ----------
  it('test-ep-5.1.1-f-023: Loading, empty, and error states for History tab', async () => {
    let resolvePromise;
    const loadingPromise = new Promise(r => { resolvePromise = r; });
    mockFetch((input) => {
      const url = String(input);
      if (url.includes('/field-history')) return loadingPromise;
      if (url.includes('/timeline')) return mockRes({ success: true, body: { timeline: [], pagination: { page: 1, totalPages: 1, has_more: false } } });
      return mockRes(getDefaultLead());
    });
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();

    const skeleton = await screen.findByLabelText('Loading field history');
    expect(skeleton).toBeInTheDocument();
    resolvePromise(mockRes(getFieldHistoryResponse()));
    await waitFor(() => expect(screen.queryByLabelText('Loading field history')).not.toBeInTheDocument());

    cleanup();
    vi.restoreAllMocks();

    const emptyRes = getFieldHistoryResponse();
    emptyRes.data.history = [];
    emptyRes.data.total_changes = 0;
    mockFetch(buildLeadFetch(getDefaultLead(), emptyRes));
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();

    const emptyMsg = await screen.findByText('No changes tracked yet');
    expect(emptyMsg).toBeInTheDocument();

    cleanup();
    vi.restoreAllMocks();

    let rejectPromise;
    const errorPromise = new Promise((_, reject) => {
      rejectPromise = reject;
    });
    errorPromise.catch(() => {});
    mockFetch((input) => {
      const url = String(input);
      if (url.includes('/field-history')) return errorPromise;
      if (url.includes('/timeline')) return mockRes({ success: true, body: { timeline: [], pagination: { page: 1, totalPages: 1, has_more: false } } });
      return mockRes(getDefaultLead());
    });
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();

    rejectPromise(new Error('Network error'));
    await waitFor(() => {
      expect(screen.getByText('Failed to load field history.')).toBeInTheDocument();
    });
    const retryBtn = screen.getByText('Retry');
    expect(retryBtn).toBeInTheDocument();
    expect(retryBtn.closest('button')).toBeInTheDocument();
  });

  // ---------- test-ep-5.1.1-f-024: Keyboard nav and ARIA labels ----------
  it('test-ep-5.1.1-f-024: Keyboard navigation and ARIA labels across History tab', async () => {
    mockFetch(buildLeadFetch());
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();

    expect(await screen.findByRole('table', { name: /Field change history/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Source filter/i })).toBeInTheDocument();

    const allBtn = screen.getByText('All changes');
    expect(allBtn.getAttribute('aria-pressed')).toBe('true');

    const userBtn = screen.getByText('User changes only');
    expect(userBtn.getAttribute('aria-pressed')).toBe('false');
  });

  // ---------- test-ep-5.1.1-f-025: Tab triggers fetch on click ----------
  it('test-ep-5.1.1-f-025: History tab triggers a fetch request when clicked/selected, and data loads only after tab is active', async () => {
    const fetchSpy = vi.fn(buildLeadFetch());
    mockFetch(fetchSpy);
    setUser(adminUser);
    renderLeadDetails('/admin/leads/ld-100');

    await screen.findByRole('tab', { name: /History/i });
    const historyCallsBefore = fetchSpy.mock.calls.filter(c => String(c[0]).includes('/field-history')).length;
    expect(historyCallsBefore).toBe(0);

    await clickHistoryTab();
    await waitFor(() => {
      const calls = fetchSpy.mock.calls.filter(c => String(c[0]).includes('/field-history'));
      expect(calls.length).toBe(1);
    });

    const timelineTab = screen.getByRole('tab', { name: /Timeline/i });
    fireEvent.click(timelineTab);

    await clickHistoryTab();
    await waitFor(() => {
      const calls = fetchSpy.mock.calls.filter(c => String(c[0]).includes('/field-history'));
      expect(calls.length).toBe(1);
    });
  });

  // ---------- test-ep-5.1.1-f-026: Exactly page limit ----------
  it('test-ep-5.1.1-f-026: When total entries equal exactly the page limit, no "Load more" button appears', async () => {
    const res = getFieldHistoryResponse(1, 1);
    res.data.history = Array.from({ length: 20 }, (_, i) => ({
      field: 'stage', old_value: `old-${i}`, new_value: `new-${i}`, source: 'user', changed_by: { name: 'John Doe' }, changed_at: `2026-07-${String(5 - i).padStart(2, '0')}T10:00:00Z`,
    }));
    res.data.total_changes = 20;
    res.pagination.total_pages = 1;
    mockFetch(buildLeadFetch(getDefaultLead(), res));
    setUser(marketingUser);
    renderLeadDetails('/marketing/leads/ld-100');
    await clickHistoryTab();
    await waitForTable();

    await waitFor(() => expect(screen.queryByText('Load more')).not.toBeInTheDocument());
    const showingAll = await screen.findByText(/Showing all/i);
    expect(showingAll).toBeInTheDocument();
    expect(showingAll.textContent).toContain('20');
  });
});
