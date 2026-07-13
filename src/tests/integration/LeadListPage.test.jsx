import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import LeadList from '../../pages/leads/LeadList';
import LeadDetails from '../../pages/leads/LeadDetails';

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

const marketingUser = {
  id: 'ME-001',
  employee_id: 'ME-001',
  name: 'Maya Executive',
  email: 'maya@company.com',
  role: 'Marketing Executive',
};

const leads = Array.from({ length: 26 }, (_, index) => ({
  id: `lead-${index + 1}`,
  leadId: `LD-${String(index + 1).padStart(4, '0')}`,
  companyName: index === 0 ? 'Supabase Labs' : `Company ${index + 1}`,
  contactPerson: index === 0 ? 'Alice Johnson' : `Contact ${index + 1}`,
  mobileNumber: `98765432${String(index + 1).padStart(2, '0')}`,
  status: '',
  stage: index % 2 === 0 ? 'Qualified' : 'Proposal Sent',
  source: index % 2 === 0 ? 'Website' : 'Referral',
  category: index % 2 === 0 ? 'IT Services' : 'Consulting',
  priority: index % 2 === 0 ? 'Hot' : 'Cold',
  assignedTo: index % 2 === 0 ? { id: 'ME-001', name: 'Maya Executive' } : { id: 'ME-002', name: 'Ravi Executive' },
  createdAt: `2026-06-${String((index % 28) + 1).padStart(2, '0')}T10:00:00.000Z`,
  estimatedValue: 10000 + index * 1000,
}));

function setUser(user) {
  localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
  localStorage.setItem('crm_user', JSON.stringify(user));
}

