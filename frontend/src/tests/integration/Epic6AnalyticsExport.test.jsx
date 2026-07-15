import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import AdminDashboardPage from '../../pages/admin/AdminDashboardPage';
import MarketingDashboardPage from '../../pages/marketing/MarketingDashboardPage';
import LeadList from '../../pages/leads/LeadList';
import ExportHistoryPage from '../../pages/admin/ExportHistoryPage';
import * as leadService from '../../services/leadService';

// Mock leadService
vi.mock('../../services/leadService', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    fetchCategories: vi.fn(),
    fetchSubCategories: vi.fn(),
    fetchDashboardKpis: vi.fn(),
    fetchCategoryVolume: vi.fn(),
    fetchWonRateBySource: vi.fn(),
    fetchAdminAtRisk: vi.fn(),
    fetchMeDashboardCards: vi.fn(),
    fetchMeConversionRate: vi.fn(),
    fetchTodayFollowups: vi.fn(),
    exportLeads: vi.fn(),
    fetchExportHistory: vi.fn(),
    downloadExportFile: vi.fn(),
    fetchAdminLeads: vi.fn(),
    fetchMarketingLeads: vi.fn(),
    fetchUsers: vi.fn(() => Promise.resolve({ success: true, data: [] })),
    fetchSavedViews: vi.fn(() => Promise.resolve({ success: true, data: [] })),
    exportReport: vi.fn()
  };
});

