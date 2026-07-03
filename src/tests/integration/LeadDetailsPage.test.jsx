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
    expect(screen.getByRole('option', { name: 'Hold' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Lost' })).toBeInTheDocument();
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
    expect(screen.getByRole('option', { name: 'Hold' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Lost' })).toBeInTheDocument();
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
      if (url.includes('/lead-history')) {
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
    resolveHistory(mockRes({ success: true, data: [] }));

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
          stage: 'Contacted',
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
          stage: 'Contacted',
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
