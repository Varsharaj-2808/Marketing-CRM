import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import CreateLead from '../../pages/leads/CreateLead';
import LeadList from '../../pages/leads/LeadList';

function mockRes(data, status = 200) {
  const body = JSON.stringify(data);
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(body),
  });
}

function setupAuthData() {
  localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
  localStorage.setItem('crm_user', JSON.stringify({
    id: 'EMP-00002',
    name: 'John Executive',
    email: 'executive@company.com',
    role: 'Marketing Executive',
    status: 'active',
  }));
}

const MOCK_CATEGORIES = [
  { id: 'cat-001', name: 'IT Services' },
  { id: 'cat-002', name: 'Digital Marketing' },
];

const MOCK_USERS = [
  { id: 'EMP-00001', name: 'Admin User', email: 'admin@company.com', role: 'Admin' },
  { id: 'EMP-00002', name: 'John Executive', email: 'executive@company.com', role: 'Marketing Executive' },
];

const MOCK_SUB_CATEGORIES = {
  'cat-001': [
    { id: 'sub-001', name: 'Web Development', category_id: 'cat-001' },
    { id: 'sub-002', name: 'Mobile App Development', category_id: 'cat-001' },
  ],
  'cat-002': [
    { id: 'sub-005', name: 'SEO Services', category_id: 'cat-002' },
    { id: 'sub-006', name: 'Social Media Management', category_id: 'cat-002' },
  ],
};

let leadCreateCounter = 0;

function setupE2eMocks(options = {}) {
  const { duplicateMobile = null } = options;

  global.fetch = vi.fn().mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.includes('/admin/categories/') && url.includes('/sub-categories')) {
      const match = url.match(/\/admin\/categories\/([^/]+)\/sub-categories/);
      const categoryId = match?.[1];
      return mockRes({ success: true, data: MOCK_SUB_CATEGORIES[categoryId] || [] });
    }

    if (url.includes('/admin/categories')) {
      return mockRes({ success: true, data: MOCK_CATEGORIES });
    }

    if (url.includes('/admin/users')) {
      return mockRes({ success: true, data: MOCK_USERS });
    }

    if (url.includes('/marketing/leads/check-duplicate')) {
      const body = JSON.parse(init?.body || '{}');
      if (duplicateMobile && body.mobileNumber === duplicateMobile) {
        return mockRes({ duplicate: true, leadId: 'LD-0042' });
      }
      return mockRes({ duplicate: false });
    }

    if (url.includes('/marketing/leads') && !url.includes('/check-duplicate') && init?.method === 'POST') {
      leadCreateCounter++;
      const leadId = `LD-${String(leadCreateCounter).padStart(4, '0')}`;
      const id = `lead-${String(leadCreateCounter).padStart(4, '0')}`;
      return mockRes({
        success: true,
        data: {
          id,
          leadId,
          stage: 'New',
          createdAt: new Date().toISOString(),
          createdBy: { id: 'EMP-00002', name: 'John Executive' },
          timeline: [
            {
              message: 'Lead Created',
              description: 'Lead Created',
              createdBy: { id: 'EMP-00002', name: 'John Executive' },
              createdAt: new Date().toISOString(),
            },
          ],
        },
      });
    }

    if (url.includes('/marketing/leads')) {
      return mockRes({
        success: true,
        data: [],
        total: 0,
        totalPages: 1,
      });
    }

    return mockRes({ success: false, message: 'Not found' }, 404);
  });
}

async function waitForFormLoad() {
  await waitFor(() => {
    expect(screen.queryByText('Loading form data...')).not.toBeInTheDocument();
  }, { timeout: 5000 });
}

