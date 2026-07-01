import Badge from '../common/Badge';
import SortableTableHeader from './SortableTableHeader';
import { toDisplayText } from '../../utils/leadDisplay';

const STATUS_VARIANTS = {
  New: 'new',
  Open: 'new',
  Contacted: 'contacted',
  Qualified: 'qualified',
  Converted: 'converted',
  Lost: 'lost',
};

const PRIORITY_VARIANTS = {
  High: 'lost',
  Hot: 'lost',
  Medium: 'qualified',
  Warm: 'qualified',
  Low: 'new',
  Cold: 'new',
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value || '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function LeadTable({ leads, isAdmin, sort, onSort, onOpenLead, selectedIds, onToggleSelect, onSelectAll }) {
  const allVisibleSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant/40 bg-white/30">
      <table className="min-w-[1400px] w-full table-fixed">
        <thead className="bg-white/55">
          <tr className="border-b border-outline-variant/40">
            {isAdmin && (
              <th className="w-[48px] px-2 py-3 text-center">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary"
                  aria-label="Select all leads"
                />
              </th>
            )}
            <th className="w-[100px] px-3 py-3 text-left text-label-sm font-label-sm text-on-surface-variant whitespace-nowrap">Lead ID</th>
            <th className="w-[180px] px-3 py-3 text-left text-label-sm font-label-sm text-on-surface-variant whitespace-nowrap">Company Name</th>
            <th className="w-[160px] px-3 py-3 text-left text-label-sm font-label-sm text-on-surface-variant whitespace-nowrap">Contact Person</th>
            <th className="w-[130px] px-3 py-3 text-left text-label-sm font-label-sm text-on-surface-variant whitespace-nowrap">Mobile Number</th>
            <SortableTableHeader label="Status" sortKey="status" currentSort={sort} onSort={onSort} className="w-[110px]" />
            <th className="w-[90px] px-3 py-3 text-left text-label-sm font-label-sm text-on-surface-variant whitespace-nowrap">Stage</th>
            <SortableTableHeader label="Source" sortKey="source" currentSort={sort} onSort={onSort} className="w-[120px]" />
            <SortableTableHeader label="Category" sortKey="category" currentSort={sort} onSort={onSort} className="w-[130px]" />
            <SortableTableHeader label="Priority" sortKey="priority" currentSort={sort} onSort={onSort} className="w-[110px]" />
            {isAdmin && <th className="w-[150px] px-3 py-3 text-left text-label-sm font-label-sm text-on-surface-variant whitespace-nowrap">Assigned To</th>}
            <SortableTableHeader label="Created Date" sortKey="createdAt" currentSort={sort} onSort={onSort} className="w-[130px]" />
            <SortableTableHeader label="Estimated Value" sortKey="estimatedValue" currentSort={sort} onSort={onSort} align="right" className="w-[140px]" />
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const isSelected = selectedIds.has(lead.id);
            return (<tr
              key={lead.id}
              data-testid="lead-row"
              onClick={() => onOpenLead(lead.id)}
              className={`cursor-pointer border-b border-outline-variant/20 transition-colors hover:bg-white/55 ${isSelected ? 'bg-primary/5' : ''}`}
            >
              {isAdmin && (
                <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(lead.id)}
                    className="h-4 w-4 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary"
                    aria-label={`Select lead ${lead.leadId}`}
                  />
                </td>
              )}
              <td className="truncate px-3 py-3 text-label-md font-label-md text-primary" title={toDisplayText(lead.leadId, '-')}>{toDisplayText(lead.leadId, '-')}</td>
              <td className="truncate px-3 py-3 text-body-sm text-on-surface" title={toDisplayText(lead.companyName)}>{toDisplayText(lead.companyName, '-')}</td>
              <td className="truncate px-3 py-3 text-body-sm text-on-surface" title={toDisplayText(lead.contactPerson)}>{toDisplayText(lead.contactPerson, '-')}</td>
              <td className="truncate px-3 py-3 text-body-sm text-on-surface-variant" title={toDisplayText(lead.mobileNumber)}>{toDisplayText(lead.mobileNumber, '-')}</td>
              <td className="px-3 py-3 text-center">
                <Badge variant={STATUS_VARIANTS[toDisplayText(lead.status)] || 'new'}>{toDisplayText(lead.status, '-')}</Badge>
              </td>
              <td className="truncate px-3 py-3 text-body-sm text-on-surface-variant" title={toDisplayText(lead.stage)}>{toDisplayText(lead.stage, '-')}</td>
              <td className="truncate px-3 py-3 text-body-sm text-on-surface-variant" title={toDisplayText(lead.source)}>{toDisplayText(lead.source, '-')}</td>
              <td className="truncate px-3 py-3 text-body-sm text-on-surface-variant" title={toDisplayText(lead.category)}>{toDisplayText(lead.category, '-')}</td>
              <td className="px-3 py-3 text-center">
                <Badge variant={PRIORITY_VARIANTS[toDisplayText(lead.priority)] || 'new'}>{toDisplayText(lead.priority, '-')}</Badge>
              </td>
              {isAdmin && (
                <td className="truncate px-3 py-3 text-body-sm text-on-surface-variant" title={toDisplayText(lead.assignedToName)}>
                  {toDisplayText(lead.assignedToName, '-')}
                </td>
              )}
              <td className="truncate px-3 py-3 text-body-sm text-on-surface-variant whitespace-nowrap" title={formatDate(lead.createdAt)}>{formatDate(lead.createdAt)}</td>
              <td className="truncate px-3 py-3 text-right text-body-sm font-semibold text-on-surface whitespace-nowrap" title={formatCurrency(lead.estimatedValue)}>{formatCurrency(lead.estimatedValue)}</td>
            </tr>);
          })}
        </tbody>
      </table>
    </div>
  );
}
