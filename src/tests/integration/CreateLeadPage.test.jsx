import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import CreateLead from '../../pages/leads/CreateLead';

function mockRes(data, status = 200) {
  const body = JSON.stringify(data);
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
  localStorage.setItem('crm_user', JSON.stringify({
    id: 'EMP-00001',
    name: 'Admin User',
    email: 'admin@company.com',
    role: 'Admin',
    status: 'active',
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderCreateLead() {
  return render(
    <MemoryRouter initialEntries={['/app/leads/create']}>
      <AuthProvider>
        <CreateLead />
      </AuthProvider>
    </MemoryRouter>
  );
}

const MOCK_CATEGORIES = [
  { id: 'cat-001', name: 'IT Services' },
  { id: 'cat-002', name: 'Digital Marketing' },
  { id: 'cat-003', name: 'Consulting' },
];

const MOCK_USERS = [
  { id: 'EMP-00001', name: 'Admin User', email: 'admin@company.com', role: 'Admin' },
  { id: 'EMP-00002', name: 'John Executive', email: 'executive@company.com', role: 'Marketing Executive' },
];

const MOCK_SUB_CATEGORIES = {
  'cat-001': [
    { id: 'sub-001', name: 'Web Development' },
    { id: 'sub-002', name: 'Mobile App Development' },
  ],
  'cat-002': [
    { id: 'sub-005', name: 'SEO Services' },
    { id: 'sub-006', name: 'Social Media Management' },
  ],
};

function setupMockFetch(options = {}) {
  const {
    duplicateMobile = null,
    createFails = false,
  } = options;

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
      if (duplicateMobile) {
        return mockRes({ duplicate: true, leadId: 'LD-0001' });
      }
      return mockRes({ duplicate: false });
    }

    if (url.includes('/marketing/leads') && init?.method === 'POST') {
      if (createFails) {
        return mockRes({ success: false, message: 'Failed to create lead. Please try again.' }, 500);
      }
      return mockRes({ success: true, data: { id: 'lead-0001', leadId: 'LD-0001' } });
    }

    return mockRes({ success: false, message: 'Not found' }, 404);
  });
}

async function waitForFormLoad() {
  await waitFor(() => {
    expect(screen.queryByText('Loading form data...')).not.toBeInTheDocument();
  }, { timeout: 5000 });
}

async function fillMandatoryFields(overrides = {}) {
  const companyName = overrides.companyName ?? 'TechCorp Solutions';
  const contactPerson = overrides.contactPerson ?? 'Alice Johnson';
  const mobileNumber = overrides.mobileNumber ?? '9876543210';
  const businessCategory = overrides.businessCategory ?? 'cat-001';
  const businessSubCategory = overrides.businessSubCategory ?? 'sub-001';
  const leadSource = overrides.leadSource ?? 'Website';
  const priority = overrides.priority ?? 'Hot';

  fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: companyName, name: 'companyName' } });
  fireEvent.change(screen.getByLabelText(/contact person/i), { target: { value: contactPerson, name: 'contactPerson' } });
  fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: mobileNumber, name: 'mobileNumber' } });

  fireEvent.change(screen.getByLabelText(/business category/i), { target: { value: businessCategory, name: 'businessCategory' } });

  await waitFor(() => {
    expect(screen.queryByText('Loading sub categories...')).not.toBeInTheDocument();
  });

  if (businessSubCategory) {
    fireEvent.change(screen.getByLabelText(/business sub category/i), { target: { value: businessSubCategory, name: 'businessSubCategory' } });
  }

  fireEvent.change(screen.getByLabelText(/lead source/i), { target: { value: leadSource, name: 'leadSource' } });
  fireEvent.change(screen.getByLabelText(/priority/i), { target: { value: priority, name: 'priority' } });

  fireEvent.click(screen.getByText('Select services'));
  const webDevBtn = await screen.findByRole('button', { name: /Web Development/i });
  fireEvent.click(webDevBtn);
}

