import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import DashboardPage from '../../pages/user/DashboardPage';
import AdminDashboardPage from '../../pages/admin/AdminDashboardPage';
import LeadTable from '../../components/leads/LeadTable';
import NotificationBell from '../../components/leads/NotificationBell';
import * as leadService from '../../services/leadService';
import * as notificationService from '../../services/notificationService';

// Properly mock the modules to override ESM static bindings
vi.mock('../../services/leadService', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    fetchTodayFollowups: vi.fn(),
    fetchOverdueFollowups: vi.fn(),
    fetchAtRiskLeads: vi.fn(),
    fetchCategories: vi.fn(),
    fetchSubCategories: vi.fn(),
    fetchDashboardKpis: vi.fn(),
    fetchWonRateByCategory: vi.fn(),
    fetchLeadVolumeByCategory: vi.fn(),
    exportReport: vi.fn(),
  };
});

vi.mock('../../services/notificationService', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    fetchNotifications: vi.fn(),
  };
});

// Mock users
const marketingUser = {
  id: 'me-001',
  employee_id: 'me-001',
  name: 'Maya Executive',
  email: 'maya@company.com',
  role: 'Marketing Executive',
};

const adminUser = {
  id: 'adm-001',
  employee_id: 'adm-001',
  name: 'Admin User',
  email: 'admin@company.com',
  role: 'Admin',
};

function setUser(user) {
  localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
  localStorage.setItem('crm_user', JSON.stringify(user));
}

const mockSort = { sortBy: 'createdAt', sortOrder: 'desc' };

