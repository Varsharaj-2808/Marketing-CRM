const READABLE_KEYS = [
  'name',
  'title',
  'label',
  'value',
  'displayName',
  'fullName',
  'employee_name',
  'employeeName',
  'companyName',
  'company_name',
  'status',
  'stage',
  'source',
  'category',
  'priority',
  'id',
  '_id',
  'employee_id',
  'employeeId',
];

export function toDisplayText(value, fallback = '-') {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const text = value.map((item) => toDisplayText(item, '')).filter(Boolean).join(', ');
    return text || fallback;
  }
  if (typeof value === 'object') {
    for (const key of READABLE_KEYS) {
      const current = value?.[key];
      if (current !== undefined && current !== null && current !== '') {
        return toDisplayText(current, fallback);
      }
    }
  }
  return fallback;
}

export function getLeadField(lead, keys, fallback = '-') {
  for (const key of keys) {
    const value = lead?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return toDisplayText(value, fallback);
    }
  }
  return fallback;
}

export function getLeadAssignedId(assignedTo) {
  if (!assignedTo) return '';
  if (typeof assignedTo === 'string') return assignedTo;
  return assignedTo?.id || assignedTo?._id || assignedTo?.employee_id || assignedTo?.employeeId || '';
}