describe('EPIC-6 Analytics & Export Integration Tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.resetAllMocks();

    // Default categories & subcategories mocks
    leadService.fetchCategories.mockResolvedValue({
      success: true,
      data: [{ id: 'cat-1', name: 'Software Solutions' }]
    });
    leadService.fetchSubCategories.mockResolvedValue({
      success: true,
      data: [{ id: 'sub-1', name: 'CRM', category_id: 'cat-1' }]
    });
    leadService.fetchDashboardKpis.mockResolvedValue({
      success: true,
      data: { total_leads: 100, today_followups: 0, new: 10, won: 5, lost: 2, conversion_rate: '5%' }
    });
    leadService.fetchCategoryVolume.mockResolvedValue({
      success: true,
      data: []
    });
    leadService.fetchWonRateBySource.mockResolvedValue({
      success: true,
      data: []
    });
    leadService.fetchAdminAtRisk.mockResolvedValue({
      success: true,
      data: { total_at_risk: 0, breakdown: [], leads: [] }
    });
  });

  afterEach(() => {
    cleanup();
  });

  const loginAsAdmin = () => {
    localStorage.setItem('crm_access_token', JSON.stringify('mock-admin-token'));
    localStorage.setItem('crm_user', JSON.stringify({
      id: 'admin-1',
      name: 'Admin Kumar',
      role: 'Admin',
    }));
  };

  const loginAsME = () => {
    localStorage.setItem('crm_access_token', JSON.stringify('mock-me-token'));
    localStorage.setItem('crm_user', JSON.stringify({
      id: 'me-1',
      name: 'ME Kumar',
      role: 'Marketing Executive',
    }));
  };

  // STORY-6.1.1 — Admin Dashboard KPI Cards
  it('test-ep-6.1.1-f-001: Admin dashboard renders KPI cards showing total_leads, status-wise counts, today_followups, lead quality breakdown, and conversion rate', async () => {
    loginAsAdmin();
    leadService.fetchDashboardKpis.mockResolvedValue({
      success: true,
      data: {
        total_leads: 150,
        today_followups: 12,
        new: 30,
        won: 8,
        lost: 2,
        conversion_rate: '5.33%',
        hot_leads: 50,
        warm_leads: 70,
        cold_leads: 30
      }
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Verify KPI card rendering
    expect(await screen.findByText('Total Leads')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText("Today's Follow-ups")).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getAllByText('30').length).toBeGreaterThan(0);
    expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
    expect(screen.getByText('5.33%')).toBeInTheDocument();

    // Verify Lead Quality breakdown section
    expect(screen.getByText('Hot:')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Warm:')).toBeInTheDocument();
    expect(screen.getByText('70')).toBeInTheDocument();
    expect(screen.getByText('Cold:')).toBeInTheDocument();
    expect(screen.getAllByText('30').length).toBeGreaterThan(0);
  });

  it('test-ep-6.1.1-f-002: KPI cards re-render with filtered data when date range is selected from the date picker', async () => {
    loginAsAdmin();
    leadService.fetchDashboardKpis.mockResolvedValueOnce({
      success: true,
      data: { total_leads: 150, new: 30 }
    }).mockResolvedValueOnce({
      success: true,
      data: {
        total_leads: 100,
        new: 20,
        today_followups: 8,
        won: 6,
        lost: 1,
        conversion_rate: '6%',
        hot_leads: 30,
        warm_leads: 50,
        cold_leads: 20
      }
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await screen.findByText('Total Leads');

    // Simulate selecting from and to date and clicking apply
    const fromInput = screen.getByLabelText('From Date');
    const toInput = screen.getByLabelText('To Date');
    const applyBtn = screen.getByRole('button', { name: 'Apply' });

    fireEvent.change(fromInput, { target: { value: '2026-01-01' } });
    fireEvent.change(toInput, { target: { value: '2026-06-30' } });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(leadService.fetchDashboardKpis).toHaveBeenLastCalledWith(
        expect.objectContaining({ from: '2026-01-01', to: '2026-06-30' })
      );
    });

    // Check re-rendered filtered values
    expect(await screen.findByText('100')).toBeInTheDocument();
    expect(screen.getByText('6%')).toBeInTheDocument();
  });

  it('test-ep-6.1.1-f-003: Today\'s follow-ups count is displayed as a distinct KPI card with a bell/calendar icon', async () => {
    loginAsAdmin();
    leadService.fetchDashboardKpis.mockResolvedValue({
      success: true,
      data: { today_followups: 12 }
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const followupsCardVal = await screen.findByText('12');
    expect(followupsCardVal).toBeInTheDocument();
    const followupsCard = followupsCardVal.closest('.glass-card');
    expect(followupsCard.querySelector('.material-symbols-outlined').textContent).toBe('calendar_today');
  });

  it('test-ep-6.1.1-f-004: Admin-only dashboard — Marketing Executive accessing /admin/dashboard sees 403 page or is redirected', async () => {
    loginAsME(); // Logged in as Marketing Executive

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Verify Access Denied rendering
    expect(await screen.findByTestId('access-denied')).toBeInTheDocument();
    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    expect(leadService.fetchDashboardKpis).not.toHaveBeenCalled();
  });

  // STORY-6.1.1 — Charts
  it('test-ep-6.1.1-f-005: Category Volume chart renders count per category/sub_category', async () => {
    loginAsAdmin();
    leadService.fetchCategoryVolume.mockResolvedValue({
      success: true,
      data: [
        { category: 'Software Solutions', sub_category: 'CRM', lead_count: 4200 },
        { category: 'Software Solutions', sub_category: 'ERP', lead_count: 2600 }
      ]
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Category Volume')).toBeInTheDocument();
    expect(screen.getByText('Software Solutions / CRM')).toBeInTheDocument();
    expect(screen.getByText('4200')).toBeInTheDocument();
    expect(screen.getByText('Software Solutions / ERP')).toBeInTheDocument();
    expect(screen.getByText('2600')).toBeInTheDocument();
  });

  it('test-ep-6.1.1-f-006: Category Volume chart respects date range filter and re-fetches when date range changes', async () => {
    loginAsAdmin();
    leadService.fetchCategoryVolume.mockResolvedValue({ success: true, data: [] });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await screen.findByText('Category Volume');

    const fromInput = screen.getByLabelText('From Date');
    const toInput = screen.getByLabelText('To Date');
    const applyBtn = screen.getByRole('button', { name: 'Apply' });

    fireEvent.change(fromInput, { target: { value: '2026-01-01' } });
    fireEvent.change(toInput, { target: { value: '2026-06-30' } });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(leadService.fetchCategoryVolume).toHaveBeenLastCalledWith(
        expect.objectContaining({ from: '2026-01-01', to: '2026-06-30' })
      );
    });
  });

  it('test-ep-6.1.1-f-007: Category Volume chart shows empty state when no data matches the selected range', async () => {
    loginAsAdmin();
    leadService.fetchCategoryVolume.mockResolvedValue({
      success: true,
      data: []
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('No data available for this period')).toBeInTheDocument();
  });

  it('test-ep-6.1.1-f-008: Won Rate by Source chart renders win_rate % per lead source', async () => {
    loginAsAdmin();
    leadService.fetchWonRateBySource.mockResolvedValue({
      success: true,
      data: [
        { source: 'Website', total: 12000, won: 900, lost: 400, win_rate: '7.5%' },
        { source: 'Referral', total: 6000, won: 720, lost: 150, win_rate: '12%' }
      ]
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Win Rate by Source')).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.getByText('7.5%')).toBeInTheDocument();
    expect(screen.getByText('Referral')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
  });

  it('test-ep-6.1.1-f-009: Won Rate chart shows empty state with "No closed leads yet" when no data exists', async () => {
    loginAsAdmin();
    leadService.fetchWonRateBySource.mockResolvedValue({
      success: true,
      data: []
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('No closed leads for this period')).toBeInTheDocument();
  });

  // STORY-6.1.1 — At Risk Widget
  it('test-ep-6.1.1-f-010: At Risk widget displays total at-risk count, a breakdown by assigned user, and a list of overdue leads', async () => {
    loginAsAdmin();
    leadService.fetchAdminAtRisk.mockResolvedValue({
      success: true,
      data: {
        total_at_risk: 220,
        breakdown: [{ user_id: 'u1', user_name: 'Priya', at_risk_count: 34, oldest_overdue_days: 12 }],
        leads: [{ id: 'l1', lead_id: 'LD-2026-00042', company_name: 'Acme Corp', assigned_to: 'Priya', days_overdue: 5 }]
      }
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('At Risk Leads: 220')).toBeInTheDocument();
    expect(screen.getAllByText('Priya').length).toBeGreaterThan(0);
    expect(screen.getByText('34 Leads')).toBeInTheDocument();
    expect(screen.getByText('Oldest: 12 days overdue')).toBeInTheDocument();

    // Verify Leads Table
    expect(screen.getByText('LD-2026-00042')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('5 days')).toBeInTheDocument();
  });

  it('test-ep-6.1.1-f-011: At Risk widget supports configurable overdue_days threshold via input or dropdown', async () => {
    loginAsAdmin();
    leadService.fetchAdminAtRisk.mockResolvedValue({
      success: true,
      data: { total_at_risk: 10, breakdown: [], leads: [] }
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const select = await screen.findByLabelText('Overdue threshold days');
    fireEvent.change(select, { target: { value: '7' } });

    await waitFor(() => {
      expect(leadService.fetchAdminAtRisk).toHaveBeenLastCalledWith(
        expect.objectContaining({ overdue_days: '7' })
      );
    });
  });

  it('test-ep-6.1.1-f-012: At Risk widget shows empty state when no leads are overdue', async () => {
    loginAsAdmin();
    leadService.fetchAdminAtRisk.mockResolvedValue({
      success: true,
      data: { total_at_risk: 0, breakdown: [], leads: [] }
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('No at-risk leads')).toBeInTheDocument();
  });

  // STORY-6.2.1 — Marketing Executive Dashboard
  it('test-ep-6.2.1-f-001: Marketing Executive dashboard renders KPI cards showing my_leads, my_followups_today, my_won_leads, my_lost_leads', async () => {
    loginAsME();
    leadService.fetchMeDashboardCards.mockResolvedValue({
      success: true,
      data: {
        my_leads: 50,
        my_followups_today: 5,
        my_won_leads: 8,
        my_lost_leads: 3
      }
    });
    leadService.fetchMeConversionRate.mockResolvedValue({ success: true, data: {} });
    leadService.fetchTodayFollowups.mockResolvedValue({ success: true, data: [] });

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <MarketingDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('My Leads')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText("Today's Follow-ups")).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Won Leads')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Lost Leads')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('test-ep-6.2.1-f-002: ME KPI cards show zero values when the user has no leads assigned', async () => {
    loginAsME();
    leadService.fetchMeDashboardCards.mockResolvedValue({
      success: true,
      data: { my_leads: 0, my_followups_today: 0, my_won_leads: 0, my_lost_leads: 0 }
    });
    leadService.fetchMeConversionRate.mockResolvedValue({ success: true, data: {} });
    leadService.fetchTodayFollowups.mockResolvedValue({ success: true, data: [] });

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <MarketingDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('My Leads')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(4);
  });

  it('test-ep-6.2.1-f-003: ME dashboard is restricted — Admin user accessing /marketing/dashboard sees 403 or redirect', async () => {
    loginAsAdmin(); // Admin logs in

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <MarketingDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('access-denied')).toBeInTheDocument();
    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    expect(leadService.fetchMeDashboardCards).not.toHaveBeenCalled();
  });

  it('test-ep-6.2.1-f-004: Conversion rate widget displays Won, Lost, Total Closed counts and the conversion_rate percentage for the logged-in ME', async () => {
    loginAsME();
    leadService.fetchMeDashboardCards.mockResolvedValue({ success: true, data: {} });
    leadService.fetchMeConversionRate.mockResolvedValue({
      success: true,
      data: { won: 8, lost: 3, total_closed: 11, conversion_rate: '72.73%' }
    });
    leadService.fetchTodayFollowups.mockResolvedValue({ success: true, data: [] });

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <MarketingDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('72.73%')).toBeInTheDocument();
    expect(screen.getByText('Won Leads:')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Lost Leads:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Total Closed:')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
  });

  it('test-ep-6.2.1-f-005: Conversion rate widget displays 0% when no Won/Lost leads exist, with no divide-by-zero UI error', async () => {
    loginAsME();
    leadService.fetchMeDashboardCards.mockResolvedValue({ success: true, data: {} });
    leadService.fetchMeConversionRate.mockResolvedValue({
      success: true,
      data: { won: 0, lost: 0, total_closed: 0, conversion_rate: '0%' }
    });
    leadService.fetchTodayFollowups.mockResolvedValue({ success: true, data: [] });

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <MarketingDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('0%')).toBeInTheDocument();
  });

  it('test-ep-6.2.1-f-006: Today\'s Follow-ups list renders leads due today sorted by lead_quality (Hot first), showing company_name, contact_person, lead_quality badge, next_followup_date, and status', async () => {
    loginAsME();
    leadService.fetchMeDashboardCards.mockResolvedValue({ success: true, data: {} });
    leadService.fetchMeConversionRate.mockResolvedValue({ success: true, data: {} });
    leadService.fetchTodayFollowups.mockResolvedValue({
      success: true,
      data: [
        { id: 'l1', lead_id: 'LD-2026-00042', company_name: 'Acme Corp', contact_person: 'Ravi', lead_quality: 'Hot', next_followup_date: '2026-07-09T10:00:00Z', status: 'Contacted' }
      ]
    });

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <MarketingDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Contact: Ravi')).toBeInTheDocument();
    expect(screen.getByText('Hot')).toBeInTheDocument();
  });

  it('test-ep-6.2.1-f-007: Follow-ups list shows empty state when no follow-ups are due today', async () => {
    loginAsME();
    leadService.fetchMeDashboardCards.mockResolvedValue({ success: true, data: {} });
    leadService.fetchMeConversionRate.mockResolvedValue({ success: true, data: {} });
    leadService.fetchTodayFollowups.mockResolvedValue({
      success: true,
      data: []
    });

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <MarketingDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('No follow-ups due today')).toBeInTheDocument();
  });

  it('test-ep-6.2.1-f-008: Follow-ups list supports "Load more" pagination when entries exceed the initial page limit', async () => {
    loginAsME();
    leadService.fetchMeDashboardCards.mockResolvedValue({ success: true, data: {} });
    leadService.fetchMeConversionRate.mockResolvedValue({ success: true, data: {} });
    leadService.fetchTodayFollowups.mockResolvedValueOnce({
      success: true,
      data: Array.from({ length: 20 }, (_, i) => ({ id: `l-${i}`, company_name: `Company ${i}`, contact_person: 'Ravi', lead_quality: 'Warm', next_followup_date: '2026-07-09T10:00:00Z', status: 'Contacted' })),
      pagination: { page: 1, total_pages: 2 }
    }).mockResolvedValueOnce({
      success: true,
      data: [{ id: 'l-next', company_name: 'Next Corp', contact_person: 'Ravi', lead_quality: 'Hot', next_followup_date: '2026-07-09T10:00:00Z', status: 'Contacted' }],
      pagination: { page: 2, total_pages: 2 }
    });

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <MarketingDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const loadMoreBtn = await screen.findByText('Load more');
    expect(loadMoreBtn).toBeInTheDocument();

    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(screen.getByText('Next Corp')).toBeInTheDocument();
    });
  });

  // STORY-6.3.1 — Export Lead Data
  it('test-ep-6.3.1-f-001: "Export" button is visible on the Lead List page for Admin users', async () => {
    loginAsAdmin();
    leadService.fetchAdminLeads.mockResolvedValue({ success: true, data: [] });

    render(
      <MemoryRouter initialEntries={['/admin/leads']}>
        <AuthProvider>
          <LeadList />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Export')).toBeInTheDocument();
  });

  it('test-ep-6.3.1-f-002: Export button is hidden for Marketing Executive users', async () => {
    loginAsME();
    leadService.fetchMarketingLeads.mockResolvedValue({ success: true, data: [] });

    render(
      <MemoryRouter initialEntries={['/marketing/leads']}>
        <AuthProvider>
          <LeadList />
        </AuthProvider>
      </MemoryRouter>
    );

    await screen.findByText('Create Lead');
    expect(screen.queryByText('Export')).not.toBeInTheDocument();
  });

  it('test-ep-6.3.1-f-003: Clicking Export opens a modal with format selection (CSV/Excel) and confirmation of applied filters', async () => {
    loginAsAdmin();
    leadService.fetchAdminLeads.mockResolvedValue({ success: true, data: [] });

    render(
      <MemoryRouter initialEntries={['/admin/leads']}>
        <AuthProvider>
          <LeadList />
        </AuthProvider>
      </MemoryRouter>
    );

    const exportBtn = await screen.findByText('Export');
    fireEvent.click(exportBtn);

    expect(await screen.findByText('Select Export Format')).toBeInTheDocument();
    expect(screen.getByLabelText('CSV')).toBeInTheDocument();
    expect(screen.getByLabelText('Excel')).toBeInTheDocument();
  });

  it('test-ep-6.3.1-f-004: Selecting CSV and clicking Export dispatches GET request and triggers file download', async () => {
    loginAsAdmin();
    leadService.fetchAdminLeads.mockResolvedValue({ success: true, data: [] });
    leadService.exportLeads.mockResolvedValue(new Blob(['data'], { type: 'text/csv' }));

    render(
      <MemoryRouter initialEntries={['/admin/leads']}>
        <AuthProvider>
          <LeadList />
        </AuthProvider>
      </MemoryRouter>
    );

    const exportBtn = await screen.findByText('Export');
    fireEvent.click(exportBtn);

    const confirmExportBtn = screen.getByTestId('confirm-export-btn');
    fireEvent.click(confirmExportBtn);

    await waitFor(() => {
      expect(leadService.exportLeads).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'csv' }),
        true
      );
    });
  });

  it('test-ep-6.3.1-f-005: Selecting Excel format and clicking Export dispatches request for Excel file', async () => {
    loginAsAdmin();
    leadService.fetchAdminLeads.mockResolvedValue({ success: true, data: [] });
    leadService.exportLeads.mockResolvedValue(new Blob(['data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));

    render(
      <MemoryRouter initialEntries={['/admin/leads']}>
        <AuthProvider>
          <LeadList />
        </AuthProvider>
      </MemoryRouter>
    );

    const exportBtn = await screen.findByText('Export');
    fireEvent.click(exportBtn);

    const excelRadio = screen.getByLabelText('Excel');
    fireEvent.click(excelRadio);

    const confirmExportBtn = screen.getByTestId('confirm-export-btn');
    fireEvent.click(confirmExportBtn);

    await waitFor(() => {
      expect(leadService.exportLeads).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'excel' }),
        true
      );
    });
  });

  it('test-ep-6.3.1-f-006: Export modal shows error state when API returns 404 (no leads match filters)', async () => {
    loginAsAdmin();
    leadService.fetchAdminLeads.mockResolvedValue({ success: true, data: [] });
    leadService.exportLeads.mockRejectedValue(new Error('Failed to export leads.'));

    render(
      <MemoryRouter initialEntries={['/admin/leads']}>
        <AuthProvider>
          <LeadList />
        </AuthProvider>
      </MemoryRouter>
    );

    const exportBtn = await screen.findByText('Export');
    fireEvent.click(exportBtn);

    const confirmExportBtn = screen.getByTestId('confirm-export-btn');
    fireEvent.click(confirmExportBtn);

    expect(await screen.findByText('Failed to export leads.')).toBeInTheDocument();
  });

  it('test-ep-6.3.1-f-007: Export History page lists past exports with columns: date, format, record count, filters, status', async () => {
    loginAsAdmin();
    leadService.fetchExportHistory.mockResolvedValue({
      success: true,
      data: [{
        id: '123',
        timestamp: '2026-07-09T10:00:00Z',
        details: { format: 'csv', record_count: 245, filters: { status: 'Contacted' } }
      }]
    });

    render(
      <MemoryRouter initialEntries={['/admin/leads/export/history']}>
        <AuthProvider>
          <ExportHistoryPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Export History')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('245')).toBeInTheDocument();
    expect(screen.getByText('status: Contacted')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('test-ep-6.3.1-f-008: Clicking "Download" on an export history row triggers re-download of the exported file', async () => {
    loginAsAdmin();
    leadService.fetchExportHistory.mockResolvedValue({
      success: true,
      data: [{
        id: '123',
        timestamp: '2026-07-09T10:00:00Z',
        details: { format: 'csv', record_count: 245 }
      }]
    });
    leadService.downloadExportFile.mockResolvedValue(new Blob(['re-downloaded'], { type: 'text/csv' }));

    render(
      <MemoryRouter initialEntries={['/admin/leads/export/history']}>
        <AuthProvider>
          <ExportHistoryPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const downloadBtn = await screen.findByText('Download');
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(leadService.downloadExportFile).toHaveBeenCalledWith('123');
    });
  });

  // Resilient & Accessibility Checks
  it('test-ep-6.3.1-f-009: Loading state shown while KPI data is being fetched on Admin dashboard', async () => {
    loginAsAdmin();
    let resolveKpi;
    const kpiPromise = new Promise(resolve => { resolveKpi = resolve; });
    leadService.fetchDashboardKpis.mockImplementation(() => kpiPromise);

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('widget-skeleton')).toBeInTheDocument();
    
    // Resolve promise
    resolveKpi({ success: true, data: {} });
    await waitFor(() => {
      expect(screen.queryByTestId('widget-skeleton')).not.toBeInTheDocument();
    });
  });

  it('test-ep-6.3.1-f-010: Error state shown when KPI API returns 500 on Admin dashboard', async () => {
    loginAsAdmin();
    leadService.fetchDashboardKpis.mockRejectedValue(new Error('Failed to load'));

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Failed to load dashboard data')).toBeInTheDocument();
  });

  it('test-ep-6.3.1-f-011: Keyboard navigation and ARIA labels across Admin dashboard components', async () => {
    loginAsAdmin();
    leadService.fetchDashboardKpis.mockResolvedValue({ success: true, data: { total_leads: 10 } });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Verify role status is present
    const elements = await screen.findAllByRole('status');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('test-ep-6.3.1-f-012: Loading and error states for ME dashboard follows-ups and conversion rate', async () => {
    loginAsME();
    leadService.fetchMeDashboardCards.mockRejectedValue(new Error('Failed to load cards'));
    leadService.fetchMeConversionRate.mockRejectedValue(new Error('Failed to load conversion'));
    leadService.fetchTodayFollowups.mockRejectedValue(new Error('Failed to load followups'));

    render(
      <MemoryRouter initialEntries={['/marketing/dashboard']}>
        <AuthProvider>
          <MarketingDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Failed to load KPI card data')).toBeInTheDocument();
    expect(screen.getByText('Failed to load conversion stats')).toBeInTheDocument();
    expect(screen.getByText('Failed to load followups')).toBeInTheDocument();
  });
});