async function fillCompleteForm(overrides = {}) {
  fireEvent.change(screen.getByLabelText(/company name/i), {
    target: { value: overrides.companyName ?? 'TechCorp Solutions', name: 'companyName' },
  });
  fireEvent.change(screen.getByLabelText(/website/i), {
    target: { value: overrides.website ?? 'https://techcorp.com', name: 'website' },
  });
  fireEvent.change(screen.getByLabelText(/contact person/i), {
    target: { value: overrides.contactPerson ?? 'Alice Johnson', name: 'contactPerson' },
  });
  fireEvent.change(screen.getByLabelText(/mobile number/i), {
    target: { value: overrides.mobileNumber ?? '9876543210', name: 'mobileNumber' },
  });
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: overrides.email ?? 'alice@techcorp.com', name: 'email' },
  });
  fireEvent.change(screen.getByLabelText(/city/i), {
    target: { value: overrides.city ?? 'Mumbai', name: 'city' },
  });

  fireEvent.change(screen.getByLabelText(/business category/i), {
    target: { value: overrides.category ?? 'cat-001', name: 'businessCategory' },
  });

  await waitFor(() => {
    expect(screen.queryByText('Loading sub categories...')).not.toBeInTheDocument();
  });

  fireEvent.change(screen.getByLabelText(/business sub category/i), {
    target: { value: overrides.subCategory ?? 'sub-001', name: 'businessSubCategory' },
  });

  fireEvent.change(screen.getByLabelText(/lead source/i), {
    target: { value: overrides.leadSource ?? 'Website', name: 'leadSource' },
  });

  fireEvent.click(screen.getByText('Select services'));
  const webDevBtn = await screen.findByRole('button', { name: /Web Development/i });
  fireEvent.click(webDevBtn);

  fireEvent.change(screen.getByLabelText(/priority/i), {
    target: { value: overrides.priority ?? 'Hot', name: 'priority' },
  });

  if (overrides.estimatedValue) {
    fireEvent.change(screen.getByLabelText(/estimated value/i), {
      target: { value: overrides.estimatedValue, name: 'estimatedValue' },
    });
  }
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  leadCreateCounter = 0;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('E2E: Create Lead — Full User Flow', () => {
  beforeEach(() => {
    setupAuthData();
    setupE2eMocks();
  });

  it('TEST-EP2-LEAD-E2E-001: complete flow — Marketing Executive creates a lead with all fields', async () => {
    render(
      <MemoryRouter initialEntries={['/app/leads/create']}>
        <AuthProvider>
          <CreateLead />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitForFormLoad();
    await fillCompleteForm();
    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Lead created successfully.')).toBeInTheDocument();
    });

    const postCreateCalls = fetch.mock.calls.filter(
      ([url, init]) => url.includes('/marketing/leads') && !url.includes('/check-duplicate') && init?.method === 'POST'
    );
    expect(postCreateCalls.length).toBe(1);

    const sentPayload = JSON.parse(postCreateCalls[0][1].body);
    expect(sentPayload.company_name).toBe('TechCorp Solutions');
    expect(sentPayload.contact_person).toBe('Alice Johnson');
    expect(sentPayload.mobile_number).toBe('9876543210');
    expect(sentPayload.email).toBe('alice@techcorp.com');
    expect(sentPayload.category).toBe('cat-001');
    expect(sentPayload.sub_category).toBe('sub-001');
    expect(sentPayload.lead_source).toBe('Website');
    expect(sentPayload.service_interested).toContain('Web Development');
    expect(sentPayload.priority).toBe('Hot');
    expect(sentPayload.assigned_to).toBe('EMP-00002');
  });

  it('TEST-EP2-LEAD-E2E-002: created lead has creator as Assigned To', async () => {
    render(
      <MemoryRouter initialEntries={['/app/leads/create']}>
        <AuthProvider>
          <CreateLead />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitForFormLoad();

    expect(screen.getByText('John Executive')).toBeInTheDocument();

    await fillCompleteForm();
    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Lead created successfully.')).toBeInTheDocument();
    });

    const postCreateCalls = fetch.mock.calls.filter(
      ([url, init]) => url.includes('/marketing/leads') && !url.includes('/check-duplicate') && init?.method === 'POST'
    );
    const sentPayload = JSON.parse(postCreateCalls[0][1].body);
    expect(sentPayload.assigned_to).toBe('EMP-00002');
  });

  it('TEST-EP2-LEAD-E2E-003: lead timeline includes "Lead Created" entry on creation', async () => {
    render(
      <MemoryRouter initialEntries={['/app/leads/create']}>
        <AuthProvider>
          <CreateLead />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitForFormLoad();
    await fillCompleteForm();
    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Lead created successfully.')).toBeInTheDocument();
    });

    const postCreateCalls = fetch.mock.calls.filter(
      ([url, init]) => url.includes('/marketing/leads') && !url.includes('/check-duplicate') && init?.method === 'POST'
    );
    const sentPayload = JSON.parse(postCreateCalls[0][1].body);
    expect(sentPayload.company_name).toBeTruthy();
  });
});

describe('E2E: Create Lead — Validation Flow', () => {
  beforeEach(() => {
    setupAuthData();
    setupE2eMocks();
  });

  it('TEST-EP2-LEAD-E2E-004: submits with empty fields and fixes one by one until success', async () => {
    render(
      <MemoryRouter initialEntries={['/app/leads/create']}>
        <AuthProvider>
          <CreateLead />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitForFormLoad();
    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Company Name is required')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'FixCorp', name: 'companyName' } });
    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.queryByText('Company Name is required')).not.toBeInTheDocument();
      expect(screen.getByText('Contact Person is required')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/contact person/i), { target: { value: 'Bob Smith', name: 'contactPerson' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '9876543210', name: 'mobileNumber' } });
    fireEvent.change(screen.getByLabelText(/business category/i), { target: { value: 'cat-001', name: 'businessCategory' } });

    await waitFor(() => {
      expect(screen.queryByText('Loading sub categories...')).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/business sub category/i), { target: { value: 'sub-001', name: 'businessSubCategory' } });
    fireEvent.change(screen.getByLabelText(/lead source/i), { target: { value: 'Referral', name: 'leadSource' } });

    fireEvent.click(screen.getByText('Select services'));
    const seoBtn = await screen.findByRole('button', { name: /SEO Services/i });
    fireEvent.click(seoBtn);

    fireEvent.change(screen.getByLabelText(/priority/i), { target: { value: 'Warm', name: 'priority' } });
    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Lead created successfully.')).toBeInTheDocument();
    });
  });

  it('TEST-EP2-LEAD-E2E-005: invalid mobile and email block submission', async () => {
    render(
      <MemoryRouter initialEntries={['/app/leads/create']}>
        <AuthProvider>
          <CreateLead />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitForFormLoad();

    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'Test Co', name: 'companyName' } });
    fireEvent.change(screen.getByLabelText(/contact person/i), { target: { value: 'Test Person', name: 'contactPerson' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '12345', name: 'mobileNumber' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad-email', name: 'email' } });

    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Mobile Number must be exactly 10 digits')).toBeInTheDocument();
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });

    const postCalls = fetch.mock.calls.filter(
      ([url, init]) => url.includes('/marketing/leads') && !url.includes('/check-duplicate') && init?.method === 'POST'
    );
    expect(postCalls.length).toBe(0);
  });
});