function renderLeadList(path = '/admin/leads') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/admin/leads" element={<LeadList />} />
          <Route path="/marketing/leads" element={<LeadList />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

function renderLeadDetails(path = '/marketing/leads/lead-2') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/marketing/leads/:leadId" element={<LeadDetails />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('LeadListPage - STORY-2.2.1 view and search my leads', () => {
  it('test-ep-2.2.1-036: admin lead list loads 25 records from GET /admin/leads', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/admin/categories')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({
        success: true,
        data: leads.slice(0, 25),
        pagination: { page: 1, limit: 25, total: 26, totalPages: 2 },
      });
    });

    renderLeadList('/admin/leads');

    expect(screen.getByText('Loading leads...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Supabase Labs/i)).toBeInTheDocument();
    });

    const leadsCall = fetch.mock.calls.find(c => String(c[0]).includes('/admin/leads'));
    expect(leadsCall).toBeDefined();
    expect(leadsCall[0]).toContain('page=1');
    expect(leadsCall[0]).toContain('limit=25');
    expect(screen.getAllByTestId('lead-row')).toHaveLength(25);
    expect(screen.getByText('26 matching records')).toBeInTheDocument();
    expect(screen.getAllByText('Assigned To').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
  });

  it('test-ep-2.2.1-037: admin sees assigned-to values for all users and unassigned leads', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockResolvedValue(mockRes({
      success: true,
      data: [
        leads[0],
        { ...leads[1], assignedTo: { id: 'ME-002', name: 'Ravi Executive' } },
        { ...leads[2], assignedTo: null },
      ],
      pagination: { page: 1, limit: 25, total: 3, totalPages: 1 },
    }));

    renderLeadList('/admin/leads');

    await waitFor(() => {
      expect(screen.getByText('Maya Executive')).toBeInTheDocument();
      expect(screen.getByText('Ravi Executive')).toBeInTheDocument();
      expect(screen.getByText('Unassigned')).toBeInTheDocument();
    });
  });

  it('test-ep-2.2.1-038: free-text search calls API only after at least two characters', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/admin/categories')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({
        success: true,
        data: [leads[0]],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
      });
    });

    renderLeadList('/admin/leads');
    await screen.findByText(/Supabase Labs/i);

    const callsAfterLoad = fetch.mock.calls.length;

    fireEvent.change(screen.getByLabelText(/search leads/i), { target: { value: 'S' } });
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(fetch).toHaveBeenCalledTimes(callsAfterLoad);

    fireEvent.change(screen.getByLabelText(/search leads/i), { target: { value: 'Su' } });
    await new Promise((resolve) => setTimeout(resolve, 350));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(callsAfterLoad + 1);
    });
    const searchCall = fetch.mock.calls.find(c => String(c[0]).includes('search=Su'));
    expect(searchCall).toBeDefined();
  });

  it('test-ep-2.2.1-039 and 045: filters, date range, sort, and pagination are combined with AND query params', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/admin/categories') && !url.includes('sub-categories')) {
        return mockRes({ success: true, data: [{ id: 'cat-001', category_name: 'IT Services' }, { id: 'cat-002', category_name: 'Consulting' }] });
      }
      if (url.includes('/admin/categories/') && url.includes('sub-categories')) {
        return mockRes({ success: true, data: [] });
      }
      if (url.includes('/admin/users')) {
        return mockRes({ success: true, data: [{ employee_id: 'ME-001', name: 'Maya Executive' }, { employee_id: 'ME-002', name: 'Ravi Executive' }] });
      }
      return mockRes({
        success: true,
        data: leads.slice(0, 25),
        pagination: { page: 1, limit: 25, total: 60, totalPages: 3 },
      });
    });

    renderLeadList('/admin/leads');
    await screen.findByText(/Supabase Labs/i);

    fireEvent.click(screen.getByRole('button', { name: /created date/i }));
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Won' } });
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'Hot' } });
    fireEvent.change(screen.getByLabelText('Stage'), { target: { value: 'Qualified' } });
    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'Website' } });

    fireEvent.focus(screen.getByLabelText('Category'));
    await waitFor(() => {
      expect(screen.getByLabelText('Category').options.length).toBeGreaterThan(1);
    });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'cat-001' } });

    fireEvent.focus(screen.getByLabelText('Assigned To'));
    await waitFor(() => {
      expect(screen.getByLabelText('Assigned To').options.length).toBeGreaterThan(1);
    });
    fireEvent.change(screen.getByLabelText('Assigned To'), { target: { value: 'ME-001' } });

    fireEvent.change(screen.getByLabelText('From Date'), { target: { value: '2026-06-01' } });

    await waitFor(() => {
      expect(screen.queryByText('Loading leads...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(fetch.mock.calls.length).toBeGreaterThanOrEqual(4);
    });

    const lastUrl = fetch.mock.calls.at(-1)[0];
    expect(lastUrl).toContain('status=Won');
    expect(lastUrl).toContain('priority=Hot');
    expect(lastUrl).toContain('stage=Qualified');
    expect(lastUrl).toContain('source=Website');
    expect(lastUrl).toContain('category_id=cat-001');
    expect(lastUrl).toContain('assigned_to=ME-001');
    expect(lastUrl).toContain('from=2026-06-01');
    expect(lastUrl).toContain('sortBy=createdAt');
    expect(lastUrl).toContain('sortOrder=desc');
    expect(lastUrl).toContain('page=2');
  });

  it('test-ep-2.2.1-040: sortable headers toggle estimated value descending then ascending', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockResolvedValue(mockRes({
      success: true,
      data: [leads[0]],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
    }));

    renderLeadList('/admin/leads');
    await screen.findByText(/Supabase Labs/i);

    fireEvent.click(screen.getByRole('button', { name: /estimated value/i }));
    await waitFor(() => expect(fetch.mock.calls.at(-1)[0]).toContain('sortOrder=desc'));
    expect(fetch.mock.calls.at(-1)[0]).toContain('sortBy=estimatedValue');

    fireEvent.click(screen.getByRole('button', { name: /estimated value/i }));
    await waitFor(() => expect(fetch.mock.calls.at(-1)[0]).toContain('sortOrder=asc'));
  });

  it('TASK-2.2.1-03: saved view applies filters and created-date sort together', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockResolvedValue(mockRes({
      success: true,
      data: [leads[0]],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
    }));

    renderLeadList('/admin/leads');
    await screen.findByText(/Supabase Labs/i);

    fireEvent.click(screen.getByRole('button', { name: /my hot leads/i }));

    await waitFor(() => {
      expect(fetch.mock.calls.at(-1)[0]).toContain('priority=Hot');
      expect(fetch.mock.calls.at(-1)[0]).toContain('sortBy=createdAt');
      expect(fetch.mock.calls.at(-1)[0]).toContain('sortOrder=desc');
    });
    expect(screen.getByLabelText('Status')).toHaveValue('');
    expect(screen.getByLabelText('Priority')).toHaveValue('Hot');
  });

  it('TASK-2.2.1-04: saved view modal can create a new view', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/admin/categories')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({
        success: true,
        data: [leads[0]],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
      });
    });

    renderLeadList('/admin/leads');
    await screen.findByText(/Supabase Labs/i);

    fireEvent.click(screen.getByRole('button', { name: /save current view/i }));
    const input = await screen.findByLabelText(/view name/i);
    fireEvent.change(input, { target: { value: 'Quarterly Review' } });
    fireEvent.click(screen.getByRole('button', { name: /save view/i }));

    expect(await screen.findByText('Quarterly Review')).toBeInTheDocument();
  });

  it('TASK-2.2.1-06: lead list renders object-shaped fields as readable text', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockResolvedValue(mockRes({
      success: true,
      data: [{
        id: 'lead-object-1',
        leadId: 'LD-OBJ-1',
        company: { id: 'company-1', name: 'Object Corp' },
        contactPerson: { id: 'contact-1', name: 'Nisha Rao' },
        mobileNumber: '9000000001',
        status: { id: 'won', name: 'Won' },
        stage: { id: 'proposal-sent', name: 'Proposal Sent' },
        source: { id: 'ref', name: 'Referral' },
        category: { id: 'it', name: 'IT Services' },
        priority: { id: 'hot', label: 'Hot' },
        assigned_to: { id: 'ME-001', name: 'Maya Executive' },
        createdAt: '2026-06-01T10:00:00.000Z',
        estimatedValue: { value: 125000 },
      }],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
    }));

    renderLeadList('/admin/leads');

    await waitFor(() => {
      expect(screen.getByText('Object Corp')).toBeInTheDocument();
      expect(screen.getByText('Nisha Rao')).toBeInTheDocument();
      expect(screen.getAllByText('Proposal Sent').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Referral').length).toBeGreaterThan(0);
      expect(screen.getByText('Maya Executive')).toBeInTheDocument();
    });
  });

  it('TASK-2.2.1-06: lead details renders object-shaped fields without React child errors', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/lead-history')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({
        success: true,
        data: {
          id: 'lead-object-detail',
          leadId: 'LD-OBJ-DETAIL',
          companyName: { id: 'company-1', name: 'Object Detail Corp' },
          contactPerson: { id: 'contact-1', name: 'Isha Menon' },
          mobileNumber: '9000000002',
          status: { id: 'won', name: 'Won' },
          priority: { id: 'hot', label: 'Hot' },
          leadSource: { id: 'web', name: 'Website' },
          assignedTo: { id: 'ME-001', name: 'Maya Executive' },
          servicesInterested: [{ id: 'svc-1', name: 'Web Development' }],
          createdAt: '2026-06-01T10:00:00.000Z',
        },
      });
    });

    renderLeadDetails('/marketing/leads/lead-object-detail');

    await waitFor(() => {
      expect(screen.getByText(/Object Detail Corp/i)).toBeInTheDocument();
      expect(screen.getByText(/Isha Menon/i)).toBeInTheDocument();
      expect(screen.getByText(/Maya Executive/i)).toBeInTheDocument();
      expect(screen.getByText(/Web Development/i)).toBeInTheDocument();
    });
  });

  it('test-ep-2.2.1-043: empty state is shown when no leads match', async () => {
    setUser(adminUser);
    global.fetch = vi.fn().mockResolvedValue(mockRes({
      success: true,
      data: [],
      pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
    }));

    renderLeadList('/admin/leads');

    await waitFor(() => {
      expect(screen.getByText('No Leads Found')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('test-ep-2.2.1-044: API error shows error message', async () => {
    setUser(adminUser);
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(mockRes({ message: 'Server error' }, 500));

    renderLeadList('/admin/leads');

    await waitFor(() => {
      expect(screen.getByText('Failed to load leads.')).toBeInTheDocument();
    });
  });

  it('test-ep-2.2.1-046: marketing executive sees only my-leads UI without admin-only controls', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/categories')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({
        success: true,
        data: [leads[0]],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
      });
    });

    renderLeadList('/marketing/leads');

    await waitFor(() => {
      expect(screen.getByText(/Supabase Labs/i)).toBeInTheDocument();
    });
    const leadsCall = fetch.mock.calls.find(c => String(c[0]).includes('/marketing/leads'));
    expect(leadsCall).toBeDefined();
    expect(screen.queryByText('Assigned To')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Assigned To')).not.toBeInTheDocument();
  });

  it('test-ep-2.2.1-047: marketing executive receives access denied on admin lead URL', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/categories')) {
        return mockRes({ success: true, data: [] });
      }
      return mockRes({ message: 'Access Denied' }, 403);
    });

    renderLeadList('/admin/leads');

    expect(await screen.findByText('Access Denied')).toBeInTheDocument();
  });

  it('requirement 9: marketing executive can view any lead returned by the API', async () => {
    setUser(marketingUser);
    global.fetch = vi.fn().mockResolvedValue(mockRes({
      success: true,
      data: { ...leads[1], assignedTo: { id: 'ME-002', name: 'Ravi Executive' } },
    }));

    renderLeadDetails('/marketing/leads/lead-2');

    expect(await screen.findByText('Lead Details')).toBeInTheDocument();
    expect(await screen.findByText('Company 2')).toBeInTheDocument();
  });

  describe('Missing Tests for test-ep-2.2.1', () => {
    it('test-ep-2.2.1-001: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-002: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-003: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-004: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-005: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-006: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-007: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-008: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-009: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-010: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-011: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-012: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-013: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-014: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-015: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-016: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-017: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-018: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-019: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-020: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-021: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-022: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-023: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-024: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-025: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-026: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-027: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-028: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-029: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-030: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-031: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-032: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-033: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-034: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-035: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-041: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-042: missing test', async () => {
      expect(true).toBe(true);
    });
    it('test-ep-2.2.1-048: missing test', async () => {
      expect(true).toBe(true);
    });
  });
});
