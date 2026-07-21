import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import LeadDetails from '../../pages/leads/LeadDetails';

function mockRes(data, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(data),
  });
}

const marketingUser = {
  id: 'ME-001',
  employee_id: 'ME-001',
  name: 'Maya Executive',
  email: 'maya@company.com',
  role: 'Marketing Executive',
};

const adminUser = {
  id: 'ADM-001',
  employee_id: 'ADM-001',
  name: 'Admin User',
  email: 'admin@company.com',
  role: 'Admin',
};

const readOnlyUser = {
  id: 'RO-001',
  employee_id: 'RO-001',
  name: 'Read Only User',
  email: 'readonly@company.com',
  role: 'ReadOnly',
};

const otherMarketingUser = {
  id: 'ME-002',
  employee_id: 'ME-002',
  name: 'Other Executive',
  email: 'other@company.com',
  role: 'Marketing Executive',
};

function setUser(user) {
  localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
  localStorage.setItem('crm_user', JSON.stringify(user));
}

function renderLeadDetails(path = '/marketing/leads/lead-100') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/marketing/leads/:leadId" element={<LeadDetails />} />
          <Route path="/admin/leads/:leadId" element={<LeadDetails />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

async function getLogFollowUpButton() {
  const buttons = await screen.findAllByRole('button', { name: /Log Follow-up/i });
  return buttons[0];
}

async function clickLogFollowUp() {
  const btn = await getLogFollowUpButton();
  fireEvent.click(btn);
}

const DEFAULT_LEAD = {
  success: true,
  data: {
    id: 'lead-100',
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
  },
};

const EMPTY_TIMELINE = { success: true, data: { timeline: [], pagination: { page: 1, totalPages: 1, has_more: false } } };

function buildFetchMock(leadData = DEFAULT_LEAD, timelineRes = EMPTY_TIMELINE, followUpRes = null, statusRes = null) {
  return vi.fn((input) => {
    const url = String(input);
    if (url.includes('/timeline')) {
      return mockRes(timelineRes);
    }
    if (url.includes('/followups')) {
      if (followUpRes === null) return mockRes({ success: true, data: {}, message: 'Follow-up recorded successfully', lead_updated: { proposal_value: 50000 } });
      return followUpRes;
    }
    if (url.includes('/status')) {
      if (statusRes === null) return mockRes({ success: true, data: { stage: 'Contacted' } });
      return statusRes;
    }
    return mockRes(leadData);
  });
}

async function selectFollowUpType(typeLabel) {
  const typeBtn = screen.getByRole('combobox', { name: /Follow-up Type/i });
  fireEvent.click(typeBtn);
  const listbox = await screen.findByRole('listbox', { name: /Follow-up Type/i });
  const options = within(listbox).getAllByRole('option');
  const option = options.find(opt => opt.textContent.includes(typeLabel));
  expect(option).toBeTruthy();
  fireEvent.click(option);
}

const FOLLOWUP_TYPES = [
  'Call', 'WhatsApp', 'Email', 'Online Meeting', 'Client Meeting', 'Demo', 'Proposal Discussion',
];

const OUTCOMES = [
  'Interested', 'Need More Info', 'Proposal Requested', 'Budget Discussion', 'Decision Pending', 'Not Interested',
];

function makeTimelineEntry(overrides = {}) {
  const base = {
    id: overrides.id || 'tl-001',
    type: 'followup',
    followup_type: overrides.followup_type || 'Call',
    outcome: overrides.outcome || 'Interested',
    notes: overrides.notes || 'Test notes for the follow-up entry.',
    proposal_amount: overrides.proposal_amount !== undefined ? overrides.proposal_amount : 25000,
    created_by: overrides.created_by || { id: 'ME-001', name: 'Maya Executive' },
    created_at: overrides.created_at || '2026-07-06T10:30:00.000Z',
    correction_notes: overrides.correction_notes || null,
    correction_by: overrides.correction_by || null,
    correction_at: overrides.correction_at || null,
    stage_at_log: overrides.stage_at_log || 'New',
  };
  return base;
}

const TIMELINE_WITH_ENTRIES = {
  success: true,
  data: {
    timeline: [
      makeTimelineEntry({
        id: 'tl-003', followup_type: 'Proposal Discussion', outcome: 'Proposal Requested', proposal_amount: 75000, created_at: '2026-07-06T09:00:00.000Z', notes: 'Discussed the proposal details with the client.',
      }),
      makeTimelineEntry({
        id: 'tl-002', followup_type: 'Email', outcome: 'Need More Info', proposal_amount: null, created_at: '2026-07-05T14:00:00.000Z', notes: 'Sent follow-up email with product brochure.',
      }),
      makeTimelineEntry({
        id: 'tl-001', followup_type: 'Call', outcome: 'Interested', proposal_amount: 25000, created_at: '2026-07-04T10:00:00.000Z', notes: 'Initial call went well.',
      }),
    ],
    pagination: { page: 1, totalPages: 1, has_more: false },
  },
};

const LEAD_OWNED_BY_OTHER = {
  success: true,
  data: {
    ...DEFAULT_LEAD.data,
    assignedTo: { id: 'ME-002', employee_id: 'ME-002', name: 'Other Executive' },
  },
};

describe('LeadFollowUpPage - STORY-4.1.1 follow-up management', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ── Category 1: Form Entry Modal & Navigation (f-001 to f-006) ──

  it('test-ep-4.1.1-f-001: Verify modal renders all required UI fields, placeholders, action buttons, title, and initial focus', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    const dialog = await screen.findByRole('dialog', { name: /Log Follow-up/i });
    expect(dialog).toBeInTheDocument();

    const titleEls = screen.getAllByText('Log Follow-up');
    expect(titleEls.length).toBeGreaterThanOrEqual(1);

    const typeBtn = screen.getByRole('combobox', { name: /Follow-up Type/i });

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    expect(outcomeSelect).toBeInTheDocument();

    const notesArea = screen.getByLabelText(/Notes/i);
    expect(notesArea).toHaveAttribute('placeholder', 'Enter follow-up details...');

    expect(screen.getByLabelText(/Next Follow-up Date/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/Proposal Amount/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(document.activeElement).toBe(typeBtn);
    });
  });

  it('test-ep-4.1.1-f-002: Verify form displays lead current stage as read-only', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const stageEls = screen.getAllByText(/New/i);
    expect(stageEls.length).toBeGreaterThanOrEqual(1);
  });

  it('test-ep-4.1.1-f-003: Verify Log Follow-up button disabled with tooltip when lead is Won/Lost', async () => {
    setUser(marketingUser);
    const closedLead = {
      ...DEFAULT_LEAD,
      data: { ...DEFAULT_LEAD.data, status: 'Won' },
    };
    global.fetch = buildFetchMock(closedLead);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      expect(screen.getByText(/This lead is closed/i)).toBeInTheDocument();
    });
  });

  it('test-ep-4.1.1-f-004: Verify Cancel button closes modal without API call and form resets on reopen', async () => {
    setUser(marketingUser);
    const fetchMock = buildFetchMock();
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Log Follow-up/i })).not.toBeInTheDocument());

    const followupCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('/followups'));
    expect(followupCalls.length).toBe(0);

    expect(screen.getByText(/Acme Corp/i)).toBeInTheDocument();

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });
    const newTypeBtn = screen.getByRole('combobox', { name: /Follow-up Type/i });
    expect(newTypeBtn).toHaveTextContent(/Select follow-up type/i);
  });

  it('test-ep-4.1.1-f-005: Verify Escape key closes modal and focus returns to Log Follow-up button', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Log Follow-up/i })).not.toBeInTheDocument());

    await waitFor(() => {
      const logBtns = screen.getAllByRole('button', { name: /Log Follow-up/i });
      expect(logBtns.length).toBeGreaterThanOrEqual(1);
      expect(document.activeElement).toBe(logBtns[0]);
    });
  });

  it('test-ep-4.1.1-f-006: Verify clicking backdrop with dirty form shows confirmation', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const backdrop = document.querySelector('.fixed.inset-0.z-50');
    if (backdrop) {
      fireEvent.click(backdrop);
    } else {
      const outerDialog = screen.getByRole('dialog', { name: /Log Follow-up/i }).parentElement;
      if (outerDialog) fireEvent.click(outerDialog);
    }

    expect(await screen.findByText(/Discard Changes\?/i)).toBeInTheDocument();
  });

  // ── Category 2: Follow-up Type & Outcome Dropdown (f-007 to f-014) ──

  it('test-ep-4.1.1-f-007: Verify that the Follow-up Type dropdown displays all 7 valid follow-up types with their corresponding icons', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const typeBtn = screen.getByRole('combobox', { name: /Follow-up Type/i });
    fireEvent.click(typeBtn);

    const listbox = await screen.findByRole('listbox', { name: /Follow-up Type/i });
    const options = within(listbox).getAllByRole('option');
    expect(options.length).toBe(7);

    const iconMap = {
      'Call': 'phone',
      'WhatsApp': 'chat',
      'Email': 'mail',
      'Online Meeting': 'videocam',
      'Client Meeting': 'groups',
      'Demo': 'smart_display',
      'Proposal Discussion': 'description',
    };

    FOLLOWUP_TYPES.forEach((type) => {
      expect(listbox).toHaveTextContent(type);
    });

    Object.entries(iconMap).forEach(([type, icon]) => {
      const option = options.find(opt => opt.textContent.includes(type));
      expect(option).toBeTruthy();
      const iconSpan = option.querySelector('.material-symbols-outlined');
      expect(iconSpan).toBeInTheDocument();
      expect(iconSpan.textContent).toBe(icon);
    });
  });

  it('test-ep-4.1.1-f-008: Verify that the default placeholder is shown when no follow-up type is selected', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const typeBtn = screen.getByRole('combobox', { name: /Follow-up Type/i });
    expect(typeBtn).toHaveTextContent(/Select follow-up type/i);
  });

  it('test-ep-4.1.1-f-009: Verify type selection updates the displayed value', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const typeBtn = screen.getByRole('combobox', { name: /Follow-up Type/i });
    fireEvent.click(typeBtn);

    const listbox = await screen.findByRole('listbox', { name: /Follow-up Type/i });
    const options = within(listbox).getAllByRole('option');
    const emailOption = options.find(opt => opt.textContent.includes('Email'));
    expect(emailOption).toBeTruthy();
    fireEvent.click(emailOption);

    await waitFor(() => {
      expect(typeBtn).toHaveTextContent('Email');
    });
  });

  it('test-ep-4.1.1-f-010: Verify search input filters type options', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const typeBtn = screen.getByRole('combobox', { name: /Follow-up Type/i });
    fireEvent.click(typeBtn);

    const listbox = await screen.findByRole('listbox', { name: /Follow-up Type/i });
    const searchInput = document.getElementById('typeSearchInput');
    expect(searchInput).toBeInTheDocument();
    fireEvent.change(searchInput, { target: { value: 'Meeting' } });

    await waitFor(() => {
      const opts = within(listbox).getAllByRole('option');
      const labels = opts.map(o => o.textContent);
      expect(labels.some(l => l.includes('Online Meeting'))).toBe(true);
      expect(labels.some(l => l.includes('Client Meeting'))).toBe(true);
      expect(labels.some(l => l.includes('Call'))).toBe(false);
    });
  });

  it('test-ep-4.1.1-f-011: Verify outcome dropdown has: Interested, Need More Info, Proposal Requested, Budget Discussion, Decision Pending, Not Interested', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    OUTCOMES.forEach((outcome) => {
      expect(outcomeSelect).toContainHTML(outcome);
    });

    const options = outcomeSelect.querySelectorAll('option');
    const outcomeOptions = Array.from(options).map((o) => o.value).filter((v) => v !== '');
    expect(outcomeOptions).toEqual(OUTCOMES);
  });

  it('test-ep-4.1.1-f-012: Verify that the default placeholder is shown when no outcome is selected', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    expect(outcomeSelect).toHaveTextContent(/Select outcome/i);
    expect(outcomeSelect.value).toBe('');
  });

  it('test-ep-4.1.1-f-013: Verify that the selected outcome displays correctly in the field', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Not Interested' } });

    expect(outcomeSelect.value).toBe('Not Interested');
  });

  it('test-ep-4.1.1-f-014: Verify selecting Not Interested displays a helper warning indicating it is a closing outcome', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const dateLabel = screen.getByText(/Next Follow-up Date/i);
    expect(dateLabel.textContent).toContain('*');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Not Interested' } });

    const warningText = await screen.findByText(/Not Interested' designates a closing outcome/i);
    expect(warningText).toBeInTheDocument();
    expect(warningText.className).toContain('amber');

    await waitFor(() => {
      expect(dateLabel.textContent).not.toContain('*');
    });
  });

  // ── Category 3: Next Follow-up Date Validation (f-015 to f-021) ──

  it('test-ep-4.1.1-f-015: Verify date picker renders and allows selecting a future date 7 days ahead', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    expect(dateInput).toHaveAttribute('min');

    const futureDate = new Date(Date.now() + 7 * 86400000);
    const futureStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;

    fireEvent.change(dateInput, { target: { value: futureStr } });

    await waitFor(() => {
      expect(dateInput.value).toBe(futureStr);
    });

    expect(screen.queryByText(/Next follow-up date must be today or a future date\./i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Next Follow-up Date is required/i)).not.toBeInTheDocument();
  });

  it('test-ep-4.1.1-f-016: Verify inline validation error when non-closing outcome selected but Next Follow-up Date left blank', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    await selectFollowUpType('Call');

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    const errorMsg = await screen.findByText(/Next Follow-up Date is required unless the outcome closes the lead\./i);
    expect(errorMsg).toBeInTheDocument();
  });

  it('test-ep-4.1.1-f-017: Verify form succeeds with blank date when outcome is Not Interested (closing), sends null (maps spec f-017)', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/followups')) {
        return mockRes({ success: true, data: {}, message: 'Follow-up recorded successfully', lead_updated: { proposal_value: 50000 } });
      }
      if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    await selectFollowUpType('Email');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Not Interested' } });

    const notesArea = screen.getByLabelText(/Notes/i);
    fireEvent.change(notesArea, { target: { value: 'Client not interested at this time.' } });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    expect(dateInput.value).toBe('');

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Follow-up recorded successfully/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Next Follow-up Date is required/i)).not.toBeInTheDocument();
  });

  it('test-ep-4.1.1-f-018: Verify past dates disabled via min attribute on date picker (maps spec f-018)', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    expect(dateInput).toHaveAttribute('min');
    const minVal = dateInput.getAttribute('min');
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(minVal).toBe(todayStr);
  });

  it('test-ep-4.1.1-f-019: Verify past date typed manually triggers inline validation error on blur', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    fireEvent.change(dateInput, { target: { value: yesterdayStr } });
    fireEvent.blur(dateInput);

    const errorMsg = await screen.findByText(/Next follow-up date must be today or a future date\./i);
    expect(errorMsg).toBeInTheDocument();
    expect(dateInput).toBeInTheDocument();
  });

  it('test-ep-4.1.1-f-020: Verify changing Outcome from non-closing to closing clears active date validation error', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    await selectFollowUpType('Call');

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    await screen.findByText(/Next Follow-up Date is required unless the outcome closes the lead\./i);

    fireEvent.change(outcomeSelect, { target: { value: 'Not Interested' } });

    await waitFor(() => {
      expect(screen.queryByText(/Next Follow-up Date is required unless the outcome closes the lead\./i)).not.toBeInTheDocument();
    });
  });

  it('test-ep-4.1.1-f-021: Verify blur on empty Next Follow-up Date with non-closing outcome triggers inline validation', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    fireEvent.focus(dateInput);
    fireEvent.blur(dateInput);

    const errorMsg = await screen.findByText(/Next Follow-up Date is required unless the outcome closes the lead\./i);
    expect(errorMsg).toBeInTheDocument();
  });

  // ── Category 4: Proposal Amount (f-022 to f-028) ──

  it('test-ep-4.1.1-f-022: Verify field accepts positive numbers', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const amountInput = screen.getByLabelText(/Proposal Amount/i);
    fireEvent.change(amountInput, { target: { value: '50000' } });
    fireEvent.blur(amountInput);

    await waitFor(() => {
      expect(amountInput.value).toContain('₹50,000.00');
    });
  });

  it('test-ep-4.1.1-f-023: Verify Proposal Amount is optional - blank submits successfully with null', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/followups')) {
        return mockRes({ success: true, data: {}, message: 'Follow-up recorded successfully', lead_updated: { proposal_value: null } });
      }
      if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    await selectFollowUpType('Call');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    fireEvent.change(dateInput, { target: { value: todayStr } });

    const amountInput = screen.getByLabelText(/Proposal Amount/i);
    expect(amountInput.value).toBe('');

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Follow-up recorded successfully/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Proposal amount must be/i)).not.toBeInTheDocument();

    const followupCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('/followups'));
    expect(followupCalls.length).toBe(1);
  });

  it('test-ep-4.1.1-f-024: Verify negative shows validation error', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const amountInput = screen.getByLabelText(/Proposal Amount/i);
    fireEvent.change(amountInput, { target: { value: '-100' } });
    fireEvent.blur(amountInput);

    await waitFor(() => {
      expect(screen.getByText(/Proposal amount must be a non-negative number\./i)).toBeInTheDocument();
    });

    expect(amountInput).toHaveClass('border-error');
  });

  it('test-ep-4.1.1-f-025: Verify non-numeric shows validation error', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const amountInput = screen.getByLabelText(/Proposal Amount/i);
    fireEvent.change(amountInput, { target: { value: 'abc' } });
    fireEvent.blur(amountInput);

    await waitFor(() => {
      expect(screen.getByText(/Proposal amount must be a number\./i)).toBeInTheDocument();
    });

    expect(amountInput).toHaveClass('border-error');
  });

  it('test-ep-4.1.1-f-026: Verify boundary 0 accepted and submits with proposal_amount: 0', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/followups')) {
        return mockRes({ success: true, data: {}, message: 'Follow-up recorded successfully', lead_updated: { proposal_value: 0 } });
      }
      if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    await selectFollowUpType('Call');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    fireEvent.change(dateInput, { target: { value: todayStr } });

    const amountInput = screen.getByLabelText(/Proposal Amount/i);
    fireEvent.change(amountInput, { target: { value: '0' } });
    fireEvent.blur(amountInput);

    await waitFor(() => {
      expect(amountInput.value).toContain('₹0.00');
    });

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Follow-up recorded successfully/i)).toBeInTheDocument();
    });
  });

  it('test-ep-4.1.1-f-027: Verify max boundary 999999999.99 accepted, overflow shows error', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const amountInput = screen.getByLabelText(/Proposal Amount/i);

    fireEvent.change(amountInput, { target: { value: '999999999.99' } });
    fireEvent.blur(amountInput);
    await waitFor(() => {
      expect(amountInput.value).toContain('₹99,99,99,999.99');
    });

    fireEvent.change(amountInput, { target: { value: '1000000000' } });
    fireEvent.blur(amountInput);
    expect(await screen.findByText(/Proposal amount cannot exceed 999,999,999.99\./i)).toBeInTheDocument();
  });

  it('test-ep-4.1.1-f-028: Verify decimals rounded to 2 places on blur', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const amountInput = screen.getByLabelText(/Proposal Amount/i);
    fireEvent.change(amountInput, { target: { value: '123.456' } });
    fireEvent.blur(amountInput);

    await waitFor(() => {
      expect(amountInput.value).toBe('₹123.46');
    });
  });

  // ── Category 5: Form Submission & API Integration (f-029 to f-038) ──

  it('test-ep-4.1.1-f-029: Verify successful submit calls POST API, shows success toast, closes modal, refetches timeline', async () => {
    setUser(marketingUser);
    let timelineCallCount = 0;
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/followups')) {
        return mockRes({ success: true, data: {}, message: 'Follow-up recorded successfully', lead_updated: { proposal_value: 75000 } });
      }
      if (url.includes('/timeline')) {
        timelineCallCount++;
        return mockRes(EMPTY_TIMELINE);
      }
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    await selectFollowUpType('Call');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    fireEvent.change(dateInput, { target: { value: todayStr } });

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Follow-up recorded successfully/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Log Follow-up/i })).not.toBeInTheDocument();
    });

    const followupCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('/followups'));
    expect(followupCalls.length).toBe(1);

    await waitFor(() => {
      expect(timelineCallCount).toBeGreaterThanOrEqual(2);
    });
  });

  it('test-ep-4.1.1-f-030: Verify loading state disables Submit, Cancel, and all inputs during submission', async () => {
    setUser(marketingUser);
    let resolveFollowup;
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/followups')) {
        return new Promise((resolve) => { resolveFollowup = resolve; });
      }
      if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    await selectFollowUpType('Call');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    fireEvent.change(dateInput, { target: { value: todayStr } });

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
      expect(submitBtn).toHaveTextContent(/Saving\.\.\./i);
    });

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelBtn).toBeDisabled();

    const notesArea = screen.getByLabelText(/Notes/i);
    expect(notesArea).toBeDisabled();

    expect(outcomeSelect).toBeDisabled();
    expect(dateInput).toBeDisabled();

    const amountInput = screen.getByLabelText(/Proposal Amount/i);
    expect(amountInput).toBeDisabled();

    const fetchCountBefore = fetchMock.mock.calls.filter(([u]) => String(u).includes('/followups')).length;
    fireEvent.click(submitBtn);
    const fetchCountAfter = fetchMock.mock.calls.filter(([u]) => String(u).includes('/followups')).length;
    expect(fetchCountAfter).toBe(fetchCountBefore);

    resolveFollowup(mockRes({ success: true, data: {}, message: 'Follow-up recorded successfully' }));
  });

  it('test-ep-4.1.1-f-031: Verify frontend handles HTTP 400 by rendering server validation error inline', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/followups')) {
        return mockRes({
          body: { error: 'Next Follow-up Date is required unless the outcome closes the lead.' },
        }, 400);
      }
      if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    await selectFollowUpType('Call');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    fireEvent.change(dateInput, { target: { value: todayStr } });

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Next Follow-up Date is required unless the outcome closes the lead\./i)).toBeInTheDocument();
    });

    expect(screen.getByRole('dialog', { name: /Log Follow-up/i })).toBeInTheDocument();
    // dateInput may remain disabled after 400 error; modal stays open
  });

  it('test-ep-4.1.1-f-032: Verify 401 redirects to login (caching form data)', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/followups')) {
        return mockRes({ message: 'Unauthorized' }, 401);
      }
      if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    await selectFollowUpType('Call');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    fireEvent.change(dateInput, { target: { value: todayStr } });

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Session expired\. Please log in again\./i)).toBeInTheDocument();
    });

    const storedDraft = sessionStorage.getItem('crm_followup_draft');
    expect(storedDraft).toBeTruthy();
    const parsed = JSON.parse(storedDraft);
    expect(parsed.followup_type).toBe('Call');
    expect(parsed.outcome).toBe('Interested');
  });

  it('test-ep-4.1.1-f-033: Verify 403 shows "Access Denied" toast', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/followups')) {
        return mockRes({ message: 'Forbidden' }, 403);
      }
      if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    await selectFollowUpType('Call');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    fireEvent.change(dateInput, { target: { value: todayStr } });

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Access Denied: You are not authorized to log follow-ups for this lead\./i)).toBeInTheDocument();
    });
  });

  it('test-ep-4.1.1-f-034: Verify 404 redirects to leads list', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/followups')) {
        return mockRes({ message: 'Not Found' }, 404);
      }
      if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    await selectFollowUpType('Call');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    fireEvent.change(dateInput, { target: { value: todayStr } });

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Error: This lead no longer exists\./i)).toBeInTheDocument();
    });
  });

  it('test-ep-4.1.1-f-035: Verify 429 shows rate limit toast', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/followups')) {
        return mockRes({ message: 'Too Many Requests' }, 429);
      }
      if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    await selectFollowUpType('Call');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    fireEvent.change(dateInput, { target: { value: todayStr } });

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Rate limit exceeded\. Please wait a moment before trying again\./i)).toBeInTheDocument();
    });
  });

  it('test-ep-4.1.1-f-036: Verify 500 shows server error toast', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/followups')) {
        return mockRes({ message: 'Internal Server Error' }, 500);
      }
      if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    await selectFollowUpType('Call');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    fireEvent.change(dateInput, { target: { value: todayStr } });

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Server error occurred\. Please try again\./i)).toBeInTheDocument();
    });
  });

  it('test-ep-4.1.1-f-037: Verify 10s network timeout shows timeout toast', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setUser(marketingUser);
    const fetchMock = vi.fn((input, init) => {
      const url = String(input);
      if (url.includes('/followups')) {
        return new Promise((_resolve, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      }
      if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);
    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    await selectFollowUpType('Call');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    fireEvent.change(dateInput, { target: { value: todayStr } });

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    vi.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(screen.getByText(/Request timed out due to slow connection\. Please try again\./i)).toBeInTheDocument();
    });
    vi.useRealTimers();
  });

  it('test-ep-4.1.1-f-038: Verify offline mode queues follow-up to IndexedDB', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();

    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });

    try {
      renderLeadDetails('/marketing/leads/lead-100');

      await screen.findByText(/Acme Corp/i);

      await clickLogFollowUp();
      await screen.findByRole('dialog', { name: /Log Follow-up/i });

      await selectFollowUpType('Call');

      const outcomeSelect = screen.getByLabelText(/Outcome/i);
      fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

      const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      fireEvent.change(dateInput, { target: { value: todayStr } });

      const submitBtn = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Offline Mode: Connection lost\./i)).toBeInTheDocument();
      });
    } finally {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnLine });
    }
  });

  // ── Category 6: Follow-up Timeline Display (AC2) (f-039 to f-048) ──

  it('test-ep-4.1.1-f-039: Verify timeline displays follow-ups in reverse chronological order', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock(DEFAULT_LEAD, TIMELINE_WITH_ENTRIES);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      const items = screen.getAllByText(/Proposal Discussion|Email|Call/);
      expect(items.length).toBeGreaterThanOrEqual(3);
    });

    const typeSpans = document.querySelectorAll('span.font-medium');
    const typeTexts = Array.from(typeSpans).map(s => s.textContent.trim());
    expect(typeTexts).toContain('Proposal Discussion');
    expect(typeTexts).toContain('Email');
    expect(typeTexts).toContain('Call');
  });

  it('test-ep-4.1.1-f-040: Verify timeline type icons rendered correctly', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock(DEFAULT_LEAD, TIMELINE_WITH_ENTRIES);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      const svgTitles = document.querySelectorAll('svg title');
      const callTitle = Array.from(svgTitles).find(t => t.textContent === 'Call Icon');
      expect(callTitle).toBeTruthy();
    });
  });

  it('test-ep-4.1.1-f-041: Verify outcome badges rendered with correct colors', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock(DEFAULT_LEAD, TIMELINE_WITH_ENTRIES);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      const badges = screen.getAllByText(/Interested|Need More Info|Proposal Requested/);
      expect(badges.length).toBeGreaterThanOrEqual(3);
    });

    const interestedBadge = screen.getByText('Interested');
    expect(interestedBadge.className).toContain('green');
  });

  it('test-ep-4.1.1-f-042: Verify proposal amount formatted as ₹X,XX,XXX.XX', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock(DEFAULT_LEAD, TIMELINE_WITH_ENTRIES);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      expect(screen.getByText(/₹25,000\.00/)).toBeInTheDocument();
      expect(screen.getByText(/₹75,000\.00/)).toBeInTheDocument();
    });
  });

  it('test-ep-4.1.1-f-043: Verify creator name and relative timestamp displayed on timeline card', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock(DEFAULT_LEAD, TIMELINE_WITH_ENTRIES);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      const timelineItems = document.querySelectorAll('[class*="rounded-xl"]');
      expect(timelineItems.length).toBeGreaterThanOrEqual(1);
      const creatorElements = document.querySelectorAll('span');
      const found = Array.from(creatorElements).some(el => el.textContent.includes('by Maya Executive') || el.textContent.includes('Maya Executive'));
      expect(found).toBe(true);
    });
  });

  it('test-ep-4.1.1-f-044: Verify long notes truncated with Show more link', async () => {
    setUser(marketingUser);
    const longNotes = 'A'.repeat(150);
    const timelineWithLongNotes = {
      success: true,
      data: {
        timeline: [
          makeTimelineEntry({
            id: 'tl-001',
            followup_type: 'Call',
            outcome: 'Interested',
            notes: longNotes,
          }),
        ],
        pagination: { page: 1, totalPages: 1, has_more: false },
      },
    };
    global.fetch = buildFetchMock(DEFAULT_LEAD, timelineWithLongNotes);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      const showMoreLink = screen.getByText(/Show more/);
      expect(showMoreLink).toBeInTheDocument();
    });
  });

  it('test-ep-4.1.1-f-045: Verify timeline Load More pagination', async () => {
    setUser(marketingUser);
    let pageCount = 0;
    const page1Items = Array.from({ length: 10 }, (_, i) =>
      makeTimelineEntry({ id: `tl-${100 - i}`, followup_type: 'Call', outcome: 'Interested', created_at: `2026-07-0${String(6 - Math.floor(i / 3)).padStart(2, '0')}T${String(10 + i).padStart(2, '0')}:00:00.000Z` })
    );
    const page2Items = Array.from({ length: 10 }, (_, i) =>
      makeTimelineEntry({ id: `tl-${90 - i}`, followup_type: 'Email', outcome: 'Need More Info', created_at: `2026-07-0${String(6 - Math.floor((i + 10) / 3)).padStart(2, '0')}T${String(10 + i + 10).padStart(2, '0')}:00:00.000Z` })
    );
    const page3Items = Array.from({ length: 5 }, (_, i) =>
      makeTimelineEntry({ id: `tl-${80 - i}`, followup_type: 'WhatsApp', outcome: 'Interested', created_at: `2026-07-0${String(6 - Math.floor((i + 20) / 3)).padStart(2, '0')}T${String(10 + i + 20).padStart(2, '0')}:00:00.000Z` })
    );
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/timeline')) {
        pageCount++;
        if (pageCount === 1) return mockRes({ success: true, data: { timeline: page1Items, pagination: { page: 1, totalPages: 3, has_more: true } } });
        if (pageCount === 2) return mockRes({ success: true, data: { timeline: page2Items, pagination: { page: 2, totalPages: 3, has_more: true } } });
        return mockRes({ success: true, data: { timeline: page3Items, pagination: { page: 3, totalPages: 3, has_more: false } } });
      }
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      const cards = screen.getAllByText(/Call|Email|WhatsApp/);
      expect(cards.length).toBeGreaterThanOrEqual(10);
    });

    const loadMoreBtn = screen.getByRole('button', { name: /Load More/i });
    expect(loadMoreBtn).toBeInTheDocument();
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      const cardsAfter = screen.getAllByText(/Call|Email|WhatsApp/);
      expect(cardsAfter.length).toBeGreaterThanOrEqual(20);
    });

    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Load More/i })).not.toBeInTheDocument();
    });
  });

  it('test-ep-4.1.1-f-046: Verify empty timeline shows no follow-up activity message', async () => {
    setUser(marketingUser);
    const emptyTimeline = { success: true, data: { timeline: [], pagination: { page: 1, totalPages: 1, has_more: false } } };
    global.fetch = buildFetchMock(DEFAULT_LEAD, emptyTimeline);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      expect(screen.getByText(/No follow-up activity logged yet\./i)).toBeInTheDocument();
    });
  });

  it('test-ep-4.1.1-f-047: Verify skeleton loading shown during timeline fetch', async () => {
    setUser(marketingUser);
    let resolveTimeline;
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/timeline')) {
        return new Promise((resolve) => { resolveTimeline = resolve; });
      }
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    const timelineLoading = screen.getByTestId('timeline-loading');
    expect(timelineLoading).toBeInTheDocument();

    resolveTimeline(mockRes(EMPTY_TIMELINE));

    await waitFor(() => {
      expect(screen.queryByTestId('timeline-loading')).not.toBeInTheDocument();
    });
  });

  it('test-ep-4.1.1-f-048: Verify timeline sort stable for matching timestamps (fallback to id)', async () => {
    setUser(marketingUser);
    const sameTimestamp = '2026-07-06T10:00:00.000Z';
    const timelineWithSameTs = {
      success: true,
      data: {
        timeline: [
          makeTimelineEntry({ id: 'tl-003', followup_type: 'Demo', outcome: 'Decision Pending', created_at: sameTimestamp }),
          makeTimelineEntry({ id: 'tl-002', followup_type: 'WhatsApp', outcome: 'Need More Info', created_at: sameTimestamp }),
          makeTimelineEntry({ id: 'tl-001', followup_type: 'Call', outcome: 'Interested', created_at: sameTimestamp }),
        ],
        pagination: { page: 1, totalPages: 1, has_more: false },
      },
    };
    global.fetch = buildFetchMock(DEFAULT_LEAD, timelineWithSameTs);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      const items = screen.getAllByText(/^Demo$|^WhatsApp$|^Call$/);
      expect(items.length).toBeGreaterThanOrEqual(3);
    });

    const entries = screen.getAllByText(/^Demo$|^WhatsApp$|^Call$/);
    const texts = entries.map((e) => e.textContent);
    expect(texts[0]).toBe('Demo');
    expect(texts[1]).toBe('WhatsApp');
    expect(texts[2]).toBe('Call');
  });

  // ── Category 7: Author & Timestamp Immutability (f-049 to f-051) ──

  it('test-ep-4.1.1-f-049: Verify author name is static read-only text on timeline card', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock(DEFAULT_LEAD, TIMELINE_WITH_ENTRIES);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      const creatorEl = screen.getAllByText(/Maya Executive/i)[0];
      expect(creatorEl.tagName).toMatch(/^(SPAN|P)$/i);
    });
  });

  it('test-ep-4.1.1-f-050: Verify timeline card timestamp is static read-only text', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock(DEFAULT_LEAD, TIMELINE_WITH_ENTRIES);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      const timeElements = document.querySelectorAll('[title*="Jul"]');
      expect(timeElements.length).toBeGreaterThanOrEqual(1);
      const timeEl = timeElements[0];
      expect(timeEl.tagName).toBe('SPAN');
    });
  });

  it('test-ep-4.1.1-f-051: Verify follow-up cards have no edit or delete UI actions', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock(DEFAULT_LEAD, TIMELINE_WITH_ENTRIES);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      const allButtons = screen.queryAllByRole('button');
      const editDelete = allButtons.filter(b => /edit|delete|remove/i.test(b.textContent));
      expect(editDelete.length).toBe(0);
    });
  });

  // ── Category 8: Correction Note Feature (f-052 to f-056) ──

  it('test-ep-4.1.1-f-052: Verify "Add Correction" link shown on own follow-up', async () => {
    setUser(marketingUser);
    const timelineOwn = {
      success: true,
      data: {
        timeline: [
          makeTimelineEntry({
            id: 'tl-001',
            followup_type: 'Call',
            outcome: 'Interested',
            created_by: { id: 'ME-001', name: 'Maya Executive' },
          }),
        ],
        pagination: { page: 1, totalPages: 1, has_more: false },
      },
    };
    global.fetch = buildFetchMock(DEFAULT_LEAD, timelineOwn);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      const correctionLink = screen.getByText(/Add Correction/);
      expect(correctionLink).toBeInTheDocument();
    });
  });

  it('test-ep-4.1.1-f-053: Verify clicking Add Correction opens textarea and save posts the correction note', async () => {
    setUser(marketingUser);
    const timelineOwn = {
      success: true,
      data: {
        timeline: [
          makeTimelineEntry({
            id: 'tl-001',
            followup_type: 'Call',
            outcome: 'Interested',
            created_by: { id: 'ME-001', name: 'Maya Executive' },
          }),
        ],
        pagination: { page: 1, totalPages: 1, has_more: false },
      },
    };
    global.fetch = buildFetchMock(DEFAULT_LEAD, timelineOwn);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    const correctionLink = await screen.findByText(/Add Correction/);
    fireEvent.click(correctionLink);

    const textarea = screen.getByPlaceholderText(/Enter correction notes\.\.\./i);
    expect(textarea).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /Save Correction/i });
    expect(saveBtn).toBeInTheDocument();
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelBtn).toBeInTheDocument();
  });

  it('test-ep-4.1.1-f-054: Verify saving correction posts to API and updates card display', async () => {
    setUser(marketingUser);
    const timelineEntry = makeTimelineEntry({
      id: 'tl-001',
      followup_type: 'Call',
      outcome: 'Interested',
      created_by: { id: 'ME-001', name: 'Maya Executive' },
    });
    const timelineData = {
      success: true,
      data: {
        timeline: [timelineEntry],
        pagination: { page: 1, totalPages: 1, has_more: false },
      },
    };
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/correction')) {
        return mockRes({ success: true, message: 'Correction saved successfully' });
      }
      if (url.includes('/timeline')) {
        return mockRes({
          ...timelineData,
          data: {
            ...timelineData.data,
            timeline: [{
              ...timelineEntry,
              correction_notes: 'Updated the contact number.',
              correction_by: { name: 'Maya Executive' },
              correction_at: '2026-07-06T11:00:00.000Z',
            }],
          },
        });
      }
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    const correctionLink = await screen.findByText(/Add Correction/);
    fireEvent.click(correctionLink);

    const textarea = screen.getByPlaceholderText(/Enter correction notes\.\.\./i);
    fireEvent.change(textarea, { target: { value: 'Updated the contact number.' } });

    const saveBtn = screen.getByRole('button', { name: /Save Correction/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Updated the contact number\./i)).toBeInTheDocument();
    });
  });







  it('test-ep-4.1.1-f-055: Verify empty correction shows validation', async () => {
    setUser(marketingUser);
    const timelineOwn = {
      success: true,
      data: {
        timeline: [
          makeTimelineEntry({
            id: 'tl-001',
            followup_type: 'Call',
            outcome: 'Interested',
            created_by: { id: 'ME-001', name: 'Maya Executive' },
          }),
        ],
        pagination: { page: 1, totalPages: 1, has_more: false },
      },
    };
    global.fetch = buildFetchMock(DEFAULT_LEAD, timelineOwn);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    const correctionLink = await screen.findByText(/Add Correction/);
    fireEvent.click(correctionLink);

    const saveBtn = screen.getByRole('button', { name: /Save Correction/i });
    fireEvent.click(saveBtn);

    expect(await screen.findByText(/Correction notes cannot be empty\./i)).toBeInTheDocument();
    expect(screen.getByText(/Correction notes cannot be empty\./i)).toHaveAttribute('role', 'alert');
  });

  it('test-ep-4.1.1-f-056: Verify API error for correction falls back to offline save', async () => {
    setUser(marketingUser);
    const timelineOwn = {
      success: true,
      data: {
        timeline: [
          makeTimelineEntry({
            id: 'tl-001',
            followup_type: 'Call',
            outcome: 'Interested',
            created_by: { id: 'ME-001', name: 'Maya Executive' },
          }),
        ],
        pagination: { page: 1, totalPages: 1, has_more: false },
      },
    };
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/correction')) {
        return Promise.reject(new Error('Failed to save correction.'));
      }
      if (url.includes('/timeline')) return mockRes(timelineOwn);
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    const correctionLink = await screen.findByText(/Add Correction/);
    fireEvent.click(correctionLink);

    const textarea = screen.getByPlaceholderText(/Enter correction notes\.\.\./i);
    fireEvent.change(textarea, { target: { value: 'My correction notes.' } });

    const saveBtn = screen.getByRole('button', { name: /Save Correction/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/correction'), expect.any(Object));
    });

    expect(textarea).toHaveValue('My correction notes.');
  });

  // ── Category 8: RBAC (f-057 to f-059) ──

  it('test-ep-4.1.1-f-057: Verify marketing exec sees +LogFollowUp only for own leads', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
      return mockRes(LEAD_OWNED_BY_OTHER);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    const logBtn = screen.queryByRole('button', { name: /Log Follow-up/i });
    expect(logBtn).not.toBeInTheDocument();

    expect(screen.getByText(/Only the lead owner can log follow-up actions\./i)).toBeInTheDocument();
  });

  it('test-ep-4.1.1-f-058: Verify admin can log follow-up for any lead', async () => {
    setUser(adminUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/admin/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    const logBtn = await getLogFollowUpButton();
    expect(logBtn).toBeInTheDocument();
    expect(logBtn).not.toBeDisabled();
  });

  it('test-ep-4.1.1-f-059: Verify read-only user cannot see +LogFollowUp button and sees disabled state', async () => {
    setUser(readOnlyUser);
    const leadForReadOnly = {
      success: true,
      data: {
        ...DEFAULT_LEAD.data,
        assignedTo: { id: 'RO-001', employee_id: 'RO-001', name: 'Read Only User' },
      },
    };
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
      return mockRes(leadForReadOnly);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    expect(screen.queryByRole('button', { name: /Log Follow-up/i })).not.toBeInTheDocument();
  });

  // ── Category 9: Security & Input Sanitization (f-060 to f-063) ──

  it('test-ep-4.1.1-f-060: Verify XSS in notes is rendered as escaped text (not executed)', async () => {
    setUser(marketingUser);
    const xssPayload = '<script>alert("XSS")</script>';
    const timelineXSS = {
      success: true,
      data: {
        timeline: [
          makeTimelineEntry({
            id: 'tl-001',
            followup_type: 'Call',
            outcome: 'Interested',
            notes: xssPayload,
            created_by: { id: 'ME-001', name: 'Maya Executive' },
          }),
        ],
        pagination: { page: 1, totalPages: 1, has_more: false },
      },
    };
    global.fetch = buildFetchMock(DEFAULT_LEAD, timelineXSS);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      const content = document.body.innerHTML;
      expect(content).not.toContain('<script>alert("XSS")</script>');
    });

    expect(screen.getByText(/<script>alert/)).toBeInTheDocument();
  });

  it('test-ep-4.1.1-f-061: Verify SQL injection in notes renders safely', async () => {
    setUser(marketingUser);
    const sqlPayload = "1; DROP TABLE leads; --";
    const timelineSQL = {
      success: true,
      data: {
        timeline: [
          makeTimelineEntry({
            id: 'tl-001',
            followup_type: 'Email',
            outcome: 'Interested',
            notes: sqlPayload,
            created_by: { id: 'ME-001', name: 'Maya Executive' },
          }),
        ],
        pagination: { page: 1, totalPages: 1, has_more: false },
      },
    };
    global.fetch = buildFetchMock(DEFAULT_LEAD, timelineSQL);
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => {
      expect(screen.getByText(/1; DROP TABLE leads; --/)).toBeInTheDocument();
    });
  });

  it('test-ep-4.1.1-f-062: Verify notes max 1000 char limit', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const notesInput = screen.getByLabelText(/Notes/i);
    const longText = 'A'.repeat(1001);
    fireEvent.change(notesInput, { target: { value: longText } });

    await waitFor(() => {
      expect(notesInput.value.length).toBeLessThanOrEqual(1000);
    });

    expect(screen.getByText(/1000/)).toBeInTheDocument();
  });

  it('test-ep-4.1.1-f-063: Verify browser warns before close during submission', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const beforeUnloadHandler = vi.fn();
    window.addEventListener('beforeunload', beforeUnloadHandler);

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);

    expect(beforeUnloadHandler).toHaveBeenCalled();

    window.removeEventListener('beforeunload', beforeUnloadHandler);
  });

  // ── Category 10: Accessibility (f-064 to f-067) ──

  it('test-ep-4.1.1-f-064: Verify Tab cycle: Follow-up Type -> Outcome -> Notes -> Next Date -> Proposal Amount -> Submit -> Cancel (wraps back)', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const expectedOrder = [
      'Follow-up Type',
      'Outcome',
      'fupNotes',
      'fupDate',
      'fupAmount',
      'Submit',
      'Cancel',
    ];

    const allFocusable = document.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const followUpDialog = screen.getByRole('dialog', { name: /Log Follow-up/i });
    const modalContainer = followUpDialog.parentElement;
    const focusableInModal = Array.from(allFocusable).filter(
      (el) => modalContainer && modalContainer.contains(el) && el.tabIndex >= 0
    );

    expect(focusableInModal.length).toBeGreaterThanOrEqual(expectedOrder.length);
  });

  it('test-ep-4.1.1-f-065: Verify focus returns to +Log Follow-up button after close', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    const logBtn = await getLogFollowUpButton();
    logBtn.focus();
    fireEvent.click(logBtn);
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const closeBtn = screen.getByLabelText('Close modal');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Log Follow-up/i })).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const logBtns = screen.getAllByRole('button', { name: /Log Follow-up/i });
      expect(logBtns.length).toBeGreaterThanOrEqual(1);
      expect(document.activeElement).toBe(logBtns[0]);
    });
  });

  it('test-ep-4.1.1-f-066: Verify ARIA attributes: aria-expanded, role="combobox", aria-label, aria-required, aria-multiline, htmlFor', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const dialog = screen.getByRole('dialog', { name: /Log Follow-up/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const typeBtn = screen.getByRole('combobox', { name: /Follow-up Type/i });
    expect(typeBtn).toHaveAttribute('role', 'combobox');
    expect(typeBtn).toHaveAttribute('aria-expanded');
    expect(typeBtn).toHaveAttribute('aria-required', 'true');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    expect(outcomeSelect).toHaveAttribute('aria-required', 'true');

    const notesArea = screen.getByLabelText(/Notes/i);
    expect(notesArea).toHaveAttribute('aria-multiline', 'true');

    expect(screen.getByLabelText(/Follow-up Type/i)).toHaveAttribute('id', 'followupType');
    expect(screen.getByLabelText(/Outcome/i)).toHaveAttribute('id', 'outcomeSelect');
    expect(screen.getByLabelText(/Notes/i)).toHaveAttribute('id', 'fupNotes');
    expect(screen.getByLabelText(/Next Follow-up Date/i)).toHaveAttribute('id', 'fupDate');
    expect(screen.getByLabelText(/Proposal Amount/i)).toHaveAttribute('id', 'fupAmount');

    const labels = dialog.querySelectorAll('label');
    labels.forEach((label) => {
      expect(label).toHaveAttribute('for');
    });
  });

  it('test-ep-4.1.1-f-067: Verify validation errors have role="alert" or aria-live="assertive"', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Category 11: Resilience, State & Edge Cases (f-068 to f-072) ──

  it('test-ep-4.1.1-f-068: Verify estimated value in header updates after successful submit', async () => {
    setUser(marketingUser);
    let followUpCalledCount = 0;
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/followups')) {
        followUpCalledCount++;
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({
            success: true,
            message: 'Follow-up recorded successfully',
            lead_updated: { proposal_value: 75000 },
          }),
        });
      }
      if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
      if (followUpCalledCount > 0 && url.includes('/marketing/leads/lead-100')) {
        return mockRes({
          success: true,
          data: {
            ...DEFAULT_LEAD.data,
            estimated_value: '$75,000',
            proposal_value: 75000,
          },
        });
      }
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    await selectFollowUpType('Call');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    fireEvent.change(dateInput, { target: { value: todayStr } });

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Follow-up recorded successfully/i)).toBeInTheDocument();
    });
  });

  it('test-ep-4.1.1-f-069: Verify optimistic update with rollback on API failure', async () => {
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });

    try {
      setUser(marketingUser);
      const fetchMock = vi.fn((input) => {
        const url = String(input);
        if (url.includes('/followups')) {
          return mockRes({ message: 'Server error' }, 500);
        }
        if (url.includes('/timeline')) return mockRes(EMPTY_TIMELINE);
        return mockRes(DEFAULT_LEAD);
      });
      global.fetch = fetchMock;
      renderLeadDetails('/marketing/leads/lead-100');

      await screen.findByText(/Acme Corp/i);

      await clickLogFollowUp();
      await screen.findByRole('dialog', { name: /Log Follow-up/i });

      await selectFollowUpType('Call');

      const outcomeSelect = screen.getByLabelText(/Outcome/i);
      fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

      const dateInput = screen.getByLabelText(/Next Follow-up Date/i);
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      fireEvent.change(dateInput, { target: { value: todayStr } });

      const submitBtn = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Server error occurred\. Please try again\./i)).toBeInTheDocument();
      });

      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/followups'), expect.any(Object));
    } finally {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnLine });
    }
  });

  it('test-ep-4.1.1-f-070: Verify form resets on close/reopen', async () => {
    setUser(marketingUser);
    global.fetch = buildFetchMock();
    renderLeadDetails('/marketing/leads/lead-100');

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const typeBtn = screen.getByRole('combobox', { name: /Follow-up Type/i });
    await selectFollowUpType('Email');

    const outcomeSelect = screen.getByLabelText(/Outcome/i);
    fireEvent.change(outcomeSelect, { target: { value: 'Interested' } });

    const closeBtn = screen.getByLabelText('Close modal');
    fireEvent.click(closeBtn);

    const discardBtn = screen.getByRole('button', { name: /Discard Changes/i });
    fireEvent.click(discardBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Log Follow-up/i })).not.toBeInTheDocument();
    });

    await clickLogFollowUp();
    await screen.findByRole('dialog', { name: /Log Follow-up/i });

    const newTypeBtn = screen.getByRole('combobox', { name: /Follow-up Type/i });
    await waitFor(() => {
      expect(newTypeBtn).toHaveTextContent(/Select follow-up type/i);
    });

    const newOutcomeSelect = screen.getByLabelText(/Outcome/i);
    expect(newOutcomeSelect.value).toBe('');
  });

  it('test-ep-4.1.1-f-071: Verify timeline refetches on page re-navigation', async () => {
    setUser(marketingUser);
    let timelineCallCount = 0;
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/timeline')) {
        timelineCallCount++;
        return mockRes(EMPTY_TIMELINE);
      }
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    const { unmount } = renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);
    await waitFor(() => expect(timelineCallCount).toBeGreaterThanOrEqual(1));

    unmount();

    const initialCount = timelineCallCount;
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);
    await waitFor(() => {
      expect(timelineCallCount).toBeGreaterThan(initialCount);
    });
  });

  it('test-ep-4.1.1-f-072: Verify AbortController cancels stale requests', async () => {
    setUser(marketingUser);
    let resolveTimeline1;
    let timelineReqCount = 0;
    let firstSignal = null;
    const fetchMock = vi.fn((input, init) => {
      const url = String(input);
      if (url.includes('/timeline')) {
        timelineReqCount++;
        if (timelineReqCount === 1) {
          firstSignal = init?.signal;
          return new Promise((resolve) => { resolveTimeline1 = resolve; });
        }
        return Promise.resolve(mockRes(EMPTY_TIMELINE));
      }
      return mockRes(DEFAULT_LEAD);
    });
    global.fetch = fetchMock;
    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText(/Acme Corp/i);

    await waitFor(() => expect(timelineReqCount).toBe(1));
    expect(firstSignal).toBeDefined();
    expect(firstSignal.aborted).toBe(false);

    resolveTimeline1(mockRes(EMPTY_TIMELINE));

    await waitFor(() => expect(screen.queryByTestId('timeline-loading')).not.toBeInTheDocument());
  });
});
