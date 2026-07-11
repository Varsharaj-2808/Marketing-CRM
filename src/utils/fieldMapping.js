const LEAD_FIELD_MAP = {
  companyName: 'company_name',
  contactPerson: 'contact_person',
  mobileNumber: 'mobile_number',
  businessCategory: 'category',
  businessSubCategory: 'sub_category',
  servicesInterested: 'service_interested',
  estimatedValue: 'estimated_value',
  assignedTo: 'assigned_to',
  leadSource: 'lead_source',
};

export function mapLeadFields(payload) {
  const result = {};
  for (const [key, value] of Object.entries(payload)) {
    const mapped = LEAD_FIELD_MAP[key] || key;
    result[mapped] = value;
  }
  return result;
}

const USER_FIELD_MAP = {
  employee_name: 'name',
};

export function mapUserFields(payload) {
  const result = {};
  for (const [key, value] of Object.entries(payload)) {
    const mapped = USER_FIELD_MAP[key] || key;
    result[mapped] = value;
  }
  return result;
}