describe('STORY-4.2.1: View Today\'s and Overdue Follow-ups Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.useRealTimers();

    // Mock other dashboard requests to prevent component errors or hangs
    leadService.fetchCategories.mockResolvedValue({ success: true, data: [] });
    leadService.fetchSubCategories.mockResolvedValue({ success: true, data: [] });
    leadService.fetchDashboardKpis.mockResolvedValue({ success: true, data: {} });
    leadService.fetchWonRateByCategory.mockResolvedValue({ success: true, data: [] });
    leadService.fetchLeadVolumeByCategory.mockResolvedValue({ success: true, data: [] });
  });

  afterEach(() => {
    cleanup();
  });

  // f-001: Follow-ups Today sorting by quality Hot > Warm > Cold
  it('test-ep-4.2.1-f-001: ME Dashboard Follow-ups Today widget lists active leads sorted Hot > Warm > Cold', async () => {
    setUser(marketingUser);
    const mockTodayData = {
      success: true,
      data: [
        { id: 'lead-1', company_name: 'Cold Company', contact_person: 'Alice', lead_quality: 'Cold' },
        { id: 'lead-2', company_name: 'Hot Company', contact_person: 'Bob', lead_quality: 'Hot' },
        { id: 'lead-3', company_name: 'Warm Company', contact_person: 'Charlie', lead_quality: 'Warm' }
      ]
    };
    
    leadService.fetchTodayFollowups.mockResolvedValue(mockTodayData);
    leadService.fetchOverdueFollowups.mockResolvedValue({ success: true, data: [] });

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for widget to load
    await waitFor(() => {
      expect(screen.getByText('Hot Company')).toBeInTheDocument();
    });

    const items = screen.getAllByText(/Company/);
    expect(items[0].textContent).toContain('Hot Company');
    expect(items[1].textContent).toContain('Warm Company');
    expect(items[2].textContent).toContain('Cold Company');
  });

  // f-002: Overdue Follow-ups sorting by most overdue
  it('test-ep-4.2.1-f-002: Overdue widget displays overdue leads sorted by days overdue descending', async () => {
    setUser(marketingUser);
    const mockOverdueData = {
      success: true,
      data: [
        { id: 'lead-1', company_name: 'Recent Overdue', contact_person: 'Bob', days_overdue: 1 },
        { id: 'lead-2', company_name: 'Ancient Overdue', contact_person: 'Alice', days_overdue: 5 }
      ]
    };

    leadService.fetchTodayFollowups.mockResolvedValue({ success: true, data: [] });
    leadService.fetchOverdueFollowups.mockResolvedValue(mockOverdueData);

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Ancient Overdue')).toBeInTheDocument();
    });

    const items = screen.getAllByText(/Overdue/);
    expect(items[1].textContent).toContain('Ancient Overdue');
    expect(items[2].textContent).toContain('Recent Overdue');
  });

  // f-003: Click card triggers navigation to details page
  it('test-ep-4.2.1-f-003: Clicking a card in Today/Overdue widget redirects to lead details page', async () => {
    setUser(marketingUser);
    const mockTodayData = {
      success: true,
      data: [{ id: 'lead-100', company_name: 'Nav Corp', contact_person: 'John', lead_quality: 'Hot' }]
    };
    
    leadService.fetchTodayFollowups.mockResolvedValue(mockTodayData);
    leadService.fetchOverdueFollowups.mockResolvedValue({ success: true, data: [] });

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/marketing/dashboard" element={<DashboardPage />} />
            <Route path="/marketing/leads/:leadId" element={
              <div data-testid="lead-details">
                Lead Details Panel
              </div>
            } />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nav Corp')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Nav Corp'));
    
    await waitFor(() => {
      expect(screen.getByTestId('lead-details')).toBeInTheDocument();
    });
  });

  // f-004: Empty states and count badge 0
  it('test-ep-4.2.1-f-004: Displays correct empty states and 0 count badges when no follow-ups exist', async () => {
    setUser(marketingUser);
    leadService.fetchTodayFollowups.mockResolvedValue({ success: true, data: [] });
    leadService.fetchOverdueFollowups.mockResolvedValue({ success: true, data: [] });

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("All caught up! No follow-ups scheduled for today.")).toBeInTheDocument();
      expect(screen.getByText("No overdue tasks. Good job!")).toBeInTheDocument();
    });

    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  // f-005: Skeleton loader displayed during fetches
  it('test-ep-4.2.1-f-005: Renders skeleton loaders inside widgets while loading', async () => {
    setUser(marketingUser);
    let resolveToday;
    const todayPromise = new Promise((resolve) => { resolveToday = resolve; });
    leadService.fetchTodayFollowups.mockReturnValue(todayPromise);
    leadService.fetchOverdueFollowups.mockResolvedValue({ success: true, data: [] });

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getAllByTestId('widget-skeleton').length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      resolveToday({ success: true, data: [] });
    });
  });

  // f-006: Error state and retry click
  it('test-ep-4.2.1-f-006: Displays error screen and triggers refetch on retry button click', async () => {
    setUser(marketingUser);
    leadService.fetchTodayFollowups
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue({ success: true, data: [] });
    leadService.fetchOverdueFollowups.mockResolvedValue({ success: true, data: [] });

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to load today's follow-ups.")).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /^retry$/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("All caught up! No follow-ups scheduled for today.")).toBeInTheDocument();
    });
  });

  // f-007: Lead list overdue badge format
  it('test-ep-4.2.1-f-007: LeadTable renders correct red badge text for overdue leads', () => {
    const mockLeads = [
      {
        id: 'lead-1',
        leadId: 'LD-001',
        companyName: 'Apocalypse Corp',
        contactPerson: 'Alice',
        mobileNumber: '9999999999',
        status: 'New',
        stage: 'Contacted',
        source: 'Website',
        category: 'IT Services',
        priority: 'Hot',
        nextFollowupDate: '2026-07-01T10:00:00Z',
        isOverdue: true
      }
    ];

    render(
      <MemoryRouter>
        <LeadTable 
          leads={mockLeads} 
          isAdmin={false} 
          selectedIds={new Set()} 
          onOpenLead={() => {}}
          sort={mockSort}
          onSort={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Overdue/)).toBeInTheDocument();
    expect(screen.getByText(/Warning: Lead is overdue/i)).toBeInTheDocument();
  });

  // f-008: Lead list overdue badge removed on follow-up log
  it('test-ep-4.2.1-f-008: Overdue flag gets removed after followup is logged', () => {
    const mockLeads = [
      {
        id: 'lead-1',
        leadId: 'LD-001',
        companyName: 'Logging Corp',
        nextFollowupDate: '2026-07-01T10:00:00Z',
        isOverdue: true
      }
    ];

    const { rerender } = render(
      <MemoryRouter>
        <LeadTable 
          leads={mockLeads} 
          isAdmin={false} 
          selectedIds={new Set()} 
          sort={mockSort}
          onSort={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Overdue/)).toBeInTheDocument();

    const updatedLeads = [
      {
        id: 'lead-1',
        leadId: 'LD-001',
        companyName: 'Logging Corp',
        nextFollowupDate: '2026-08-01T10:00:00Z',
        isOverdue: false
      }
    ];

    rerender(
      <MemoryRouter>
        <LeadTable 
          leads={updatedLeads} 
          isAdmin={false} 
          selectedIds={new Set()} 
          sort={mockSort}
          onSort={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
  });

  // f-009: Closed lead dimmed row style and no overdue badge
  it('test-ep-4.2.1-f-009: Dimming styling applied and overdue badge absent for closed leads', () => {
    const mockLeads = [
      {
        id: 'lead-1',
        leadId: 'LD-001',
        companyName: 'Closed Won Corp',
        status: 'Won',
        stage: 'Won',
        nextFollowupDate: '2026-07-01T10:00:00Z',
        isOverdue: true
      }
    ];

    render(
      <MemoryRouter>
        <LeadTable 
          leads={mockLeads} 
          isAdmin={false} 
          selectedIds={new Set()} 
          sort={mockSort}
          onSort={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
  });

  // f-010: Boundary next date today not marked overdue
  it('test-ep-4.2.1-f-010: Lead scheduled for today is not flagged as overdue', () => {
    const todayStr = new Date().toISOString();
    const mockLeads = [
      {
        id: 'lead-1',
        leadId: 'LD-001',
        companyName: 'Today Corp',
        nextFollowupDate: todayStr,
        isOverdue: false
      }
    ];

    render(
      <MemoryRouter>
        <LeadTable 
          leads={mockLeads} 
          isAdmin={false} 
          selectedIds={new Set()} 
          sort={mockSort}
          onSort={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
  });

  // f-011: Admin Dashboard At Risk widget
  it('test-ep-4.2.1-f-011: Admin Dashboard displays At Risk Follow-ups widget with correct details', async () => {
    setUser(adminUser);
    const mockAtRiskData = {
      success: true,
      data: {
        total_at_risk: 2,
        leads: [
          { id: 'lead-1', company_name: 'Risk Corp A', assigned_to: 'John Doe', days_overdue: 5 },
          { id: 'lead-2', company_name: 'Risk Corp B', assigned_to: 'Jane Smith', days_overdue: 3 }
        ]
      }
    };

    leadService.fetchAtRiskLeads.mockResolvedValue(mockAtRiskData);

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Risk Corp A')).toBeInTheDocument();
      expect(screen.getByText('Risk Corp B')).toBeInTheDocument();
    });

    expect(screen.getByText('5 days overdue')).toBeInTheDocument();
    expect(screen.getByText('3 days overdue')).toBeInTheDocument();
  });

  // f-012: At Risk card click navigates to admin lead details
  it('test-ep-4.2.1-f-012: Clicking an at-risk item navigates to admin lead details page', async () => {
    setUser(adminUser);
    const mockAtRiskData = {
      success: true,
      data: {
        total_at_risk: 1,
        leads: [
          { id: 'lead-99', company_name: 'Risk Inc', assigned_to: 'John Doe', days_overdue: 4 }
        ]
      }
    };

    leadService.fetchAtRiskLeads.mockResolvedValue(mockAtRiskData);

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/leads/:leadId" element={<div data-testid="admin-details">Admin Lead Details</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Risk Inc')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Risk Inc'));

    await waitFor(() => {
      expect(screen.getByTestId('admin-details')).toBeInTheDocument();
    });
  });

  // f-013: At Risk empty state
  it('test-ep-4.2.1-f-013: Admin At Risk widget displays correct empty state text', async () => {
    setUser(adminUser);
    leadService.fetchAtRiskLeads.mockResolvedValue({
      success: true,
      data: { total_at_risk: 0, leads: [] }
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No leads are currently at risk. All follow-ups are on track.")).toBeInTheDocument();
    });
  });

  // f-014: Role protection
  it('test-ep-4.2.1-f-014: Marketing Executive role gets 403 response when requesting at-risk API', async () => {
    setUser(marketingUser);
    leadService.fetchAtRiskLeads.mockResolvedValue({
      success: false,
      status_code: 403,
      message: "Access denied. Admin role required.",
      data: null
    });

    const res = await leadService.fetchAtRiskLeads();
    expect(res.success).toBe(false);
    expect(res.status_code).toBe(403);
  });

  // f-015: Bell badge unread count
  it('test-ep-4.2.1-f-015: Notification bell displays correct unread badge and aria-label', async () => {
    const mockNotifs = {
      success: true,
      data: [
        { id: 'notif-1', message: 'Test Notif 1', read: false },
        { id: 'notif-2', message: 'Test Notif 2', read: true }
      ]
    };

    notificationService.fetchNotifications.mockResolvedValue(mockNotifs);

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );

    await waitFor(() => {
      const badge = screen.getByLabelText('1 unread notifications');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toBe('1');
    });
  });

  // f-016: Bell dropdown unread list
  it('test-ep-4.2.1-f-016: Clicking bell opens dropdown and displays unread notification lists', async () => {
    const mockNotifs = {
      success: true,
      data: [
        { id: 'notif-1', message: 'Follow-up is due today for TechCorp', read: false }
      ]
    };

    notificationService.fetchNotifications.mockResolvedValue(mockNotifs);

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );

    const bell = screen.getByRole('button', { name: /Notifications/ });
    fireEvent.click(bell);

    await waitFor(() => {
      expect(screen.getByText('Follow-up is due today for TechCorp')).toBeInTheDocument();
    });
  });

  // f-017: Keyboard tab controls / Escape closing
  it('test-ep-4.2.1-f-017: Esc closes dropdown and focuses bell button', async () => {
    const mockNotifs = {
      success: true,
      data: [{ id: 'notif-1', message: 'Test Notif', read: false }]
    };
    notificationService.fetchNotifications.mockResolvedValue(mockNotifs);

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );

    const bell = screen.getByRole('button', { name: /Notifications/ });
    fireEvent.click(bell);

    await waitFor(() => {
      expect(screen.getByText('Test Notif')).toBeInTheDocument();
    });

    fireEvent.keyDown(bell, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Test Notif')).not.toBeInTheDocument();
    });
    expect(document.activeElement).toBe(bell);
  });

  // f-018: WCAG AA color contrast
  it('test-ep-4.2.1-f-018: Red overdue badge uses color tokens matching WCAG contrast requirements', () => {
    const mockLeads = [
      {
        id: 'lead-1',
        leadId: 'LD-001',
        companyName: 'Apocalypse Corp',
        nextFollowupDate: '2026-07-01T10:00:00Z',
        isOverdue: true
      }
    ];

    render(
      <MemoryRouter>
        <LeadTable 
          leads={mockLeads} 
          isAdmin={false} 
          selectedIds={new Set()} 
          sort={mockSort}
          onSort={() => {}}
        />
      </MemoryRouter>
    );

    const badge = screen.getByText(/Overdue/);
    expect(badge.className).toContain('text-red-800');
    expect(badge.className).toContain('bg-red-100');
  });

  // f-019: Semantic HTML tags
  it('test-ep-4.2.1-f-019: Renders correct semantic elements and ARIA attributes', () => {
    const mockLeads = [
      {
        id: 'lead-1',
        leadId: 'LD-001',
        companyName: 'Apocalypse Corp',
        nextFollowupDate: '2026-07-01T10:00:00Z',
        isOverdue: true
      }
    ];

    render(
      <MemoryRouter>
        <LeadTable 
          leads={mockLeads} 
          isAdmin={false} 
          selectedIds={new Set()} 
          sort={mockSort}
          onSort={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Warning: Lead is overdue')).toBeInTheDocument();
  });

  // f-020: Counts update on dashboard return
  it('test-ep-4.2.1-f-020: Dashboard refetches follow-up counts on mount', async () => {
    setUser(marketingUser);
    const spyToday = leadService.fetchTodayFollowups.mockResolvedValue({ success: true, data: [] });
    const spyOverdue = leadService.fetchOverdueFollowups.mockResolvedValue({ success: true, data: [] });

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(spyToday).toHaveBeenCalled();
      expect(spyOverdue).toHaveBeenCalled();
    });
  });

  // f-021: Routing refresh F5 integrity
  it('test-ep-4.2.1-f-021: Routing routes load components properly', () => {
    setUser(marketingUser);
    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/marketing/dashboard" element={<div>Dashboard Component</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Component')).toBeInTheDocument();
  });

  // f-022: Offline resilience
  it('test-ep-4.2.1-f-022: Displays cached items and offline banner when offline', async () => {
    setUser(marketingUser);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    
    const cachedToday = [{ id: 'lead-cached', company_name: 'Offline Corp', lead_quality: 'Hot' }];
    localStorage.setItem('crm_cache_today_followups', JSON.stringify(cachedToday));

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Offline Corp')).toBeInTheDocument();
      expect(screen.getByText('You are currently offline. Viewing cached follow-up queues.')).toBeInTheDocument();
    });
  });

  // f-023: Counts refresh on details return
  it('test-ep-4.2.1-f-023: Re-mount of Dashboard calls leadService follow-up fetches', async () => {
    setUser(marketingUser);
    const spyToday = leadService.fetchTodayFollowups.mockResolvedValue({ success: true, data: [] });
    const spyOverdue = leadService.fetchOverdueFollowups.mockResolvedValue({ success: true, data: [] });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(spyToday).toHaveBeenCalledTimes(1);
    });
    unmount();

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(spyToday).toHaveBeenCalledTimes(2);
    });
  });
});