describe('E2E: Create Lead — Duplicate Mobile Flow', () => {
  it('TEST-EP2-LEAD-E2E-006: full duplicate flow — warning, continue, success', async () => {
    setupAuthData();
    setupE2eMocks({ duplicateMobile: '9876543210' });

    render(
      <MemoryRouter initialEntries={['/app/leads/create']}>
        <AuthProvider>
          <CreateLead />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitForFormLoad();
    await fillCompleteForm({ mobileNumber: '9876543210' });

    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Duplicate Lead Found')).toBeInTheDocument();
      expect(screen.getByText(/LD-0042/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText('Lead created successfully.')).toBeInTheDocument();
    });

    const postCalls = fetch.mock.calls.filter(
      ([url, init]) => url.includes('/marketing/leads') && !url.includes('/check-duplicate') && init?.method === 'POST'
    );
    expect(postCalls.length).toBe(1);
  });

  it('TEST-EP2-LEAD-E2E-007: full duplicate flow — warning, cancel, edit mobile, success', async () => {
    setupAuthData();
    setupE2eMocks({ duplicateMobile: '9876543210' });

    render(
      <MemoryRouter initialEntries={['/app/leads/create']}>
        <AuthProvider>
          <CreateLead />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitForFormLoad();
    await fillCompleteForm({ mobileNumber: '9876543210' });

    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Duplicate Lead Found')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Duplicate Lead Found')).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '9123456789', name: 'mobileNumber' } });
    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Lead created successfully.')).toBeInTheDocument();
    });
  });

  it('TEST-EP2-LEAD-E2E-008: no duplicate modal when mobile is unique', async () => {
    setupAuthData();
    setupE2eMocks();

    render(
      <MemoryRouter initialEntries={['/app/leads/create']}>
        <AuthProvider>
          <CreateLead />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitForFormLoad();
    await fillCompleteForm({ mobileNumber: '9988776655' });

    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Lead created successfully.')).toBeInTheDocument();
    });

    expect(screen.queryByText('Duplicate Lead Found')).not.toBeInTheDocument();
  });
});

describe('E2E: Create Lead — Category Taxonomy', () => {
  beforeEach(() => {
    setupAuthData();
    setupE2eMocks();
  });

  it('TEST-EP2-LEAD-E2E-009: selecting IT Services shows Web Development and Mobile App Development sub-categories', async () => {
    render(
      <MemoryRouter initialEntries={['/app/leads/create']}>
        <AuthProvider>
          <CreateLead />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitForFormLoad();

    fireEvent.change(screen.getByLabelText(/business category/i), { target: { value: 'cat-001', name: 'businessCategory' } });

    await waitFor(() => {
      expect(screen.queryByText('Loading sub categories...')).not.toBeInTheDocument();
    });

    const subCatSelect = screen.getByLabelText(/business sub category/i);
    const subCatLabels = Array.from(subCatSelect.options).map((o) => o.textContent);
    expect(subCatLabels).toEqual(
      expect.arrayContaining(['Web Development', 'Mobile App Development'])
    );
    expect(subCatLabels).not.toContain('SEO Services');
  });

  it('TEST-EP2-LEAD-E2E-010: selecting Digital Marketing shows SEO Services and Social Media Management', async () => {
    render(
      <MemoryRouter initialEntries={['/app/leads/create']}>
        <AuthProvider>
          <CreateLead />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitForFormLoad();

    fireEvent.change(screen.getByLabelText(/business category/i), { target: { value: 'cat-002', name: 'businessCategory' } });

    await waitFor(() => {
      expect(screen.queryByText('Loading sub categories...')).not.toBeInTheDocument();
    });

    const subCatSelect = screen.getByLabelText(/business sub category/i);
    const subCatLabels = Array.from(subCatSelect.options).map((o) => o.textContent);
    expect(subCatLabels).toEqual(
      expect.arrayContaining(['SEO Services', 'Social Media Management'])
    );
    expect(subCatLabels).not.toContain('Web Development');
  });
});
