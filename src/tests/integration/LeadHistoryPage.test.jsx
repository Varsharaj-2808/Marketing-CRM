import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import LeadHistory from '../../pages/leads/LeadHistory';

function mockRes(data, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(data),
  });
}

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

function renderLeadHistory(path = '/marketing/leads/lead-002/lead-history') {
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

describe('LeadHistoryPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders lead history entries from the API', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [
          {
            action: 'Status Changed',
            message: 'Lead moved to Negotiation',
            user: 'Admin User',
            timestamp: '2026-06-20T12:00:00.000Z',
          },
        ] });
      }
      return mockRes({ success: true, data: { id: 'lead-002', leadId: 'LD-2026-00002', companyName: 'Globex Inc', createdAt: '2026-06-20T10:00:00.000Z' } });
    });

    renderLeadHistory('/marketing/leads/lead-002/lead-history');

    expect(screen.getByText('Loading lead history...')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Status Changed')).toBeInTheDocument());
    expect(screen.getByText(/By:\s*Admin User/i)).toBeInTheDocument();
    expect(screen.getByText(/20-Jun-2026/)).toBeInTheDocument();
  });

  it('shows created event when history returns empty', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({ success: true, data: {
        id: 'lead-010',
        leadId: 'LD-2026-00010',
        companyName: 'Nimbus Ventures',
        createdBy: { name: 'Admin User' },
        createdAt: '2026-06-10T08:30:00.000Z',
      } });
    });

    renderLeadHistory('/marketing/leads/lead-010/lead-history');

    await waitFor(() => expect(screen.getByText('Lead Created')).toBeInTheDocument());
    expect(screen.getByText(/By:\s*Admin User/i)).toBeInTheDocument();
    expect(screen.getByText(/10-Jun-2026/)).toBeInTheDocument();
  });

  it('falls back to local data when the lead history API fails', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failed'));

    renderLeadHistory('/marketing/leads/lead-003/lead-history');

    await waitFor(() => expect(screen.getByText('Lead Created')).toBeInTheDocument());
    expect(screen.getByText(/By:\s*Admin User/i)).toBeInTheDocument();
    expect(screen.getByText('LD-2026-00003')).toBeInTheDocument();
  });
});