describe('CreateLeadPage — TASK-2.1.1 (Rendering)', () => {
  beforeEach(() => {
    setupMockFetch();
  });

  it('TEST-EP2-LEAD-001: renders page heading and back button', async () => {
    renderCreateLead();
    expect(screen.getByText('Create Lead')).toBeInTheDocument();
    expect(screen.getByText('Back to Leads')).toBeInTheDocument();
  });

  it('TEST-EP2-LEAD-002: loads and displays Company Information section', async () => {
    renderCreateLead();
    await waitForFormLoad();
    expect(screen.getByText('Company Information')).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business sub category/i)).toBeInTheDocument();
  });

  it('TEST-EP2-LEAD-003: loads and displays Contact Information section', async () => {
    renderCreateLead();
    await waitForFormLoad();
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByLabelText(/contact person/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mobile number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('TEST-EP2-LEAD-004: loads and displays Lead Information section', async () => {
    renderCreateLead();
    await waitForFormLoad();
    expect(screen.getByText('Lead Information')).toBeInTheDocument();
    expect(screen.getByLabelText(/lead source/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByText('Assigned To')).toBeInTheDocument();
  });

  it('TEST-EP2-LEAD-005: shows loading spinner while fetching categories and users', () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    renderCreateLead();
    expect(screen.getByText('Loading form data...')).toBeInTheDocument();
  });

  it('TEST-EP2-LEAD-006: renders Save Lead button after load', async () => {
    renderCreateLead();
    await waitForFormLoad();
    expect(screen.getByRole('button', { name: /save lead/i })).toBeInTheDocument();
  });
});

describe('CreateLeadPage — TASK-2.1.1 (Validation)', () => {
  beforeEach(() => {
    setupMockFetch();
  });

  it('TEST-EP2-LEAD-007: shows all required field errors on empty submit', async () => {
    renderCreateLead();
    await waitForFormLoad();

    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Company Name is required')).toBeInTheDocument();
      expect(screen.getByText('Contact Person is required')).toBeInTheDocument();
      expect(screen.getByText('Mobile Number is required')).toBeInTheDocument();
      expect(screen.getByText('Business Category is required')).toBeInTheDocument();
      expect(screen.getByText('Business Sub Category is required')).toBeInTheDocument();
      expect(screen.getByText('Lead Source is required')).toBeInTheDocument();
      expect(screen.getByText('At least one service must be selected')).toBeInTheDocument();
      expect(screen.getByText('Priority is required')).toBeInTheDocument();
    });
  });

  it('TEST-EP2-LEAD-008: shows "Mobile Number must be exactly 10 digits" for non-numeric mobile', async () => {
    renderCreateLead();
    await waitForFormLoad();

    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: 'abc', name: 'mobileNumber' } });
    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Mobile Number must be exactly 10 digits')).toBeInTheDocument();
    });
  });

  it('TEST-EP2-LEAD-009: shows "Mobile Number must be exactly 10 digits" for short mobile', async () => {
    renderCreateLead();
    await waitForFormLoad();

    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '12345', name: 'mobileNumber' } });
    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Mobile Number must be exactly 10 digits')).toBeInTheDocument();
    });
  });

  it('TEST-EP2-LEAD-010: shows "Invalid email format" for malformed email', async () => {
    renderCreateLead();
    await waitForFormLoad();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email', name: 'email' } });
    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
  });

  it('TEST-EP2-LEAD-011: valid email does not trigger error', async () => {
    renderCreateLead();
    await waitForFormLoad();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com', name: 'email' } });
    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'Test Co', name: 'companyName' } });
    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.queryByText('Invalid email format')).not.toBeInTheDocument();
    });
  });

  it('TEST-EP2-LEAD-012: record is not persisted when validation fails', async () => {
    renderCreateLead();
    await waitForFormLoad();

    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Company Name is required')).toBeInTheDocument();
    });

    const postCalls = fetch.mock.calls.filter(
      ([url, init]) => url.includes('/marketing/leads') && init?.method === 'POST'
    );
    expect(postCalls.length).toBe(0);
  });
});

