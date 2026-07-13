import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import AuditLogPage from '../../pages/admin/AuditLogPage';
import SystemSettingsPage from '../../pages/admin/SystemSettingsPage';
import AdminLayout from '../../components/layout/AdminLayout';
import MarketingLayout from '../../components/layout/MarketingLayout';

// Mock window.URL functions for CSV export tests
beforeEach(() => {
  window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
  window.URL.revokeObjectURL = vi.fn();
  
  sessionStorage.clear();
  localStorage.clear();
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mockResponse(data, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(data),
    blob: () => Promise.resolve(new Blob([data], { type: 'text/csv' }))
  });
}

const adminUser = {
  id: 'EMP-00001',
  name: 'Admin User',
  email: 'admin@company.com',
  role: 'Admin',
  status: 'active'
};

const marketingUser = {
  id: 'EMP-00002',
  name: 'Marketing Exec',
  email: 'marketing@company.com',
  role: 'Marketing Executive',
  status: 'active'
};

describe('STORY-5.2.1 Audit Log and Retention Settings UI Tests', () => {

  // ==========================================
  // 1. Audit Log Page Layout & Data Display
  // ==========================================

  describe('Audit Log Page Layout & Data Display', () => {
    
    it('test-ep-5.2.1-f-001: Verify that the Audit Log page renders with the correct column headers and displays data correctly.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/admin/audit-log')) {
          return mockResponse({
            success: true,
            data: [
              {
                id: 'e0b0e513-ef9f-4318-8097-f0bb26922f30',
                seq: 1,
                actor: {
                  id: 'actor-uuid-1',
                  name: 'Admin User',
                  role: 'Admin'
                },
                action_type: 'lead.assigned',
                entity_affected: 'lead',
                entity_id: 'lead-uuid-1',
                result: 'success',
                ip_address: '203.0.113.45',
                details: {},
                created_at: '2026-07-07T12:00:00Z'
              }
            ],
            pagination: { page: 1, total_pages: 1, total_records: 1 }
          });
        }
        return mockResponse({}, 404);
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <AuditLogPage />
          </AuthProvider>
        </MemoryRouter>
      );

      // Verify page title
      expect(await screen.findByRole('heading', { name: 'Audit Logs' })).toBeInTheDocument();

      // Verify Column headers
      const headers = screen.getAllByRole('columnheader');
      const headerTexts = headers.map(h => h.textContent.trim());
      const expectedHeaders = [
        'Timestamp', 'Actor', 'Role', 'Action Type', 
        'Entity Affected', 'Entity ID', 'Result', 'IP Address', 'Actions/Details'
      ];
      expectedHeaders.forEach(eh => {
        expect(headerTexts).toContain(eh);
      });

      // Verify values
      expect(screen.getAllByText('Admin User').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Lead Assigned').length).toBeGreaterThan(0);
      expect(screen.getAllByText('lead').length).toBeGreaterThan(0);
      expect(screen.getAllByText('lead-uuid-1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('203.0.113.45').length).toBeGreaterThan(0);

      // Result "success" should display success text/badge
      const successBadge = screen.getByText('success');
      expect(successBadge).toBeInTheDocument();
      expect(successBadge.className).toContain('text-emerald-600');
    });

    it('test-ep-5.2.1-f-002: Verify that the Audit Log table displays entries in newest-first order by default.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/admin/audit-log')) {
          expect(url).toContain('sort_order=desc');
          return mockResponse({
            success: true,
            data: [
              {
                id: 'log-1',
                seq: 2,
                actor: { id: 'actor-1', name: 'User 1', role: 'Admin' },
                action_type: 'lead.assigned',
                entity_affected: 'lead',
                entity_id: 'lead-uuid-1',
                result: 'success',
                ip_address: '1.1.1.1',
                details: {},
                created_at: '2026-07-08T12:00:00Z'
              },
              {
                id: 'log-2',
                seq: 1,
                actor: { id: 'actor-1', name: 'User 1', role: 'Admin' },
                action_type: 'lead.assigned',
                entity_affected: 'lead',
                entity_id: 'lead-uuid-1',
                result: 'success',
                ip_address: '1.1.1.1',
                details: {},
                created_at: '2026-07-07T12:00:00Z'
              }
            ],
            pagination: { page: 1, total_pages: 1, total_records: 2 }
          });
        }
        return mockResponse({}, 404);
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <AuditLogPage />
          </AuthProvider>
        </MemoryRouter>
      );

      // Verify sorting visually by verifying sequence cells order
      await screen.findByRole('heading', { name: 'Audit Logs' });
      const rows = screen.getAllByRole('row');
      // Index 0 is header, index 1 is newest log-1 (seq 2), index 2 is log-2 (seq 1)
      expect(rows[1].textContent).toContain('2');
      expect(rows[2].textContent).toContain('1');
    });

    it('test-ep-5.2.1-f-003: Verify that clicking on the "View details" action button for an audit log row opens a modal containing the full JSON payload or key-value details of the action.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/admin/audit-log')) {
          return mockResponse({
            success: true,
            data: [
              {
                id: 'log-role-change',
                seq: 1,
                actor: { id: 'actor-1', name: 'Admin User', role: 'Admin' },
                action_type: 'user.role_changed',
                entity_affected: 'user',
                entity_id: 'user-uuid-1',
                result: 'success',
                ip_address: '203.0.113.45',
                details: { old_role: 'Marketing', new_role: 'Admin' },
                created_at: '2026-07-07T12:00:00Z'
              }
            ],
            pagination: { page: 1, total_pages: 1, total_records: 1 }
          });
        }
        return mockResponse({}, 404);
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <AuditLogPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await screen.findByRole('heading', { name: 'Audit Logs' });
      const viewDetailsBtn = screen.getByRole('button', { name: /view details/i });
      expect(viewDetailsBtn).toBeInTheDocument();

      // Click "View details"
      fireEvent.click(viewDetailsBtn);

      // Modal dialog should pop up
      expect(await screen.findByRole('heading', { name: 'Audit Log Detail' })).toBeInTheDocument();
      expect(screen.getByText(/"old_role": "Marketing"/)).toBeInTheDocument();
      expect(screen.getByText(/"new_role": "Admin"/)).toBeInTheDocument();
      expect(screen.getAllByText(/Admin User/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/user.role_changed/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/203.0.113.45/).length).toBeGreaterThan(0);

      // Close modal
      const closeBtn = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeBtn);

      // Verify modal closed
      expect(screen.queryByRole('heading', { name: 'Audit Log Detail' })).not.toBeInTheDocument();
    });

    it('test-ep-5.2.1-f-004: Verify UI behavior when the backend returns no audit logs.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/admin/audit-log')) {
          return mockResponse({
            success: true,
            data: [],
            pagination: { page: 1, total_pages: 0, total_records: 0 }
          });
        }
        return mockResponse({}, 404);
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <AuditLogPage />
          </AuthProvider>
        </MemoryRouter>
      );

      // Verify empty state placeholder
      expect(await screen.findByText('No audit log entries found.')).toBeInTheDocument();
      
      // No pagination should be rendered
      expect(screen.queryByRole('button', { name: /next page/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /previous page/i })).not.toBeInTheDocument();
    });

    it('test-ep-5.2.1-f-005: Verify UI handles server error gracefully.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      global.fetch = vi.fn().mockImplementation(() => {
        return mockResponse({ message: 'Server Internal Error' }, 500);
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <AuditLogPage />
          </AuthProvider>
        </MemoryRouter>
      );

      // Warning banner fails load
      expect(await screen.findByText('Failed to load audit logs. Please try again later.')).toBeInTheDocument();
    });

  });

  // ==========================================
  // 2. Audit Log Filters & Sorting
  // ==========================================

  describe('Audit Log Filters & Sorting', () => {

    it('test-ep-5.2.1-f-006: Verify filtering logs by Actor name.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      let fetchUrl = '';
      global.fetch = vi.fn().mockImplementation((url) => {
        fetchUrl = url;
        return mockResponse({
          success: true,
          data: [],
          pagination: { page: 1, total_pages: 1, total_records: 0 }
        });
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <AuditLogPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await screen.findByRole('heading', { name: 'Audit Logs' });
      const actorInput = screen.getByLabelText('Actor');
      fireEvent.change(actorInput, { target: { value: 'John Doe' } });

      const applyFiltersBtn = screen.getByRole('button', { name: /apply filters/i });
      fireEvent.click(applyFiltersBtn);

      await waitFor(() => {
        expect(fetchUrl).toContain('actor=John+Doe');
      });
    });

    it('test-ep-5.2.1-f-007: Verify filtering logs by Action Type dropdown.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      let fetchUrl = '';
      global.fetch = vi.fn().mockImplementation((url) => {
        fetchUrl = url;
        return mockResponse({
          success: true,
          data: [],
          pagination: { page: 1, total_pages: 1, total_records: 0 }
        });
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <AuditLogPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await screen.findByRole('heading', { name: 'Audit Logs' });
      const actionTypeSelect = screen.getByLabelText('Action Type');
      fireEvent.change(actionTypeSelect, { target: { value: 'user.role_changed' } });

      const applyFiltersBtn = screen.getByRole('button', { name: /apply filters/i });
      fireEvent.click(applyFiltersBtn);

      await waitFor(() => {
        expect(fetchUrl).toContain('action_type=user.role_changed');
      });
    });

    it('test-ep-5.2.1-f-008: Verify filtering logs by Date Range inputs.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      let fetchUrl = '';
      global.fetch = vi.fn().mockImplementation((url) => {
        fetchUrl = url;
        return mockResponse({
          success: true,
          data: [],
          pagination: { page: 1, total_pages: 1, total_records: 0 }
        });
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <AuditLogPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await screen.findByRole('heading', { name: 'Audit Logs' });
      const fromInput = screen.getByLabelText('From Date');
      const toInput = screen.getByLabelText('To Date');

      fireEvent.change(fromInput, { target: { value: '2026-01-01' } });
      fireEvent.change(toInput, { target: { value: '2026-07-07' } });

      const applyFiltersBtn = screen.getByRole('button', { name: /apply filters/i });
      fireEvent.click(applyFiltersBtn);

      await waitFor(() => {
        expect(fetchUrl).toContain('from=2026-01-01');
        expect(fetchUrl).toContain('to=2026-07-07');
      });
    });

    it('test-ep-5.2.1-f-009: Verify validation message displayed on invalid date input formats.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('from=invalid-date')) {
          return mockResponse({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' }, 400);
        }
        return mockResponse({ success: true, data: [] });
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <AuditLogPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await screen.findByRole('heading', { name: 'Audit Logs' });
      const fromInput = screen.getByLabelText('From Date');
      fireEvent.change(fromInput, { target: { value: 'invalid-date' } });

      const applyFiltersBtn = screen.getByRole('button', { name: /apply filters/i });
      fireEvent.click(applyFiltersBtn);

      // Warning alert displayed on 400
      expect(await screen.findByText('Invalid date format. Use YYYY-MM-DD')).toBeInTheDocument();
    });

    it('test-ep-5.2.1-f-010: Verify resetting all active filters.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      let fetchUrls = [];
      global.fetch = vi.fn().mockImplementation((url) => {
        fetchUrls.push(url);
        return mockResponse({
          success: true,
          data: [],
          pagination: { page: 1, total_pages: 1, total_records: 0 }
        });
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <AuditLogPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await screen.findByRole('heading', { name: 'Audit Logs' });
      const actorInput = screen.getByLabelText('Actor');
      const actionSelect = screen.getByLabelText('Action Type');

      fireEvent.change(actorInput, { target: { value: 'Jane' } });
      fireEvent.change(actionSelect, { target: { value: 'lead.assigned' } });
      fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

      // Wait for applied query
      await waitFor(() => {
        expect(fetchUrls[fetchUrls.length - 1]).toContain('actor=Jane');
      });

      // Reset
      const resetBtn = screen.getByRole('button', { name: /reset filters/i });
      fireEvent.click(resetBtn);

      // Check filters cleared and queried without filters
      expect(actorInput.value).toBe('');
      expect(actionSelect.value).toBe('');

      await waitFor(() => {
        const lastUrl = fetchUrls[fetchUrls.length - 1];
        expect(lastUrl).not.toContain('actor=Jane');
        expect(lastUrl).not.toContain('action_type=lead.assigned');
      });
    });

  });

  // ==========================================
  // 3. Pagination Controls
  // ==========================================

  describe('Pagination Controls', () => {

    it('test-ep-5.2.1-f-011: Verify pagination navigation handles page transitions and updates the data.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      let fetchUrls = [];
      global.fetch = vi.fn().mockImplementation((url) => {
        fetchUrls.push(url);
        return mockResponse({
          success: true,
          data: [{ id: 'x', seq: 10, actor: 'y', created_at: '2026-07-08T12:00:00Z' }],
          pagination: { page: fetchUrls.length === 1 ? 1 : 2, total_pages: 5, total_records: 50 }
        });
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <AuditLogPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await screen.findByRole('heading', { name: 'Audit Logs' });
      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();

      const nextBtn = screen.getByRole('button', { name: /next page/i });
      fireEvent.click(nextBtn);

      await waitFor(() => {
        expect(fetchUrls[fetchUrls.length - 1]).toContain('page=2');
      });

      expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
    });

    it('test-ep-5.2.1-f-012: Verify page transition buttons are disabled at boundary conditions.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      global.fetch = vi.fn().mockImplementation(() => {
        return mockResponse({
          success: true,
          data: [{ id: 'x', seq: 10, actor: 'y', created_at: '2026-07-08T12:00:00Z' }],
          pagination: { page: 1, total_pages: 1, total_records: 10 }
        });
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <AuditLogPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await screen.findByRole('heading', { name: 'Audit Logs' });

      // Both buttons are disabled because total_pages is 1
      const prevBtn = screen.getByRole('button', { name: /previous page/i });
      const nextBtn = screen.getByRole('button', { name: /next page/i });

      expect(prevBtn).toBeDisabled();
      expect(nextBtn).toBeDisabled();
    });

  });

  // ==========================================
  // 4. Access Control & Direct URL Access (RBAC)
  // ==========================================

  describe('Access Control & Direct URL Access (RBAC)', () => {

    it('test-ep-5.2.1-f-013: Verify that a Marketing Executive user does not see the "Audit Log" navigation menu item.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(marketingUser));

      render(
        <MemoryRouter>
          <AuthProvider>
            <MarketingLayout />
          </AuthProvider>
        </MemoryRouter>
      );

      // Verify that navigation links do not contain "Audit Log" or "System Settings"
      expect(screen.queryByText('Audit Log')).not.toBeInTheDocument();
      expect(screen.queryByText('System Settings')).not.toBeInTheDocument();
    });

    it('test-ep-5.2.1-f-014: Verify that a Marketing Executive attempting to access the direct URL of the Audit Log is blocked.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(marketingUser));

      render(
        <MemoryRouter initialEntries={['/admin/audit-log']}>
          <AuthProvider>
            <Routes>
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="audit-log" element={<AuditLogPage />} />
              </Route>
              <Route path="/marketing/dashboard" element={<div>Marketing Dashboard Redirected</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      // User should be redirected to dashboard and not load/render audit log contents
      expect(await screen.findByText('Marketing Dashboard Redirected')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Audit Logs' })).not.toBeInTheDocument();
    });

  });

  // ==========================================
  // 5. CSV Export Functionality
  // ==========================================

  describe('CSV Export Functionality', () => {

    it('test-ep-5.2.1-f-015: Verify clicking "Export CSV" initiates a file download.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      let exportUrl = '';
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/admin/audit-log/export')) {
          exportUrl = url;
          return mockResponse('seq,timestamp\n1,2026-07-07T12:00:00Z', 200);
        }
        return mockResponse({ success: true, data: [] });
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <AuditLogPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await screen.findByRole('heading', { name: 'Audit Logs' });
      
      // Filter actor
      const actorInput = screen.getByLabelText('Actor');
      fireEvent.change(actorInput, { target: { value: 'John' } });
      fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

      // Export CSV
      const exportBtn = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(exportUrl).toContain('/admin/audit-log/export');
        expect(exportUrl).toContain('actor=John');
        expect(exportUrl).toContain('format=csv');
      });

      // Browser download begins: mock createObjectURL checked
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    it('test-ep-5.2.1-f-016: Verify UI toast notification when exporting filters returning no records.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/admin/audit-log/export')) {
          return mockResponse({ success: false, message: 'No audit log entries found for the given filters' }, 404);
        }
        return mockResponse({ success: true, data: [] });
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <AuditLogPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await screen.findByRole('heading', { name: 'Audit Logs' });

      // Filter non-existent
      const actorInput = screen.getByLabelText('Actor');
      fireEvent.change(actorInput, { target: { value: 'nonexistent' } });
      fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

      // Export CSV
      const exportBtn = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportBtn);

      // Warning toast shown
      expect(await screen.findByText('No audit log entries found for the given filters')).toBeInTheDocument();
      
      // No URL download initiated
      expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    });

  });

  // ==========================================
  // 6. Audit Log Retention Policy UI
  // ==========================================

  describe('Audit Log Retention Policy UI', () => {

    it('test-ep-5.2.1-f-017: Verify retention settings load and display current config values.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/admin/system-settings/audit-retention')) {
          return mockResponse({
            success: true,
            data: {
              key: 'audit_log_retention_months',
              value: '12',
              description: 'Months an audit record stays in active storage before archival'
            }
          });
        }
        return mockResponse({}, 404);
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <SystemSettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      // Displays the input with value "12"
      const retentionInput = await screen.findByLabelText('Audit Log Retention (Months)');
      expect(retentionInput).toBeInTheDocument();
      expect(retentionInput.value).toBe('12');

      // Displays description
      expect(screen.getByText('Months an audit record stays in active storage before archival')).toBeInTheDocument();
    });

    it('test-ep-5.2.1-f-018: Verify Admin can update retention config successfully.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      let putUrl = '';
      let putPayload = null;

      global.fetch = vi.fn().mockImplementation((url, init) => {
        if (url.includes('/admin/system-settings/audit-retention')) {
          if (init?.method === 'PUT') {
            putUrl = url;
            putPayload = JSON.parse(init.body);
            return mockResponse({
              success: true,
              message: 'Retention policy updated',
              data: { key: 'audit_log_retention_months', value: '18', updated_at: '2026-07-08T12:00:00Z' }
            });
          }
          return mockResponse({
            success: true,
            data: { key: 'audit_log_retention_months', value: '12', description: 'desc' }
          });
        }
        return mockResponse({}, 404);
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <SystemSettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const retentionInput = await screen.findByLabelText('Audit Log Retention (Months)');
      fireEvent.change(retentionInput, { target: { value: '18' } });

      const saveBtn = screen.getByRole('button', { name: /save configuration/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(putUrl).toContain('/admin/system-settings/audit-retention');
        expect(putPayload).toEqual({ value: '18' });
      });

      // Verify success toast
      expect(await screen.findByText('Retention policy updated successfully')).toBeInTheDocument();
      expect(retentionInput.value).toBe('18');
    });

    it('test-ep-5.2.1-f-019: Verify UI validation handling of non-numeric retention values.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      let apiCalled = false;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/admin/system-settings/audit-retention')) {
          apiCalled = true;
          return mockResponse({
            success: true,
            data: { key: 'audit_log_retention_months', value: '12', description: 'desc' }
          });
        }
        return mockResponse({}, 404);
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <SystemSettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const retentionInput = await screen.findByLabelText('Audit Log Retention (Months)');
      fireEvent.change(retentionInput, { target: { value: 'abc' } });

      apiCalled = false; // Reset before click
      const saveBtn = screen.getByRole('button', { name: /save configuration/i });
      fireEvent.click(saveBtn);

      // Verify validation message shown and no PUT API call made
      expect(await screen.findByText('Retention period must be a positive integer (months)')).toBeInTheDocument();
      expect(apiCalled).toBe(false);
    });

    it('test-ep-5.2.1-f-020: Verify UI validation handling of negative/zero retention values.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      let apiCalled = false;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/admin/system-settings/audit-retention')) {
          apiCalled = true;
          return mockResponse({
            success: true,
            data: { key: 'audit_log_retention_months', value: '12', description: 'desc' }
          });
        }
        return mockResponse({}, 404);
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <SystemSettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const retentionInput = await screen.findByLabelText('Audit Log Retention (Months)');
      
      // Test negative
      fireEvent.change(retentionInput, { target: { value: '-5' } });
      apiCalled = false;
      fireEvent.click(screen.getByRole('button', { name: /save configuration/i }));
      expect(await screen.findByText('Retention period must be a positive integer (months)')).toBeInTheDocument();
      expect(apiCalled).toBe(false);

      // Test zero
      fireEvent.change(retentionInput, { target: { value: '0' } });
      apiCalled = false;
      fireEvent.click(screen.getByRole('button', { name: /save configuration/i }));
      expect(await screen.findByText('Retention period must be a positive integer (months)')).toBeInTheDocument();
      expect(apiCalled).toBe(false);
    });

    it('test-ep-5.2.1-f-021: Verify that a Marketing Executive user cannot see or modify the retention configuration settings.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(marketingUser));

      render(
        <MemoryRouter initialEntries={['/admin/system-settings/audit-retention']}>
          <AuthProvider>
            <Routes>
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="system-settings/audit-retention" element={<SystemSettingsPage />} />
              </Route>
              <Route path="/marketing/dashboard" element={<div>Marketing Dashboard Redirected</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      // User redirected and settings page is inaccessible
      expect(await screen.findByText('Marketing Dashboard Redirected')).toBeInTheDocument();
      expect(screen.queryByLabelText('Audit Log Retention (Months)')).not.toBeInTheDocument();
    });

    it('test-ep-5.2.1-f-022: Verify retention settings loading screen and error states.', async () => {
      localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
      localStorage.setItem('crm_user', JSON.stringify(adminUser));

      global.fetch = vi.fn().mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <SystemSettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      // Verify inline warning banner
      expect(await screen.findByText('Failed to load retention settings')).toBeInTheDocument();

      // Verify Save button is disabled
      const saveBtn = screen.getByRole('button', { name: /save configuration/i });
      expect(saveBtn).toBeDisabled();
    });

  });

});
