export const MOCK_CATEGORIES = [
  { id: 'cat-001', name: 'IT Services' },
  { id: 'cat-002', name: 'Digital Marketing' },
  { id: 'cat-003', name: 'Consulting' },
  { id: 'cat-004', name: 'Real Estate' },
  { id: 'cat-005', name: 'Healthcare' },
];

export const MOCK_SUB_CATEGORIES = {
  'cat-001': [
    { id: 'sub-001', name: 'Web Development' },
    { id: 'sub-002', name: 'Mobile App Development' },
    { id: 'sub-003', name: 'Cloud Solutions' },
    { id: 'sub-004', name: 'IT Support' },
  ],
  'cat-002': [
    { id: 'sub-005', name: 'SEO Services' },
    { id: 'sub-006', name: 'Social Media Management' },
    { id: 'sub-007', name: 'Email Marketing' },
    { id: 'sub-008', name: 'Content Marketing' },
  ],
  'cat-003': [
    { id: 'sub-009', name: 'Business Strategy' },
    { id: 'sub-010', name: 'Management Consulting' },
    { id: 'sub-011', name: 'Financial Advisory' },
  ],
  'cat-004': [
    { id: 'sub-012', name: 'Residential' },
    { id: 'sub-013', name: 'Commercial' },
    { id: 'sub-014', name: 'Industrial' },
  ],
  'cat-005': [
    { id: 'sub-015', name: 'Medical Equipment' },
    { id: 'sub-016', name: 'Pharmaceuticals' },
    { id: 'sub-017', name: 'Healthcare Consulting' },
  ],
};

export const MOCK_USERS = [
  { id: 'EMP-00001', employee_id: 'EMP-00001', name: 'Admin User', email: 'admin@company.com', role: 'Admin', status: 'Active', mobile: '9999999999' },
  { id: 'EMP-00002', employee_id: 'EMP-00002', name: 'John Executive', email: 'executive@company.com', role: 'Marketing Executive', status: 'Active', mobile: '9876543210' },
  { id: 'EMP-00003', employee_id: 'EMP-00003', name: 'Sarah Manager', email: 'sarah@company.com', role: 'Marketing Executive', status: 'Active', mobile: '9999999997' },
];

export const MOCK_SERVICES = [
  { id: 'svc-001', name: 'Web Development' },
  { id: 'svc-002', name: 'Mobile App Development' },
  { id: 'svc-003', name: 'Digital Marketing' },
  { id: 'svc-004', name: 'SEO Services' },
  { id: 'svc-005', name: 'Cloud Solutions' },
  { id: 'svc-006', name: 'Consulting' },
  { id: 'svc-007', name: 'UI/UX Design' },
  { id: 'svc-008', name: 'IT Support' },
];

export const MOCK_LEAD_SOURCES = [
  { id: 'src-001', name: 'Website' },
  { id: 'src-002', name: 'Referral' },
  { id: 'src-003', name: 'Social Media' },
  { id: 'src-004', name: 'Email Campaign' },
  { id: 'src-005', name: 'Phone Inquiry' },
  { id: 'src-006', name: 'Walk-in' },
  { id: 'src-007', name: 'Partner' },
  { id: 'src-008', name: 'Other' },
];

const YEAR = new Date().getFullYear();
let leadCounter = 1;

function generateLeadId() {
  return `LD-${YEAR}-${String(leadCounter).padStart(5, '0')}`;
}

export function createMockLead(data, createdByName) {
  const now = new Date().toISOString();
  const userName = createdByName || 'Admin User';
  const userId = data.assignedTo || 'EMP-00001';
  const newLead = {
    id: `lead-${String(leadCounter).padStart(5, '0')}`,
    leadId: generateLeadId(),
    ...data,
    status: 'New',
    createdAt: now,
    updatedAt: now,
    createdBy: { id: userId, name: userName },
    timeline: [
      {
        action: 'Lead Created',
        message: 'Lead Created',
        description: 'Lead Created',
        user: userName,
        createdBy: { id: userId, name: userName },
        createdAt: now,
        timestamp: now,
      },
    ],
  };
  leadCounter++;
  return newLead;
}

let mockLeadsStore = [];

export function resetMockLeads() {
  mockLeadsStore = [
    createMockLead({
      leadId: generateLeadId(),
      companyName: 'TechCorp Solutions',
      website: 'https://techcorp.com',
      businessCategory: 'cat-001',
      businessSubCategory: 'sub-001',
      contactPerson: 'Alice Johnson',
      mobileNumber: '9876543210',
      email: 'alice@techcorp.com',
      city: 'Mumbai',
      leadSource: 'Website',
      servicesInterested: ['Web Development', 'Cloud Solutions'],
      priority: 'Hot',
      estimatedValue: '500000',
      assignedTo: 'EMP-00001',
    }),
    createMockLead({
      leadId: generateLeadId(),
      companyName: 'GrowthMark Agency',
      website: 'https://growthmark.com',
      businessCategory: 'cat-002',
      businessSubCategory: 'sub-005',
      contactPerson: 'Bob Smith',
      mobileNumber: '8765432109',
      email: 'bob@growthmark.com',
      city: 'Delhi',
      leadSource: 'Referral',
      servicesInterested: ['SEO Services', 'Digital Marketing'],
      priority: 'Warm',
      estimatedValue: '250000',
      assignedTo: 'EMP-00002',
    }),
    createMockLead({
      leadId: generateLeadId(),
      companyName: 'MediCare Group',
      website: '',
      businessCategory: 'cat-005',
      businessSubCategory: 'sub-015',
      contactPerson: 'Dr. Raj Patel',
      mobileNumber: '7654321098',
      email: 'raj@medicare.com',
      city: 'Bangalore',
      leadSource: 'Phone Inquiry',
      servicesInterested: ['Consulting'],
      priority: 'Cold',
      estimatedValue: '1000000',
      assignedTo: 'EMP-00003',
    }),
  ];
}

resetMockLeads();

export { mockLeadsStore };

export const MOCK_TOTAL_LEADS = () => mockLeadsStore.length;
export const MOCK_TOTAL_PAGES = (limit) => Math.max(1, Math.ceil(mockLeadsStore.length / limit));