describe('CreateLeadPage — TASK-2.1.1 (Category / Sub-Category)', () => {
  beforeEach(() => {
    setupMockFetch();
  });

  it('TEST-EP2-LEAD-013: sub-category dropdown is disabled before category selected', async () => {
    renderCreateLead();
    await waitForFormLoad();

    const subCatSelect = screen.getByLabelText(/business sub category/i);
    expect(subCatSelect).toBeDisabled();
  });

  it('TEST-EP2-LEAD-014: selecting a category loads its sub-categories', async () => {
    renderCreateLead();
    await waitForFormLoad();

    fireEvent.change(screen.getByLabelText(/business category/i), { target: { value: 'cat-001', name: 'businessCategory' } });

    await waitFor(() => {
      expect(screen.queryByText('Loading sub categories...')).not.toBeInTheDocument();
    });

    const subCatSelect = screen.getByLabelText(/business sub category/i);
    expect(subCatSelect).not.toBeDisabled();
    const subCatOptions = Array.from(subCatSelect.options).map((o) => o.value);
    expect(subCatOptions).toContain('sub-001');
    expect(subCatOptions).toContain('sub-002');
    expect(subCatOptions).not.toContain('sub-005');
  });

  it('TEST-EP2-LEAD-015: changing category clears and reloads sub-categories', async () => {
    renderCreateLead();
    await waitForFormLoad();

    fireEvent.change(screen.getByLabelText(/business category/i), { target: { value: 'cat-001', name: 'businessCategory' } });
    await waitFor(() => {
      expect(screen.queryByText('Loading sub categories...')).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/business category/i), { target: { value: 'cat-002', name: 'businessCategory' } });
    await waitFor(() => {
      expect(screen.queryByText('Loading sub categories...')).not.toBeInTheDocument();
    });

    const subCatSelect = screen.getByLabelText(/business sub category/i);
    const subCatOptions = Array.from(subCatSelect.options).map((o) => o.value);
    expect(subCatOptions).toContain('sub-005');
    expect(subCatOptions).not.toContain('sub-001');
  });
});

describe('CreateLeadPage — TASK-2.1.1-09 (Duplicate Mobile Check)', () => {
  it('TEST-EP2-LEAD-016: duplicate mobile shows warning modal', async () => {
    setupMockFetch({ duplicateMobile: '9876543210' });
    renderCreateLead();
    await waitForFormLoad();
    await fillMandatoryFields({ mobileNumber: '9876543210' });

    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Duplicate Lead Found')).toBeInTheDocument();
      expect(screen.getByText(/A lead with this mobile number already exists/)).toBeInTheDocument();
      expect(screen.getByText(/LD-0001/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view existing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('TEST-EP2-LEAD-017: duplicate modal "Continue" creates lead anyway', async () => {
    setupMockFetch({ duplicateMobile: '9876543210' });
    renderCreateLead();
    await waitForFormLoad();
    await fillMandatoryFields({ mobileNumber: '9876543210' });

    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));
    await waitFor(() => {
      expect(screen.getByText('Duplicate Lead Found')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText('Lead created successfully.')).toBeInTheDocument();
    });
  });

  it('TEST-EP2-LEAD-018: duplicate modal "Cancel" closes modal', async () => {
    setupMockFetch({ duplicateMobile: '9876543210' });
    renderCreateLead();
    await waitForFormLoad();
    await fillMandatoryFields({ mobileNumber: '9876543210' });

    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));
    await waitFor(() => {
      expect(screen.getByText('Duplicate Lead Found')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Duplicate Lead Found')).not.toBeInTheDocument();
    });
  });

  it('TEST-EP2-LEAD-019: no duplicate modal when mobile is new', async () => {
    setupMockFetch();
    renderCreateLead();
    await waitForFormLoad();
    await fillMandatoryFields({ mobileNumber: '9123456789' });

    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Lead created successfully.')).toBeInTheDocument();
    });

    expect(screen.queryByText('Duplicate Lead Found')).not.toBeInTheDocument();
  });
});

describe('CreateLeadPage — TASK-2.1.1 (Successful Creation)', () => {
  beforeEach(() => {
    setupMockFetch();
  });

  it('TEST-EP2-LEAD-020: creates lead with all valid fields and shows success toast', async () => {
    renderCreateLead();
    await waitForFormLoad();
    await fillMandatoryFields();

    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Lead created successfully.')).toBeInTheDocument();
    });
  });

  it('TEST-EP2-LEAD-021: shows saving state while submitting', async () => {
    setupMockFetch();
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/marketing/leads') && init?.method === 'POST') {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockRes({ success: true, data: { id: 'lead-0001', leadId: 'LD-0001' } })), 500);
        });
      }
      return originalFetch(input, init);
    });

    renderCreateLead();
    await waitForFormLoad();
    await fillMandatoryFields();

    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  it('TEST-EP2-LEAD-022: assigned-to shows current logged-in user name', async () => {
    renderCreateLead();
    await waitForFormLoad();

    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  it('TEST-EP2-LEAD-023: uses offline fallback when API fails', async () => {
    setupMockFetch({ createFails: true });
    renderCreateLead();
    await waitForFormLoad();
    await fillMandatoryFields();

    fireEvent.click(screen.getByRole('button', { name: /save lead/i }));

    await waitFor(() => {
      expect(screen.getByText('Lead created successfully.')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
