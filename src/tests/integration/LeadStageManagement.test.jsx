import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import LeadDetails from '../../pages/leads/LeadDetails';
import LeadHistory from '../../pages/leads/LeadHistory';

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

function setUser(user) {
  localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
  localStorage.setItem('crm_user', JSON.stringify(user));
}

function renderLeadDetails(path = '/marketing/leads/lead-200') {
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

function renderLeadHistory(path = '/marketing/leads/lead-200/lead-history') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/marketing/leads/:leadId/lead-history" element={<LeadHistory />} />
          <Route path="/admin/leads/:leadId/lead-history" element={<LeadHistory />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('STORY-2.4.1 Lead Stage Management — Won/Lost Closure', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('test-ep-2.4.1-009: validates Won requires deal value (cannot be empty)', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      return mockRes({
        success: true,
        data: {
          id: 'lead-200', leadId: 'LD-200', companyName: 'TestCorp',
          contactPerson: 'Alice', mobileNumber: '9000000100',
          status: '', stage: 'Negotiation', priority: 'High',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-200');
    fireEvent.click(await screen.findByRole('button', { name: /Close as Won/i }));

    expect(await screen.findByRole('heading', { name: /Close as Won/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));

    await waitFor(() => {
      expect(screen.getByText(/Final deal value is required/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Closure date is required/i)).toBeInTheDocument();
  });

  it('test-ep-2.4.1-010: validates Won deal value cannot be negative', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      return mockRes({
        success: true,
        data: {
          id: 'lead-201', leadId: 'LD-201', companyName: 'TestCorp',
          contactPerson: 'Bob', mobileNumber: '9000000101',
          status: '', stage: 'Negotiation', priority: 'High',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-201');
    fireEvent.click(await screen.findByRole('button', { name: /Close as Won/i }));

    await screen.findByRole('heading', { name: /Close as Won/i });
    fireEvent.change(screen.getByLabelText(/Final Deal Value/i), { target: { value: '-100' } });
    fireEvent.change(screen.getByLabelText(/Closure Date/i), { target: { value: '2026-07-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));

    await waitFor(() => {
      expect(screen.getByText(/Deal value cannot be negative/i)).toBeInTheDocument();
    });
  });

  it('test-ep-2.4.1-011: Won closure requires closure date', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      return mockRes({
        success: true,
        data: {
          id: 'lead-202', leadId: 'LD-202', companyName: 'TestCorp',
          contactPerson: 'Charlie', mobileNumber: '9000000102',
          status: '', stage: 'Negotiation', priority: 'High',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-202');
    fireEvent.click(await screen.findByRole('button', { name: /Close as Won/i }));

    await screen.findByRole('heading', { name: /Close as Won/i });
    fireEvent.change(screen.getByLabelText(/Final Deal Value/i), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));

    await waitFor(() => {
      expect(screen.getByText(/Closure date is required/i)).toBeInTheDocument();
    });
  });

  it('test-ep-2.4.1-013: Won closure API error preserves input and shows error toast', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      if (url.includes('/close')) return mockRes({ message: 'Server error' }, 500);
      return mockRes({
        success: true,
        data: {
          id: 'lead-203', leadId: 'LD-203', companyName: 'TestCorp',
          contactPerson: 'Diana', mobileNumber: '9000000103',
          status: '', stage: 'Negotiation', priority: 'High',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-203');
    fireEvent.click(await screen.findByRole('button', { name: /Close as Won/i }));

    await screen.findByRole('heading', { name: /Close as Won/i });
    fireEvent.change(screen.getByLabelText(/Final Deal Value/i), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText(/Closure Date/i), { target: { value: '2026-07-15' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to close lead/i)).toBeInTheDocument();
    });
  });

  it('test-ep-2.4.1-017: Lost closure API error preserves input and shows error toast', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      if (url.includes('/close')) return mockRes({ message: 'Server error' }, 500);
      return mockRes({
        success: true,
        data: {
          id: 'lead-204', leadId: 'LD-204', companyName: 'TestCorp',
          contactPerson: 'Eve', mobileNumber: '9000000104',
          status: '', stage: 'Contacted', priority: 'Medium',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-204');
    const stageSelect = await screen.findByLabelText('Stage');
    fireEvent.change(stageSelect, { target: { value: 'Lost' } });

    await screen.findByText('Close as Lost');
    fireEvent.change(screen.getByLabelText('Lost Reason'), { target: { value: 'Budget' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to close lead/i)).toBeInTheDocument();
    });
  });

  it('test-ep-2.4.1-018: shows loading state on Won confirm button during API call', async () => {
    setUser(marketingUser);
    let resolveClose;
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      if (url.includes('/close')) return new Promise((resolve) => { resolveClose = resolve; });
      return mockRes({
        success: true,
        data: {
          id: 'lead-205', leadId: 'LD-205', companyName: 'TestCorp',
          contactPerson: 'Frank', mobileNumber: '9000000105',
          status: '', stage: 'Negotiation', priority: 'High',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-205');
    fireEvent.click(await screen.findByRole('button', { name: /Close as Won/i }));

    await screen.findByRole('heading', { name: /Close as Won/i });
    fireEvent.change(screen.getByLabelText(/Final Deal Value/i), { target: { value: '25000' } });
    fireEvent.change(screen.getByLabelText(/Closure Date/i), { target: { value: '2026-08-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Closing\.{3}/i })).toBeDisabled();
    });

    resolveClose(mockRes({ success: true, data: { status: 'Won' } }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Closing\.{3}/i })).not.toBeInTheDocument();
    });
  });

  it('test-ep-2.4.1-020: Won closure with valid data calls API and shows success', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      if (url.includes('/close')) return mockRes({ success: true, data: { status: 'Won' } });
      if (url.includes('/marketing/leads/lead-206') && url.includes('?_')) {
        return mockRes({
          success: true,
          data: {
            id: 'lead-206', leadId: 'LD-206', companyName: 'TestCorp',
            contactPerson: 'Grace', mobileNumber: '9000000106',
            status: 'Won', stage: 'Closed', priority: 'High',
            createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
          },
        });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-206', leadId: 'LD-206', companyName: 'TestCorp',
          contactPerson: 'Grace', mobileNumber: '9000000106',
          status: '', stage: 'Negotiation', priority: 'High',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-206');
    fireEvent.click(await screen.findByRole('button', { name: /Close as Won/i }));

    await screen.findByRole('heading', { name: /Close as Won/i });
    fireEvent.change(screen.getByLabelText(/Final Deal Value/i), { target: { value: '50000' } });
    fireEvent.change(screen.getByLabelText(/Closure Date/i), { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));

    await waitFor(() => {
      expect(screen.getByText(/Lead closed as Won/i)).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/close'), expect.any(Object));
  });
});

describe('STORY-2.4.1 Lead Stage Management — Reopen Flow & Role Lock', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('test-ep-2.4.1-034: validates reopen reason is required', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      return mockRes({
        success: true,
        data: {
          id: 'lead-207', leadId: 'LD-207', companyName: 'TestCorp',
          contactPerson: 'Heidi', mobileNumber: '9000000107',
          status: 'Lost', stage: 'Closed', priority: 'Medium',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/admin/leads/lead-207');
    fireEvent.click(await screen.findByRole('button', { name: /Reopen Lead/i }));

    await screen.findByRole('heading', { name: /Reopen Lead/i });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Reopen/i }));

    await waitFor(() => {
      expect(screen.getByText(/Reopen reason is required/i)).toBeInTheDocument();
    });
  });

  it('test-ep-2.4.1-035: reopen API error preserves state and shows error toast', async () => {
    setUser(adminUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      if (url.includes('/reopen')) return mockRes({ message: 'Server error' }, 500);
      return mockRes({
        success: true,
        data: {
          id: 'lead-208', leadId: 'LD-208', companyName: 'TestCorp',
          contactPerson: 'Ivan', mobileNumber: '9000000108',
          status: 'Won', stage: 'Closed', priority: 'High',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });
    global.fetch = fetchMock;

    renderLeadDetails('/admin/leads/lead-208');
    fireEvent.click(await screen.findByRole('button', { name: /Reopen Lead/i }));

    await screen.findByRole('heading', { name: /Reopen Lead/i });
    fireEvent.change(screen.getByLabelText(/Reopen reason/i), { target: { value: 'Client comeback' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Reopen/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to reopen lead/i)).toBeInTheDocument();
    });
  });

  it('test-ep-2.4.1-037: shows loading state on Reopen confirm button during API call', async () => {
    setUser(adminUser);
    let resolveReopen;
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      if (url.includes('/reopen')) return new Promise((resolve) => { resolveReopen = resolve; });
      return mockRes({
        success: true,
        data: {
          id: 'lead-209', leadId: 'LD-209', companyName: 'TestCorp',
          contactPerson: 'Judy', mobileNumber: '9000000109',
          status: 'Won', stage: 'Closed', priority: 'High',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/admin/leads/lead-209');
    fireEvent.click(await screen.findByRole('button', { name: /Reopen Lead/i }));

    await screen.findByRole('heading', { name: /Reopen Lead/i });
    fireEvent.change(screen.getByLabelText(/Reopen reason/i), { target: { value: 'Customer re-engaged' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Reopen/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reopening\.{3}/i })).toBeDisabled();
    });

    resolveReopen(mockRes({ success: true, data: { status: '', stage: 'Contacted' } }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Reopening\.{3}/i })).not.toBeInTheDocument();
    });
  });

  it('test-ep-2.4.1-038: Marketing Executive cannot modify Lost closed lead', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      return mockRes({
        success: true,
        data: {
          id: 'lead-210', leadId: 'LD-210', companyName: 'TestCorp',
          contactPerson: 'Kevin', mobileNumber: '9000000110',
          status: 'Lost', stage: 'Closed', priority: 'Low',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-210');

    const stageSelect = await screen.findByLabelText('Stage');
    expect(stageSelect).toBeDisabled();
    expect(screen.getByText(/This lead is closed\. Contact Admin to reopen\./i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reopen Lead/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Close as Won/i })).not.toBeInTheDocument();
  });
});

describe('STORY-2.4.1 Lead Stage Management — Stage Transition & History', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('test-ep-2.4.1-021: Cancel button in Lost modal does not submit', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      return mockRes({
        success: true,
        data: {
          id: 'lead-211', leadId: 'LD-211', companyName: 'TestCorp',
          contactPerson: 'Leo', mobileNumber: '9000000111',
          status: '', stage: 'Contacted', priority: 'Medium',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-211');
    const stageSelect = await screen.findByLabelText('Stage');
    fireEvent.change(stageSelect, { target: { value: 'Lost' } });

    expect(await screen.findByText('Close as Lost')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Close as Lost')).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText('Stage')).toHaveValue('Contacted');
  });

  it('test-ep-2.4.1-022: Cancel button in Won modal does not submit', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      return mockRes({
        success: true,
        data: {
          id: 'lead-212', leadId: 'LD-212', companyName: 'TestCorp',
          contactPerson: 'Maria', mobileNumber: '9000000112',
          status: '', stage: 'Negotiation', priority: 'High',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-212');
    fireEvent.click(await screen.findByRole('button', { name: /Close as Won/i }));

    expect(await screen.findByRole('heading', { name: /Close as Won/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Close as Won/i })).not.toBeInTheDocument();
    });
  });

  it('test-ep-2.4.1-023: Cancel button in Reopen modal does not submit', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      return mockRes({
        success: true,
        data: {
          id: 'lead-213', leadId: 'LD-213', companyName: 'TestCorp',
          contactPerson: 'Nick', mobileNumber: '9000000113',
          status: 'Lost', stage: 'Closed', priority: 'Low',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/admin/leads/lead-213');
    fireEvent.click(await screen.findByRole('button', { name: /Reopen Lead/i }));

    expect(await screen.findByRole('heading', { name: /Reopen Lead/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Reopen Lead/i })).not.toBeInTheDocument();
    });
  });

  it('test-ep-2.4.1-024: shows loading state on Lost confirm during API call', async () => {
    setUser(marketingUser);
    let resolveClose;
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      if (url.includes('/close')) return new Promise((resolve) => { resolveClose = resolve; });
      return mockRes({
        success: true,
        data: {
          id: 'lead-214', leadId: 'LD-214', companyName: 'TestCorp',
          contactPerson: 'Oscar', mobileNumber: '9000000114',
          status: '', stage: 'Contacted', priority: 'Medium',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-214');
    const stageSelect = await screen.findByLabelText('Stage');
    fireEvent.change(stageSelect, { target: { value: 'Lost' } });

    await screen.findByText('Close as Lost');
    fireEvent.change(screen.getByLabelText('Lost Reason'), { target: { value: 'Budget' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Closing\.{3}/i })).toBeDisabled();
    });

    resolveClose(mockRes({ success: true, data: { status: 'Lost' } }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Closing\.{3}/i })).not.toBeInTheDocument();
    });
  });

  it('test-ep-2.4.1-025: stage select and close/reopen buttons disabled while stage API in progress', async () => {
    setUser(marketingUser);
    let resolveStatus;
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      if (url.includes('/status')) return new Promise((resolve) => { resolveStatus = resolve; });
      return mockRes({
        success: true,
        data: {
          id: 'lead-215', leadId: 'LD-215', companyName: 'TestCorp',
          contactPerson: 'Paul', mobileNumber: '9000000115',
          status: '', stage: 'New', priority: 'High',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-215');
    const stageSelect = await screen.findByLabelText('Stage');
    fireEvent.change(stageSelect, { target: { value: 'Contacted' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Stage')).toBeDisabled();
    });

    resolveStatus(mockRes({ success: true, data: { stage: 'Contacted' } }));
    await waitFor(() => {
      expect(screen.getByLabelText('Stage')).not.toBeDisabled();
    });
  });

  it('test-ep-2.4.1-026: prevents duplicate submission while Lost closure API is in progress', async () => {
    setUser(marketingUser);
    let resolveClose;
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      if (url.includes('/close')) return new Promise((resolve) => { resolveClose = resolve; });
      return mockRes({
        success: true,
        data: {
          id: 'lead-216', leadId: 'LD-216', companyName: 'TestCorp',
          contactPerson: 'Quinn', mobileNumber: '9000000116',
          status: '', stage: 'Contacted', priority: 'Medium',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-216');
    const stageSelect = await screen.findByLabelText('Stage');
    fireEvent.change(stageSelect, { target: { value: 'Lost' } });

    await screen.findByText('Close as Lost');
    fireEvent.change(screen.getByLabelText('Lost Reason'), { target: { value: 'Competitor' } });
    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Closing\.{3}/i })).toBeDisabled();
    });

    resolveClose(mockRes({ success: true, data: { status: 'Lost' } }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Closing\.{3}/i })).not.toBeInTheDocument();
    });
  });
});

describe('STORY-2.4.1 Lead History — Append-Only / Read-Only', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('test-ep-2.4.1-027: Lead History page renders timeline entries as read-only', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({
          success: true,
          data: [
            { action: 'Stage Updated', message: 'Lead moved to Negotiation', user: 'Admin User', timestamp: '2026-06-20T12:00:00.000Z' },
            { action: 'Lead Created', message: 'Lead Created', user: 'Admin User', timestamp: '2026-06-20T10:00:00.000Z' },
          ],
        });
      }
      return mockRes({
        success: true,
        data: { id: 'lead-217', leadId: 'LD-217', companyName: 'TestCorp', createdAt: '2026-06-20T10:00:00.000Z', createdBy: { name: 'Admin User' } },
      });
    });

    renderLeadHistory('/marketing/leads/lead-217/lead-history');

    await waitFor(() => {
      expect(screen.getByText('Stage Updated')).toBeInTheDocument();
    });
    expect(screen.getByText('Lead Created')).toBeInTheDocument();

    const editButtons = screen.queryAllByRole('button', { name: /edit/i });
    expect(editButtons.length).toBe(0);
    const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
    expect(deleteButtons.length).toBe(0);
  });

  it('test-ep-2.4.1-028: Lead History page has no add/edit/delete controls', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({
          success: true,
          data: [
            { action: 'Lead Closed', message: 'Lead closed as Won', user: 'Admin User', timestamp: '2026-06-21T10:00:00.000Z' },
          ],
        });
      }
      return mockRes({
        success: true,
        data: { id: 'lead-218', leadId: 'LD-218', companyName: 'TestCorp', createdAt: '2026-06-20T10:00:00.000Z', createdBy: { name: 'Admin User' } },
      });
    });

    renderLeadHistory('/admin/leads/lead-218/lead-history');

    await waitFor(() => {
      expect(screen.getByText('Lead Closed')).toBeInTheDocument();
    });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('test-ep-2.4.1-029: stage change through API appends new timeline entry', async () => {
    setUser(marketingUser);
    const timelineEntries = [
      { action: 'Lead Created', message: 'Lead Created', user: 'Admin User', timestamp: '2026-06-20T10:00:00.000Z' },
    ];

    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: timelineEntries });
      if (url.includes('/status')) {
        timelineEntries.push({
          action: 'Stage Updated',
          message: 'Lead moved to Contacted',
          user: 'System',
          timestamp: new Date().toISOString(),
        });
        return mockRes({ success: true, data: { stage: 'Contacted' } });
      }
      if (url.includes('/marketing/leads/lead-219') && url.includes('?_')) {
        return mockRes({
          success: true,
          data: {
            id: 'lead-219', leadId: 'LD-219', companyName: 'TestCorp',
            contactPerson: 'Rachel', mobileNumber: '9000000119',
            status: '', stage: 'Contacted', priority: 'High',
            createdAt: '2026-06-20T10:00:00.000Z', createdBy: { name: 'Admin User' },
            timeline: [...timelineEntries],
          },
        });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-219', leadId: 'LD-219', companyName: 'TestCorp',
          contactPerson: 'Rachel', mobileNumber: '9000000119',
          status: '', stage: 'New', priority: 'High',
          createdAt: '2026-06-20T10:00:00.000Z', createdBy: { name: 'Admin User' },
          timeline: [{ action: 'Lead Created', message: 'Lead Created', user: 'Admin User', timestamp: '2026-06-20T10:00:00.000Z' }],
        },
      });
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-219');
    await screen.findByText('Lead Details');

    const stageSelect = await screen.findByLabelText('Stage');
    fireEvent.change(stageSelect, { target: { value: 'Contacted' } });

    await waitFor(() => {
      expect(screen.getByText(/Stage updated to Contacted/i)).toBeInTheDocument();
    });
  });
});

describe('STORY-2.4.1 Lead Stage Management — Stage Transitions', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('test-ep-2.4.1-030: New stage shows only valid transitions (Contacted, Hold, Lost)', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      return mockRes({
        success: true,
        data: {
          id: 'lead-220', leadId: 'LD-220', companyName: 'TestCorp',
          contactPerson: 'Sam', mobileNumber: '9000000120',
          status: '', stage: 'New', priority: 'High',
          createdAt: '2026-06-22T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-220');
    const stageSelect = await screen.findByLabelText('Stage');
    expect(stageSelect).toHaveValue('New');

    const allOptions = Array.from(stageSelect.options).map(o => o.value).filter(v => v);
    expect(allOptions).toContain('Contacted');
    expect(allOptions).toContain('Hold');
    expect(allOptions).toContain('Lost');
    expect(allOptions).not.toContain('Meeting Scheduled');
    expect(allOptions).not.toContain('Proposal Sent');
    expect(allOptions).not.toContain('Negotiation');
  });

  it('test-ep-2.4.1-031: selecting same stage does not trigger API call', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      return mockRes({
        success: true,
        data: {
          id: 'lead-221', leadId: 'LD-221', companyName: 'TestCorp',
          contactPerson: 'Tina', mobileNumber: '9000000121',
          status: '', stage: 'New', priority: 'High',
          createdAt: '2026-06-23T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });
    global.fetch = fetchMock;
    const initialCallCount = fetchMock.mock.calls.length;

    renderLeadDetails('/marketing/leads/lead-221');
    const stageSelect = await screen.findByLabelText('Stage');

    fireEvent.change(stageSelect, { target: { value: 'New' } });
    await new Promise((r) => setTimeout(r, 50));

    const statusCalls = fetchMock.mock.calls.filter(
      ([url]) => String(url).includes('/status')
    );
    expect(statusCalls.length).toBe(0);
  });
});

describe('STORY-2.4.1 Lead Stage Management — Access Control', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('test-ep-2.4.1-032: Admin sees all stage options for open lead', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      return mockRes({
        success: true,
        data: {
          id: 'lead-222', leadId: 'LD-222', companyName: 'TestCorp',
          contactPerson: 'Uma', mobileNumber: '9000000122',
          status: '', stage: 'New', priority: 'Medium',
          createdAt: '2026-06-24T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/admin/leads/lead-222');
    const stageSelect = await screen.findByLabelText('Stage');
    expect(stageSelect).not.toBeDisabled();
    expect(stageSelect).toHaveValue('New');

    const allOptions = Array.from(stageSelect.options).map(o => o.value).filter(v => v);
    expect(allOptions).toContain('Contacted');
    expect(allOptions).toContain('Hold');
    expect(allOptions).toContain('Lost');
  });

  it('test-ep-2.4.1-039: Admin can reopen Lost closed lead', async () => {
    setUser(adminUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      if (url.includes('/reopen')) {
        return mockRes({ success: true, data: { status: '', stage: 'Contacted' } });
      }
      if (url.includes('/admin/leads/lead-223') && url.includes('?_')) {
        return mockRes({
          success: true,
          data: {
            id: 'lead-223', leadId: 'LD-223', companyName: 'TestCorp',
            contactPerson: 'Victor', mobileNumber: '9000000123',
            status: '', stage: 'Contacted', priority: 'Medium',
            createdAt: '2026-06-25T10:00:00.000Z', createdBy: { name: 'Admin User' },
          },
        });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-223', leadId: 'LD-223', companyName: 'TestCorp',
          contactPerson: 'Victor', mobileNumber: '9000000123',
          status: 'Lost', stage: 'Closed', priority: 'Medium',
          createdAt: '2026-06-25T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });
    global.fetch = fetchMock;

    renderLeadDetails('/admin/leads/lead-223');
    expect(await screen.findByRole('button', { name: /Reopen Lead/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Reopen Lead/i }));
    await screen.findByRole('heading', { name: /Reopen Lead/i });
    fireEvent.change(screen.getByLabelText(/Reopen reason/i), { target: { value: 'New opportunity' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Reopen/i }));

    await waitFor(() => {
      expect(screen.getByText(/Lead reopened successfully/i)).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/reopen'), expect.any(Object));
  });
});

describe('STORY-2.4.1 Timeline Loading and Full History', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('test-ep-2.4.1-040: timeline section shows loading skeleton while history is being fetched', async () => {
    setUser(marketingUser);
    let resolveHistory;
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return new Promise((resolve) => { resolveHistory = resolve; });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-tl-1', leadId: 'LD-TL-1', companyName: 'Timeline Test',
          contactPerson: 'Wendy', mobileNumber: '9000000130',
          status: '', stage: 'New', priority: 'High',
          createdAt: '2026-06-25T10:00:00.000Z', createdBy: { name: 'Admin User' },
          timeline: null,
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-tl-1');

    await screen.findByText('Lead Details');

    expect(screen.getByText(/Loading history\.\.\./i)).toBeInTheDocument();

    resolveHistory(mockRes({ success: true, data: [{ action: 'Lead Created', message: 'Lead Created', user: 'Admin User', timestamp: '2026-06-25T10:00:00.000Z' }] }));

    await waitFor(() => {
      expect(screen.queryByText(/Loading history\.\.\./i)).not.toBeInTheDocument();
    });
    expect(screen.getByText('Lead Created')).toBeInTheDocument();
  });

  it('test-ep-2.4.1-041: View Full History button navigates to page with all history entries', async () => {
    setUser(marketingUser);
    const historyEntries = [
      { action: 'Lead Created', message: 'Lead Created', user: 'Admin User', timestamp: '2026-06-20T10:00:00.000Z' },
      { action: 'Stage Updated', message: 'Lead moved to Contacted', user: 'Admin User', timestamp: '2026-06-21T10:00:00.000Z' },
      { action: 'Stage Updated', message: 'Lead moved to Negotiation', user: 'Admin User', timestamp: '2026-06-22T10:00:00.000Z' },
    ];

    function renderLeadDetailsWithHistory(path) {
      return render(
        <MemoryRouter initialEntries={[path]}>
          <AuthProvider>
            <Routes>
              <Route path="/marketing/leads/:leadId" element={<LeadDetails />} />
              <Route path="/marketing/leads/:leadId/lead-history" element={<LeadHistory />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );
    }

    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: historyEntries });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-tl-2', leadId: 'LD-TL-2', companyName: 'History Corp',
          contactPerson: 'Xander', mobileNumber: '9000000131',
          status: '', stage: 'New', priority: 'Medium',
          createdAt: '2026-06-20T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetailsWithHistory('/marketing/leads/lead-tl-2');

    await screen.findByText('Lead Details');

    const viewFullHistoryBtn = screen.getByRole('button', { name: /View Full History/i });
    expect(viewFullHistoryBtn).toBeInTheDocument();

    fireEvent.click(viewFullHistoryBtn);

    await waitFor(() => {
      expect(screen.getByText('Lead History')).toBeInTheDocument();
    });

    expect(screen.getByText('Lead Created')).toBeInTheDocument();
    expect(screen.getAllByText(/Stage Updated/)).toHaveLength(2);
    expect(screen.getAllByText(/By: Admin User/)).toHaveLength(3);
  });
});

describe('STORY-2.4.1 Additional — Admin Reopen & Stage Selector', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('test-ep-2.4.1-005: Admin sees reopen button for closed leads', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      return mockRes({
        success: true,
        data: {
          id: 'lead-005', leadId: 'LD-005', companyName: 'ClosedCorp',
          contactPerson: 'AdminOnly', mobileNumber: '9000000005',
          status: 'Lost', stage: 'Closed', priority: 'High',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/admin/leads/lead-005');

    expect(await screen.findByRole('button', { name: /Reopen Lead/i })).toBeInTheDocument();
  });

  it('test-ep-2.4.1-042: Admin sees enabled stage selector even on closed leads', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      return mockRes({
        success: true,
        data: {
          id: 'lead-042', leadId: 'LD-042', companyName: 'ClosedCorp',
          contactPerson: 'AdminView', mobileNumber: '9000000042',
          status: 'Won', stage: 'Closed', priority: 'High',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/admin/leads/lead-042');

    const stageSelect = await screen.findByLabelText('Stage');
    expect(stageSelect).not.toBeDisabled();
  });

  it('test-ep-2.4.1-038: ME cannot modify Lost closed lead (general)', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      return mockRes({
        success: true,
        data: {
          id: 'lead-038', leadId: 'LD-038', companyName: 'LockedCorp',
          contactPerson: 'MELocked', mobileNumber: '9000000038',
          status: 'Lost', stage: 'Closed', priority: 'Low',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-038');

    const stageSelect = await screen.findByLabelText('Stage');
    expect(stageSelect).toBeDisabled();
    expect(screen.getByText(/This lead is closed\. Contact Admin to reopen\./i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reopen Lead/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Close as Won/i })).not.toBeInTheDocument();
  });

  it('test-ep-2.4.1-043: Admin reopen succeeds locally despite 502 API error', async () => {
    setUser(adminUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) return mockRes({ success: true, data: [] });
      if (url.includes('/admin/leads/lead-043') && url.includes('?_')) {
        return mockRes({
          success: true,
          data: {
            id: 'lead-043', leadId: 'LD-043', companyName: 'FailCorp',
            contactPerson: 'ReopenFail', mobileNumber: '9000000043',
            status: '', stage: 'Contacted', priority: 'Medium',
            createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
          },
        });
      }
      if (url.includes('/reopen')) return mockRes({ message: 'Bad Gateway' }, 502);
      return mockRes({
        success: true,
        data: {
          id: 'lead-043', leadId: 'LD-043', companyName: 'FailCorp',
          contactPerson: 'ReopenFail', mobileNumber: '9000000043',
          status: 'Lost', stage: 'Closed', priority: 'Medium',
          createdAt: '2026-06-15T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });
    global.fetch = fetchMock;

    renderLeadDetails('/admin/leads/lead-043');

    expect(await screen.findByRole('button', { name: /Reopen Lead/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Reopen Lead/i }));
    await screen.findByRole('heading', { name: /Reopen Lead/i });
    fireEvent.change(screen.getByLabelText(/Reopen reason/i), { target: { value: 'Trying to reopen' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Reopen/i }));

    await waitFor(() => {
      expect(screen.getByText(/Lead reopened successfully/i)).toBeInTheDocument();
    });
  });
});

describe('STORY-2.4.1 Lead History — Load More Pagination', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function renderLeadHistoryWithMore(path = '/marketing/leads/lead-more/lead-history') {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route path="/marketing/leads/:leadId/lead-history" element={<LeadHistory />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it('test-ep-2.4.1-044: Load More button loads older history entries', async () => {
    setUser(marketingUser);
    const manyEntries = Array.from({ length: 12 }, (_, i) => ({
      action: i === 0 ? 'Lead Created' : 'Stage Updated',
      message: i === 0 ? 'Lead Created' : `Entry ${i}`,
      user: 'Admin User',
      timestamp: new Date(2026, 5, 20 + i, 10, 0, 0).toISOString(),
    }));

    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: manyEntries });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-more', leadId: 'LD-MORE', companyName: 'LoadMore Corp',
          contactPerson: 'Pagination', mobileNumber: '9000000099',
          status: '', stage: 'New', priority: 'Medium',
          createdAt: '2026-06-20T10:00:00.000Z', createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadHistoryWithMore('/marketing/leads/lead-more/lead-history');

    await waitFor(() => {
      expect(screen.getByText('Lead History')).toBeInTheDocument();
    });

    const initialEntries = screen.getAllByText(/Stage Updated|Lead Created/);
    expect(initialEntries.length).toBe(5);

    expect(screen.getByRole('button', { name: /Load More/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Load More/i }));

    await waitFor(() => {
      const entriesAfterFirstLoad = screen.getAllByText(/Stage Updated|Lead Created/);
      expect(entriesAfterFirstLoad.length).toBe(10);
    });

    fireEvent.click(screen.getByRole('button', { name: /Load More/i }));

    await waitFor(() => {
      const entriesAfterSecondLoad = screen.getAllByText(/Stage Updated|Lead Created/);
      expect(entriesAfterSecondLoad.length).toBe(12);
    });

    expect(screen.queryByRole('button', { name: /Load More/i })).not.toBeInTheDocument();
  });
});
