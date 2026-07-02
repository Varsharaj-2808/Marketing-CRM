import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchCategories,
  fetchUsers,
  fetchSubCategories,
  checkDuplicateLead,
  createLead,
  fetchLeads,
  fetchLeadById,
} from '../../services/leadService';

function mockRes(data, status = 200) {
  return { ok: status < 400, status, json: () => Promise.resolve(data) };
}

const MOCK_CATEGORIES = [
  { id: 'cat-001', name: 'IT Services' },
  { id: 'cat-002', name: 'Digital Marketing' },
];

const MOCK_USERS = [
  { id: 'EMP-00001', name: 'Admin User', email: 'admin@company.com', role: 'Admin' },
];

const MOCK_SUB_CATEGORIES = [
  { id: 'sub-001', name: 'Web Development' },
  { id: 'sub-002', name: 'Mobile App Development' },
];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('crm_access_token', JSON.stringify('mock-token'));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('leadService', () => {
  describe('fetchCategories', () => {
    it('TEST-EP2-LEAD-UNIT-001: fetches categories successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockRes({ success: true, data: MOCK_CATEGORIES })
      );

      const result = await fetchCategories();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/categories'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('IT Services');
    });

    it('TEST-EP2-LEAD-UNIT-002: falls back to default categories on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchCategories();
      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].name).toBe('IT Services');
    });
  });

  describe('fetchUsers', () => {
    it('TEST-EP2-LEAD-UNIT-003: fetches users successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockRes({ success: true, data: MOCK_USERS })
      );

      const result = await fetchUsers();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/users'),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.data[0].email).toBe('admin@company.com');
    });
  });

  describe('fetchSubCategories', () => {
    it('TEST-EP2-LEAD-UNIT-004: fetches sub-categories by category id', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockRes({ success: true, data: MOCK_SUB_CATEGORIES })
      );

      const result = await fetchSubCategories('cat-001');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/categories/cat-001/sub-categories'),
        expect.any(Object)
      );
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Web Development');
    });
  });

  describe('checkDuplicateLead', () => {
    it('TEST-EP2-LEAD-UNIT-005: returns duplicate=true when mobile exists', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockRes({ duplicate: true, leadId: 'LD-0001' })
      );

      const result = await checkDuplicateLead('9876543210');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/marketing/leads/check-duplicate'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ mobileNumber: '9876543210' }),
        })
      );
      expect(result.duplicate).toBe(true);
      expect(result.leadId).toBe('LD-0001');
    });

    it('TEST-EP2-LEAD-UNIT-006: returns duplicate=false when mobile is new', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockRes({ duplicate: false })
      );

      const result = await checkDuplicateLead('9123456789');

      expect(result.duplicate).toBe(false);
    });
  });

  describe('createLead', () => {
    it('TEST-EP2-LEAD-UNIT-007: creates lead successfully', async () => {
      const newLead = {
        companyName: 'Test Corp',
        contactPerson: 'John Doe',
        mobileNumber: '9123456789',
        businessCategory: 'cat-001',
        businessSubCategory: 'sub-001',
        leadSource: 'Website',
        servicesInterested: ['Web Development'],
        priority: 'Hot',
        assignedTo: 'EMP-00001',
      };

      global.fetch = vi.fn().mockResolvedValue(
        mockRes({
          success: true,
          data: { id: 'lead-0001', leadId: 'LD-0001', ...newLead },
        })
      );

      const result = await createLead(newLead);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/marketing/leads'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newLead),
        })
      );
      expect(result.success).toBe(true);
      expect(result.data.leadId).toBe('LD-0001');
    });
  });

  describe('fetchLeads', () => {
    it('TEST-EP2-LEAD-UNIT-008: fetches leads with default params', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockRes({ success: true, data: [], total: 0 })
      );

      const result = await fetchLeads();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/marketing/leads'),
        expect.any(Object)
      );
      expect(result.data).toEqual([]);
    });

    it('TEST-EP2-LEAD-UNIT-009: fetches leads with search and stage params', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockRes({ success: true, data: [], total: 0 })
      );

      await fetchLeads({ search: 'Tech', stage: 'New', page: '1', limit: '10' });

      const calledUrl = fetch.mock.calls[0][0];
      expect(calledUrl).toContain('search=Tech');
      expect(calledUrl).toContain('stage=New');
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('limit=10');
    });
  });

  describe('fetchLeadById', () => {
    it('TEST-EP2-LEAD-UNIT-010: fetches single lead by id', async () => {
      const mockLead = { id: 'lead-0001', leadId: 'LD-0001', companyName: 'Test Corp' };

      global.fetch = vi.fn().mockResolvedValue(
        mockRes({ success: true, data: mockLead })
      );

      const result = await fetchLeadById('lead-0001');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/marketing/leads/lead-0001'),
        expect.any(Object)
      );
      expect(result.data.companyName).toBe('Test Corp');
    });
  });
});
