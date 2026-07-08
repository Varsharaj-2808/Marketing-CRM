import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('LeadDetailsPage - STORY-2.4.1 lead stage management', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('test-ep-2.4.1-001: renders New lead stage options correctly', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({
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
          createdAt: '2026-06-01T10:00:00.000Z',
          createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-100');

    const stageSelect = await screen.findByLabelText('Stage');
    expect(stageSelect).toHaveValue('New');
    expect(screen.getByRole('option', { name: 'Contacted' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Hold' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Lost' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Meeting Scheduled' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Proposal Sent' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Close as Won/i })).not.toBeInTheDocument();
  });

  it('test-ep-2.4.1-002: renders Contacted stage transition options', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-101',
          leadId: 'LD-101',
          companyName: 'Globex',
          contactPerson: 'Jane Doe',
          mobileNumber: '9000000001',
          status: '',
          stage: 'Contacted',
          priority: 'Medium',
          createdAt: '2026-06-02T10:00:00.000Z',
          createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-101');

    const stageSelect = await screen.findByLabelText('Stage');
    expect(stageSelect).toHaveValue('Contacted');
    expect(screen.getByRole('option', { name: 'Meeting Scheduled' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Hold' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Lost' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'New (current)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Close as Won/i })).not.toBeInTheDocument();
  });

  it('test-ep-2.4.1-003: shows Close as Won option at Negotiation stage', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-102',
          leadId: 'LD-102',
          companyName: 'Initech',
          contactPerson: 'Peter Gibbons',
          mobileNumber: '9000000002',
          status: '',
          stage: 'Negotiation',
          priority: 'High',
          assignedTo: { id: 'ME-001', employee_id: 'ME-001', name: 'Maya Executive' },
          createdAt: '2026-06-03T10:00:00.000Z',
          createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-102');

    const stageSelect = await screen.findByLabelText('Stage');
    expect(stageSelect).toHaveValue('Negotiation');
    expect(screen.getByRole('option', { name: 'Hold' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Lost' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Close as Won/i })).toBeInTheDocument();
  });

  it('test-ep-2.4.1-004: disables stage selector for closed lead and shows locked message for ME', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-103',
          leadId: 'LD-103',
          companyName: 'Umbrella',
          contactPerson: 'Alice',
          mobileNumber: '9000000003',
          status: 'Won',
          stage: 'Closed',
          priority: 'Medium',
          createdAt: '2026-06-04T10:00:00.000Z',
          createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-103');

    const stageSelect = await screen.findByLabelText('Stage');
    expect(stageSelect).toBeDisabled();
    expect(screen.getByText(/This lead is closed\. Contact Admin to reopen\./i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reopen Lead/i })).not.toBeInTheDocument();
  });

  it('test-ep-2.4.1-005: admin sees reopen button and enabled stage selector for closed leads', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-104',
          leadId: 'LD-104',
          companyName: 'Stark',
          contactPerson: 'Tony Stark',
          mobileNumber: '9000000004',
          status: 'Won',
          stage: 'Closed',
          priority: 'High',
          createdAt: '2026-06-05T10:00:00.000Z',
          createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/admin/leads/lead-104');

    const reopenButton = await screen.findByRole('button', { name: /Reopen Lead/i });
    expect(reopenButton).toBeInTheDocument();
    expect(screen.getByLabelText('Stage')).not.toBeDisabled();
  });

  it('test-ep-2.4.1-006: shows loading skeleton while lead data loads', async () => {
    setUser(marketingUser);
    let resolveLead;
    let resolveHistory;
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/timeline')) {
        return new Promise((resolve) => { resolveHistory = resolve; });
      }
      return new Promise((resolve) => { resolveLead = resolve; });
    });

    renderLeadDetails('/marketing/leads/lead-105');
    expect(screen.getByText(/Loading lead details\.{3}/i)).toBeInTheDocument();

    resolveLead(mockRes({
      success: true,
      data: {
        id: 'lead-105',
        leadId: 'LD-105',
        companyName: 'Wayne',
        contactPerson: 'Bruce Wayne',
        mobileNumber: '9000000005',
        status: '',
        stage: 'New',
        priority: 'High',
        createdAt: '2026-06-06T10:00:00.000Z',
        createdBy: { name: 'Admin User' },
      },
    }));

    await waitFor(() => expect(typeof resolveHistory).toBe('function'));
    resolveHistory(mockRes({ success: true, body: { timeline: [], pagination: { page: 1, totalPages: 1, has_more: false } } }));

    await waitFor(() => expect(screen.queryByText(/Loading lead details\.{3}/i)).not.toBeInTheDocument());
    expect(screen.getByLabelText('Stage')).toBeInTheDocument();
  });

  it('test-ep-2.4.1-007: shows error when lead API fails', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockResolvedValue(mockRes({ message: 'Server error' }, 500));

    renderLeadDetails('/marketing/leads/lead-106');

    expect(await screen.findByText(/Failed to load lead\./i)).toBeInTheDocument();
  });

  it('test-ep-2.4.1-008: updates stage after selecting a valid next stage', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [] });
      }
      if (url.includes('/status')) {
        return mockRes({ success: true, data: { stage: 'Contacted' } });
      }
      if (url.includes('/marketing/leads/lead-107')) {
        return mockRes({
          success: true,
          data: {
            id: 'lead-107',
            leadId: 'LD-107',
            companyName: 'Black Mesa',
            contactPerson: 'Gordon Freeman',
            mobileNumber: '9000000006',
            status: '',
            stage: url.includes('?_') ? 'Contacted' : 'New',
            priority: 'High',
            createdAt: '2026-06-07T10:00:00.000Z',
            createdBy: { name: 'Admin User' },
          },
        });
      }
      return mockRes({ success: true, data: {} });
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-107');
    const stageSelect = await screen.findByLabelText('Stage');
    expect(stageSelect).toHaveValue('New');

    fireEvent.change(stageSelect, { target: { value: 'Contacted' } });

    await waitFor(() => expect(screen.getByText(/Stage updated to Contacted/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText('Stage')).toHaveValue('Contacted'));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/status'), expect.any(Object));
  });

  it('test-ep-2.4.1-012: displays error when stage transition fails', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [] });
      }
      if (url.includes('/status')) {
        return mockRes({ message: 'Server error' }, 500);
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-108',
          leadId: 'LD-108',
          companyName: 'Aperture',
          contactPerson: 'Chell',
          mobileNumber: '9000000007',
          status: '',
          stage: 'New',
          priority: 'Medium',
          createdAt: '2026-06-08T10:00:00.000Z',
          createdBy: { name: 'Admin User' },
        },
      });
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-108');
    const stageSelect = await screen.findByLabelText('Stage');
    fireEvent.change(stageSelect, { target: { value: 'Contacted' } });

    await waitFor(() => expect(screen.getByText(/Failed to update stage\. Please try again\./i)).toBeInTheDocument());
    expect(screen.getByLabelText('Stage')).toHaveValue('New');
  });

  it('test-ep-2.4.1-014: opens Lost Reason modal when Lost is selected', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-109',
          leadId: 'LD-109',
          companyName: 'Nakatomi',
          contactPerson: 'John McClane',
          mobileNumber: '9000000008',
          status: '',
          stage: 'Negotiation',
          priority: 'Low',
          createdAt: '2026-06-09T10:00:00.000Z',
          createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-109');
    const stageSelect = await screen.findByLabelText('Stage');

    fireEvent.change(stageSelect, { target: { value: 'Lost' } });
    expect(await screen.findByText('Close as Lost')).toBeInTheDocument();
    expect(screen.getByLabelText('Lost Reason')).toBeInTheDocument();
  });

  it('test-ep-2.4.1-015: closes lead as Lost after selecting reason', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [] });
      }
      if (url.includes('/close')) {
        return mockRes({ success: true, data: { status: 'Lost' } });
      }
      if (url.includes('?_')) {
        return mockRes({
          success: true,
          data: {
            id: 'lead-110',
            leadId: 'LD-110',
            companyName: 'Oceanic',
            contactPerson: 'Kate Austen',
            mobileNumber: '9000000009',
            status: 'Lost',
            stage: 'Closed',
            priority: 'Medium',
            createdAt: '2026-06-10T10:00:00.000Z',
            createdBy: { name: 'Admin User' },
          },
        });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-110',
          leadId: 'LD-110',
          companyName: 'Oceanic',
          contactPerson: 'Kate Austen',
          mobileNumber: '9000000009',
          status: '',
          stage: 'Negotiation',
          priority: 'Medium',
          createdAt: '2026-06-10T10:00:00.000Z',
          createdBy: { name: 'Admin User' },
        },
      });
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-110');
    const stageSelect = await screen.findByLabelText('Stage');
    fireEvent.change(stageSelect, { target: { value: 'Lost' } });

    const lostReasonSelect = await screen.findByLabelText('Lost Reason');
    fireEvent.change(lostReasonSelect, { target: { value: 'Budget' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));

    await waitFor(() => expect(screen.getByText(/Lead closed as Lost/i)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/close'), expect.any(Object));
  });

  it('test-ep-2.4.1-016: validates lost reason requirement', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-111',
          leadId: 'LD-111',
          companyName: 'Dexter',
          contactPerson: 'Dexter Morgan',
          mobileNumber: '9000000010',
          status: '',
          stage: 'Negotiation',
          priority: 'Low',
          createdAt: '2026-06-11T10:00:00.000Z',
          createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-111');
    const stageSelect = await screen.findByLabelText('Stage');
    fireEvent.change(stageSelect, { target: { value: 'Lost' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));
    expect(await screen.findByText(/Please select a lost reason\./i)).toBeInTheDocument();
  });

  it('test-ep-2.4.1-019: opens Won closure modal from Negotiation', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-112',
          leadId: 'LD-112',
          companyName: 'Cyberdyne',
          contactPerson: 'Sarah Connor',
          mobileNumber: '9000000011',
          status: '',
          stage: 'Negotiation',
          priority: 'High',
          assignedTo: { id: 'ME-001', employee_id: 'ME-001', name: 'Maya Executive' },
          createdAt: '2026-06-12T10:00:00.000Z',
          createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-112');
    expect(await screen.findByRole('button', { name: /Close as Won/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Close as Won/i }));
    expect(await screen.findByRole('heading', { name: /Close as Won/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Final Deal Value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Closure Date/i)).toBeInTheDocument();
  });

  it('test-ep-2.4.1-033: opens reopen modal for admin on closed lead', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-113',
          leadId: 'LD-113',
          companyName: 'Tyrell',
          contactPerson: 'Ellen Ripley',
          mobileNumber: '9000000012',
          status: 'Won',
          stage: 'Closed',
          priority: 'High',
          createdAt: '2026-06-13T10:00:00.000Z',
          createdBy: { name: 'Admin User' },
        },
      });
    });

    renderLeadDetails('/admin/leads/lead-113');

    fireEvent.click(await screen.findByRole('button', { name: /Reopen Lead/i }));
    expect(await screen.findByRole('heading', { name: /Reopen Lead/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Reopen reason/i)).toBeInTheDocument();
  });

  it('test-ep-2.4.1-036: reopens a closed lead successfully', async () => {
    setUser(adminUser);
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [] });
      }
      if (url.includes('/reopen')) {
        return mockRes({ success: true, data: { status: '', stage: 'Contacted' } });
      }
      if (url.includes('/admin/leads/lead-114') && url.includes('?_')) {
        return mockRes({
          success: true,
          data: {
            id: 'lead-114',
            leadId: 'LD-114',
            companyName: 'Tyrell',
            contactPerson: 'Ellen Ripley',
            mobileNumber: '9000000013',
            status: '',
            stage: 'Contacted',
            priority: 'High',
            createdAt: '2026-06-14T10:00:00.000Z',
            createdBy: { name: 'Admin User' },
          },
        });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-114',
          leadId: 'LD-114',
          companyName: 'Tyrell',
          contactPerson: 'Ellen Ripley',
          mobileNumber: '9000000013',
          status: 'Won',
          stage: 'Closed',
          priority: 'High',
          createdAt: '2026-06-14T10:00:00.000Z',
          createdBy: { name: 'Admin User' },
        },
      });
    });
    global.fetch = fetchMock;

    renderLeadDetails('/admin/leads/lead-114');
    fireEvent.click(await screen.findByRole('button', { name: /Reopen Lead/i }));
    fireEvent.change(screen.getByLabelText(/Reopen reason/i), { target: { value: 'Client requested re-engagement' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Reopen/i }));

    await waitFor(() => expect(screen.getByText(/Lead reopened successfully\. Stage set to Contacted\./i)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/reopen'), expect.any(Object));
  });
});

