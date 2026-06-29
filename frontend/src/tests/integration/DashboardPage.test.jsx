import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import DashboardPage from '../../pages/user/DashboardPage';

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
  localStorage.setItem('crm_user', JSON.stringify({
    id: 'EMP-00002', name: 'Sarah Johnson', email: 'executive@company.com', role: 'Marketing Executive', status: 'active',
  }));
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/app/dashboard']}>
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('DashboardPage — Marketing Executive Dashboard', () => {
  it('renders welcome panel with greeting', () => {
    renderDashboard();
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });

  it('renders stat cards for conversion and engaged leads', () => {
    renderDashboard();
    expect(screen.getByText(/total conversion/i)).toBeInTheDocument();
    expect(screen.getByText(/engaged leads/i)).toBeInTheDocument();
  });

  it('renders Live Marketing Status badge', () => {
    renderDashboard();
    expect(screen.getByText(/live marketing status/i)).toBeInTheDocument();
  });

  it('renders Priority Tasks section', () => {
    renderDashboard();
    expect(screen.getByText(/priority tasks/i)).toBeInTheDocument();
  });

  it('renders task items in the task list', () => {
    renderDashboard();
    const tasks = screen.getAllByText(/review|sync|approve/i);
    expect(tasks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Lead Distribution section', () => {
    renderDashboard();
    expect(screen.getByText(/lead distribution/i)).toBeInTheDocument();
  });

  it('renders Active Campaigns section', () => {
    renderDashboard();
    expect(screen.getByText(/active campaigns/i)).toBeInTheDocument();
  });

  it('renders View Campaigns and Generate Report buttons', () => {
    renderDashboard();
    expect(screen.getByText(/view campaigns/i)).toBeInTheDocument();
    expect(screen.getByText(/generate report/i)).toBeInTheDocument();
  });

  it('renders filter button for campaigns', () => {
    renderDashboard();
    expect(screen.getByText(/filter by platform/i)).toBeInTheDocument();
  });

  it('renders campaign cards with active status', () => {
    renderDashboard();
    expect(screen.getByText(/LinkedIn Outreach/i)).toBeInTheDocument();
    expect(screen.getByText(/Global Rebrand Awareness/i)).toBeInTheDocument();
  });

  it('renders New Campaign button', () => {
    renderDashboard();
    expect(screen.getByText(/new campaign/i)).toBeInTheDocument();
  });

  it('renders footer with copyright', () => {
    renderDashboard();
    expect(screen.getByText(/ApexCRM Enterprise/i)).toBeInTheDocument();
  });
});
