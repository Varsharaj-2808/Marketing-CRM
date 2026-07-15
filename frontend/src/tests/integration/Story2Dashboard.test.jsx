import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import AdminDashboardPage from '../../pages/admin/AdminDashboardPage';
import LeadList from '../../pages/leads/LeadList';
import * as leadService from '../../services/leadService';

// Mock leadService exports to control API responses during integration tests
vi.mock('../../services/leadService', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    fetchCategories: vi.fn(),
    fetchSubCategories: vi.fn(),
    fetchDashboardKpis: vi.fn(),
    fetchWonRateByCategory: vi.fn(),
    fetchLeadVolumeByCategory: vi.fn(),
    exportReport: vi.fn(),
    exportLeads: vi.fn(),
    fetchAdminLeads: vi.fn(),
    fetchUsers: vi.fn(() => Promise.resolve({ success: true, data: [] })),
    fetchSavedViews: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  };
});

describe('EPIC-3 Story-2 (STORY-3.2.1) Integration Tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
    localStorage.setItem('crm_user', JSON.stringify({
      id: 'EMP-00001',
      name: 'Admin User',
      email: 'admin@company.com',
      role: 'Admin',
      status: 'Active',
    }));

    vi.resetAllMocks();

    // Default mock implementation setup
    leadService.fetchCategories.mockResolvedValue({
      success: true,
      data: [
        { id: 'cat-001', category_name: 'IT Services', status: 'Active' },
        { id: 'cat-002', category_name: 'Digital Marketing', status: 'Active' },
      ],
    });

    leadService.fetchSubCategories.mockResolvedValue({
      success: true,
      data: [
        { id: 'sub-001', sub_category_name: 'Web Development', status: 'Active' },
        { id: 'sub-002', sub_category_name: 'Mobile App Development', status: 'Active' },
      ],
    });

    leadService.fetchDashboardKpis.mockResolvedValue({
      success: true,
      data: {
        total_leads: 120,
        won: 10,
        lost: 5,
        conversion_rate: '66.67%',
      },
    });

    leadService.fetchWonRateByCategory.mockResolvedValue({
      success: true,
      data: [
        {
          category_id: 'cat-001',
          category_name: 'IT Services',
          total_closed: '15',
          won: '10',
          lost: '5',
          win_rate: '66.67%',
        },
      ],
    });

    leadService.fetchLeadVolumeByCategory.mockResolvedValue({
      success: true,
      data: [
        {
          category_id: 'cat-001',
          category_name: 'IT Services',
          lead_count: '9',
        },
        {
          category_id: 'cat-002',
          category_name: 'Digital Marketing',
          lead_count: '15',
        },
      ],
    });

    leadService.fetchAdminLeads.mockResolvedValue({
      success: true,
      data: [],
      pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
    });
  });

  afterEach(() => {
    cleanup();
  });

  // Test 1: Category filters on Lead List
  it('FE-TC-3.2.1-01: renders Category and Sub-Category dropdowns on Lead List, Sub-Category is disabled until Category is selected', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/leads']}>
        <AuthProvider>
          <LeadList />
        </AuthProvider>
      </MemoryRouter>
    );

    // Assert filters are present
    const categoryDropdown = await screen.findByLabelText('Category');
    const subCategoryDropdown = screen.getByLabelText('Sub-Category');

    expect(categoryDropdown).toBeInTheDocument();
    expect(subCategoryDropdown).toBeInTheDocument();
    expect(subCategoryDropdown).toBeDisabled();

    // Focus the category select to trigger lazy loading of categories list
    fireEvent.focus(categoryDropdown);

    // Wait for the select option cat-001 to appear
    await waitFor(() => {
      const opt = categoryDropdown.querySelector('option[value="cat-001"]');
      expect(opt).toBeInTheDocument();
    });

    // Select category and assert sub-category gets enabled
    fireEvent.change(categoryDropdown, { target: { value: 'cat-001' } });
    await waitFor(() => expect(subCategoryDropdown).not.toBeDisabled());
  });

  // Test 2: Apply Category filter on Dashboard with loading state
  it('FE-TC-3.2.1-02: applies Category filter on Dashboard, triggers loading state and updates KPIs', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const categorySelect = await screen.findByLabelText('Business Category');
    expect(categorySelect).toBeInTheDocument();

    // Select category
    fireEvent.change(categorySelect, { target: { value: 'cat-001' } });

    // Verify service fetch was triggered with category filter
    await waitFor(() => {
      expect(leadService.fetchDashboardKpis).toHaveBeenCalledWith(
        expect.objectContaining({ category_id: 'cat-001' })
      );
    });
  });

  // Test 3: View Won-rate-by-Category widget
  it('FE-TC-3.2.1-03: renders Won-rate-by-Category widget with correct percentage details', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Verify title and Win-Rate display
    expect(await screen.findByText(/Won-Rate by Business Category/i)).toBeInTheDocument();
    expect((await screen.findAllByText('IT Services')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('66.67%').length).toBeGreaterThan(0);
  });

  // Test 4: Real-time update check (Verify widget adapts to new mock values on load)
  it('FE-TC-3.2.1-04: updates Won-rate percentages dynamically based on service updates', async () => {
    // Override won-rate response to simulate real-time stage change update (e.g. increase win rate to 75.00%)
    leadService.fetchWonRateByCategory.mockResolvedValue({
      success: true,
      data: [
        {
          category_id: 'cat-001',
          category_name: 'IT Services',
          total_closed: '16',
          won: '12',
          lost: '4',
          win_rate: '75.00%',
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Verify updated win rate percentage shows
    expect(await screen.findByText('75.00%')).toBeInTheDocument();
  });

  // Test 5: View Lead-volume-by-Category chart
  it('FE-TC-3.2.1-05: renders Lead-volume-by-Category chart with category names', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Lead Volume by Category/i)).toBeInTheDocument();
    expect((await screen.findAllByText('IT Services')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Digital Marketing')).length).toBeGreaterThan(0);
  });

  // Test 6: Chart interaction and tooltip
  it('FE-TC-3.2.1-06: shows tooltip with count on hover over a volume bar', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const itServicesLabel = await screen.findByTitle('IT Services');
    const chartBar = itServicesLabel.closest('.group');
    expect(chartBar).toBeInTheDocument();

    // Simulate Hover (Mouse Enter)
    fireEvent.mouseEnter(chartBar);

    // Verify tooltip shows numerical count
    expect(await screen.findByText('9 leads')).toBeInTheDocument();

    // Simulate Mouse Leave
    fireEvent.mouseLeave(chartBar);
    await waitFor(() => {
      expect(screen.queryByText('9 leads')).not.toBeInTheDocument();
    });
  });

  // Test 7: Export filtered CSV
  it('FE-TC-3.2.1-07: triggers CSV export on Lead List', async () => {
    leadService.exportLeads.mockResolvedValue(new Blob(['lead_id,company_name\nLD-2026-86808,Acme Corp'], { type: 'text/csv' }));

    render(
      <MemoryRouter initialEntries={['/admin/leads']}>
        <AuthProvider>
          <LeadList />
        </AuthProvider>
      </MemoryRouter>
    );

    const exportBtn = await screen.findByText(/Export CSV/i);
    expect(exportBtn).toBeInTheDocument();

    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(leadService.exportLeads).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'csv' }),
        true
      );
    });
  });

  // Test 8: Export report
  it('FE-TC-3.2.1-08: triggers spreadsheet conversion report export on Dashboard', async () => {
    leadService.exportReport.mockResolvedValue(new Blob(['Binary file stream'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const exportReportBtn = await screen.findByText(/Export Segment Report/i);
    expect(exportReportBtn).toBeInTheDocument();

    fireEvent.click(exportReportBtn);

    await waitFor(() => {
      expect(leadService.exportReport).toHaveBeenCalledWith(
        expect.objectContaining({ report: 'category-breakdown', format: 'excel' })
      );
    });
  });
});