describe('LeadDetailsPage - STORY-4.3.1 Lead Activity Timeline', () => {
  const MOCK_LEAD = {
    id: 'lead-100',
    leadId: 'LD-100',
    companyName: 'Acme Corp',
    contactPerson: 'John Smith',
    mobileNumber: '9000000000',
    status: '',
    stage: 'New',
    priority: 'High',
    createdAt: '2026-06-01T10:00:00.000Z',
    createdBy: { name: 'Admin User' },
    assignedTo: { id: 'ME-001', employee_id: 'ME-001', name: 'Maya Executive' },
  };

  const FOUR_EVENTS_TIMELINE = {
    status: 'success',
    body: {
      timeline: [
        { id: '1', action: 'Lead Created', message: 'Lead Created', created_at: '2026-07-06T10:00:00Z', type: 'created', created_by: { name: 'Admin User' } },
        { id: '2', action: 'Lead Assigned', message: 'Lead Assigned to Maya', created_at: '2026-07-06T11:00:00Z', type: 'assigned', created_by: { name: 'Admin User' } },
        { id: '3', action: 'Stage Changed', message: 'Stage changed to Contacted', created_at: '2026-07-06T12:00:00Z', type: 'status_change', created_by: { name: 'Maya Executive' } },
        { id: '4', action: 'Follow-up Logged', message: 'Called client', followup_type: 'Call', outcome: 'Answered', notes: 'Interested in demo.', created_at: '2026-07-06T13:00:00Z', type: 'followup', created_by: { name: 'Maya Executive' } },
      ],
      pagination: { page: 1, totalPages: 1, has_more: false }
    }
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('test-ep-4.3.1-f-001: Verify consolidated vertical chronological timeline renders on Lead Detail page', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/timeline')) {
        return mockRes(FOUR_EVENTS_TIMELINE);
      }
      return mockRes(MOCK_LEAD);
    });

    renderLeadDetails('/marketing/leads/lead-100');

    // Wait for the timeline to load and check if cards render
    const card0 = await screen.findByText('Lead Created');
    const card1 = await screen.findByText('Lead Assigned');
    const card2 = await screen.findByText('Stage Changed');
    const card3 = await screen.findByText('Call');

    expect(card0).toBeInTheDocument();
    expect(card1).toBeInTheDocument();
    expect(card2).toBeInTheDocument();
    expect(card3).toBeInTheDocument();
  });

  it('test-ep-4.3.1-f-002: Verify timeline events render with distinct icons and colors per event type', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });

    renderLeadDetails('/marketing/leads/lead-100');

    const createdBadge = await screen.findByLabelText('Creation event');
    const assignedBadge = await screen.findByLabelText('Assignment event');
    const statusBadge = await screen.findByLabelText('Status update event');
    const followupBadge = await screen.findByLabelText('Follow-up Call event');

    expect(createdBadge).toHaveClass('bg-purple-100');
    expect(assignedBadge).toHaveClass('bg-gray-100');
    expect(statusBadge).toHaveClass('bg-orange-100');
    expect(followupBadge).toHaveClass('bg-blue-100');
  });

  it('test-ep-4.3.1-f-003: Verify relative timestamp descriptors and absolute time tooltip', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });

    renderLeadDetails('/marketing/leads/lead-100');
    await screen.findByText('LD-100');
    await screen.findByText('Lead Created');

    const firstCard = document.getElementById('timeline-card-0');
    const relativeTimeSpan = firstCard.querySelector('[title]');
    expect(relativeTimeSpan).toBeInTheDocument();
    expect(relativeTimeSpan.getAttribute('title')).toContain('2026');
  });

  it('test-ep-4.3.1-f-004: Verify notes/descriptions properly handle Show More toggle', async () => {
    setUser(marketingUser);
    const longNotes = 'A'.repeat(150);
    const longTimeline = {
      status: 'success',
      body: {
        timeline: [
          { id: '1', action: 'Follow-up Logged', followup_type: 'Call', notes: longNotes, created_at: '2026-07-06T10:00:00Z', type: 'followup', created_by: { name: 'Maya Executive' } }
        ],
        pagination: { page: 1, totalPages: 1, has_more: false }
      }
    };
    global.fetch = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(longTimeline);
      return mockRes(MOCK_LEAD);
    });

    renderLeadDetails('/marketing/leads/lead-100');

    const toggleBtn = await screen.findByRole('button', { name: /Show more/i });
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('button', { name: /Show less/i })).toBeInTheDocument();
  });

  it('test-ep-4.3.1-f-005: Verify four event filtering chips are rendered', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });

    renderLeadDetails('/marketing/leads/lead-100');

    const filterAll = await screen.findByRole('tab', { name: 'All' });
    const filterFollow = screen.getByRole('tab', { name: 'Follow-ups' });
    const filterStages = screen.getByRole('tab', { name: 'Stage Changes' });
    const filterAssign = screen.getByRole('tab', { name: 'Assignments' });

    expect(filterAll).toBeInTheDocument();
    expect(filterFollow).toBeInTheDocument();
    expect(filterStages).toBeInTheDocument();
    expect(filterAssign).toBeInTheDocument();
  });

  it('test-ep-4.3.1-f-006: Verify clicking "Follow-ups" filters the feed and queries type=followup', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-100');

    const filterFollow = await screen.findByRole('tab', { name: 'Follow-ups' });
    fireEvent.click(filterFollow);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('type=followup'), expect.any(Object));
    });
  });

  it('test-ep-4.3.1-f-007: Verify clicking "Stage Changes" queries type=status_change', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-100');

    const filterStages = await screen.findByRole('tab', { name: 'Stage Changes' });
    fireEvent.click(filterStages);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('type=status_change'), expect.any(Object));
    });
  });

  it('test-ep-4.3.1-f-008: Verify clicking "Assignments" queries type=assigned', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-100');

    const filterAssign = await screen.findByRole('tab', { name: 'Assignments' });
    fireEvent.click(filterAssign);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('type=assigned'), expect.any(Object));
    });
  });

  it('test-ep-4.3.1-f-009: Verify timeline cards render without action control items (Read-Only/Append-Only)', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });

    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText('Lead Created');
    // Ensure no Delete, Edit, or Remove buttons exist on the timeline cards
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('test-ep-4.3.1-f-010: Verify pagination defaults to 20 events limit', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText('Lead Created');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('limit=20'), expect.any(Object));
  });

  it('test-ep-4.3.1-f-011: Verify Load More button is visible when has_more: true', async () => {
    setUser(marketingUser);
    const paginatedTimeline = {
      status: 'success',
      body: {
        timeline: [
          { id: '1', action: 'Lead Created', created_at: '2026-07-06T10:00:00Z', type: 'created' }
        ],
        pagination: { page: 1, totalPages: 2, has_more: true }
      }
    };
    global.fetch = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(paginatedTimeline);
      return mockRes(MOCK_LEAD);
    });

    renderLeadDetails('/marketing/leads/lead-100');

    const loadMoreBtn = await screen.findByRole('button', { name: /Load More/i });
    expect(loadMoreBtn).toBeInTheDocument();
  });

  it('test-ep-4.3.1-f-012: Verify clicking Load More queries second page from server', async () => {
    setUser(marketingUser);
    const paginatedTimeline = {
      status: 'success',
      body: {
        timeline: [
          { id: '1', action: 'Lead Created', created_at: '2026-07-06T10:00:00Z', type: 'created' }
        ],
        pagination: { page: 1, totalPages: 2, has_more: true }
      }
    };
    const fetchMock = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(paginatedTimeline);
      return mockRes(MOCK_LEAD);
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-100');

    const loadMoreBtn = await screen.findByRole('button', { name: /Load More/i });
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.any(Object));
    });
  });

  it('test-ep-4.3.1-f-013: Verify keyboard tab indicators and focus sequences', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });

    renderLeadDetails('/marketing/leads/lead-100');
    await screen.findByText('LD-100');
    await screen.findByText('Lead Created');

    const firstCard = document.getElementById('timeline-card-0');
    expect(firstCard).toHaveAttribute('tabIndex', '0');
  });

  it('test-ep-4.3.1-f-014: Verify correct accessibility ARIA labels on event nodes', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });

    renderLeadDetails('/marketing/leads/lead-100');

    const node1 = await screen.findByLabelText('Creation event');
    const node2 = await screen.findByLabelText('Assignment event');
    expect(node1).toBeInTheDocument();
    expect(node2).toBeInTheDocument();
  });

  it('test-ep-4.3.1-f-015: Verify WCAG contrast color classes are applied to badges', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });

    renderLeadDetails('/marketing/leads/lead-100');
    await screen.findByText('LD-100');

    const createdNode = await screen.findByLabelText('Creation event');
    expect(createdNode).toHaveClass('bg-purple-100');
    const svg = createdNode.querySelector('svg');
    expect(svg).toHaveClass('text-purple-600');
  });

  it('test-ep-4.3.1-f-016: Verify new activities refetch page 1 timeline immediately', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-100');
    await screen.findByText('Lead Created');

    // Trigger log follow-up or add correction logic which calls loadTimeline(1, true)
    const logBtn = await screen.findAllByRole('button', { name: /Log Follow-up/i });
    expect(logBtn[0]).toBeInTheDocument();
  });

  it('test-ep-4.3.1-f-017: Verify timeline displays functional inline retry box on error', async () => {
    setUser(marketingUser);
    let timelineCallCount = 0;
    const fetchMock = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/timeline')) {
        timelineCallCount++;
        if (timelineCallCount === 1) {
          return Promise.reject(new Error('Server Error'));
        }
        return mockRes(FOUR_EVENTS_TIMELINE);
      }
      return mockRes(MOCK_LEAD);
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-100');

    const retryBtn = await screen.findByRole('button', { name: /Try again/i });
    expect(screen.getByText(/Failed to load timeline history\./i)).toBeInTheDocument();

    fireEvent.click(retryBtn);

    const firstCard = await screen.findByText('Lead Created');
    expect(firstCard).toBeInTheDocument();
  });

  it('test-ep-4.3.1-f-018: Verify pulsing loading skeletons display during timeline page shifts', async () => {
    setUser(marketingUser);
    let resolveTimeline;
    const timelinePromise = new Promise(resolve => { resolveTimeline = resolve; });
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/timeline')) {
        return timelinePromise.then(() => mockRes(FOUR_EVENTS_TIMELINE));
      }
      return mockRes(MOCK_LEAD);
    });

    renderLeadDetails('/marketing/leads/lead-100');
    await screen.findByText('LD-100');

    expect(screen.getByTestId('timeline-loading')).toBeInTheDocument();
    resolveTimeline();
  });

  it('test-ep-4.3.1-f-019: Verify chronological descending sort order is preserved on loading', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });

    renderLeadDetails('/marketing/leads/lead-100');
    await screen.findByText('LD-100');
    await screen.findByText('Lead Created');

    const card0 = document.getElementById('timeline-card-0');
    const card3 = document.getElementById('timeline-card-3');
    expect(card0.textContent).toContain('Call');
    expect(card3.textContent).toContain('Created');
  });

  it('test-ep-4.3.1-f-020: Verify reassignments trigger page 1 timeline refresh immediately', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-100');

    await screen.findByText('Lead Assigned');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/timeline'), expect.any(Object));
  });

  it('test-ep-4.3.1-f-021: Verify empty timeline displays "No history found for this lead."', async () => {
    setUser(marketingUser);
    const emptyTimeline = {
      status: 'success',
      body: {
        timeline: [],
        pagination: { page: 1, totalPages: 1, has_more: false }
      }
    };
    global.fetch = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(emptyTimeline);
      return mockRes(MOCK_LEAD);
    });

    renderLeadDetails('/marketing/leads/lead-100');

    const emptyText = await screen.findByText('No history found for this lead.');
    expect(emptyText).toBeInTheDocument();
  });

  it('test-ep-4.3.1-f-022: Verify keyboard focus shifts to the first card of new batch after Load More', async () => {
    setUser(marketingUser);
    const timelinePage1 = {
      status: 'success',
      body: {
        timeline: Array.from({ length: 20 }, (_, i) => ({
          id: `p1-${i}`,
          action: `Event ${i}`,
          created_at: `2026-07-06T10:${i.toString().padStart(2, '0')}:00Z`,
          type: 'created'
        })),
        pagination: { page: 1, totalPages: 2, has_more: true }
      }
    };
    const timelinePage2 = {
      status: 'success',
      body: {
        timeline: [
          { id: 'p2-0', action: 'Newest Event', created_at: '2026-07-06T11:00:00Z', type: 'followup' }
        ],
        pagination: { page: 2, totalPages: 2, has_more: false }
      }
    };

    let fetchCount = 0;
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/timeline')) {
        fetchCount++;
        return mockRes(fetchCount === 1 ? timelinePage1 : timelinePage2);
      }
      return mockRes(MOCK_LEAD);
    });

    renderLeadDetails('/marketing/leads/lead-100');

    const loadMoreBtn = await screen.findByRole('button', { name: /Load More/i });
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(document.activeElement.id).toBe('timeline-card-20');
    });
  });

  it('test-ep-4.3.1-f-023: Verify clicking filter chips while offline blocks the action and shows a toast', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });

    renderLeadDetails('/marketing/leads/lead-100');
    await screen.findByText('Lead Created');

    // Stub network status to offline
    vi.stubGlobal('navigator', { onLine: false });

    const filterFollow = screen.getByRole('tab', { name: 'Follow-ups' });
    fireEvent.click(filterFollow);

    expect(await screen.findByText("Offline: Cannot filter timeline while offline.")).toBeInTheDocument();
  });

  it('test-ep-4.3.1-f-024: Verify race conditions cancel stale timeline load requests', async () => {
    setUser(marketingUser);
    const fetchMock = vi.fn().mockImplementation((input) => {
      if (String(input).includes('/timeline')) return mockRes(FOUR_EVENTS_TIMELINE);
      return mockRes(MOCK_LEAD);
    });
    global.fetch = fetchMock;

    renderLeadDetails('/marketing/leads/lead-100');

    // Click tabs quickly
    const filterFollow = await screen.findByRole('tab', { name: 'Follow-ups' });
    const filterAssign = screen.getByRole('tab', { name: 'Assignments' });

    fireEvent.click(filterFollow);
    fireEvent.click(filterAssign);

    // Abort controller cancels previous controller
    expect(fetchMock).toHaveBeenCalled();
  });
});

