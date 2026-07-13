import Badge from '../common/Badge';
import SortableTableHeader from './SortableTableHeader';
import { toDisplayText } from '../../utils/leadDisplay';

const STATUS_VARIANTS = {
  Won: 'converted',
  Lost: 'lost',
  Active: 'qualified',
  Closed: 'lost',
  'New Lead': 'new'
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

function formatFollowupDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  
  const today = new Date();
  const isToday = d.getDate() === today.getDate() &&
                  d.getMonth() === today.getMonth() &&
                  d.getFullYear() === today.getFullYear();
                  
  if (isToday) {
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `Today, ${hours}:${minutes} ${ampm}`;
  }
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

function getDaysOverdue(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = nowDate - dDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export default function LeadTable({ leads, isAdmin, sort, onSort, onOpenLead, selectedIds, onToggleSelect, onSelectAll }) {
  const allVisibleSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));
  return (
    <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <table className="min-w-[700px] w-full border-collapse">
        <thead>
          <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
            {isAdmin && (
              <th className="w-[48px] px-4 py-3.5 text-center">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-primary focus:ring-primary"
                  aria-label="Select all leads"
                />
              </th>
            )}
            <th className="w-[100px] px-4 py-3.5 text-left whitespace-nowrap">Lead ID</th>
            <th className="w-[180px] px-4 py-3.5 text-left whitespace-nowrap">Company Name</th>
            <th className="hidden md:table-cell w-[160px] px-4 py-3.5 text-left whitespace-nowrap">Contact Person</th>
            <th className="hidden md:table-cell w-[130px] px-4 py-3.5 text-left whitespace-nowrap">Mobile Number</th>
            <SortableTableHeader label="Status" sortKey="status" currentSort={sort} onSort={onSort} className="w-[110px]" />
            <th className="hidden lg:table-cell w-[90px] px-4 py-3.5 text-left whitespace-nowrap">Stage</th>
            <SortableTableHeader label="Source" sortKey="source" currentSort={sort} onSort={onSort} className="hidden lg:table-cell w-[120px]" />
            <SortableTableHeader label="Category" sortKey="category" currentSort={sort} onSort={onSort} className="hidden lg:table-cell w-[130px]" />
            <SortableTableHeader label="Priority" sortKey="priority" currentSort={sort} onSort={onSort} className="w-[110px]" />
            {isAdmin && <th className="hidden md:table-cell w-[150px] px-4 py-3.5 text-left whitespace-nowrap">Assigned To</th>}
            <SortableTableHeader label="Created Date" sortKey="createdAt" currentSort={sort} onSort={onSort} className="w-[130px]" />
            <th className="hidden lg:table-cell w-[165px] px-4 py-3.5 text-left whitespace-nowrap">Next Follow-up</th>
            <SortableTableHeader label="Estimated Value" sortKey="estimatedValue" currentSort={sort} onSort={onSort} align="right" className="hidden lg:table-cell w-[140px]" />
          </tr>
        </thead>
        <tbody className="text-sm text-slate-700">
          {leads.map((lead) => {
            const isSelected = selectedIds.has(lead.id);
            const isClosed = lead.status === 'Won' || lead.status === 'Lost' || lead.stage === 'Won' || lead.stage === 'Lost';
            const isOverdue = !isClosed && lead.isOverdue;
            
            return (<tr
              key={lead.id}
              data-testid="lead-row"
              onClick={() => onOpenLead(lead.id)}
              className={`cursor-pointer border-b border-slate-150 hover:bg-slate-50/50 transition-colors duration-150 ${
                isSelected ? 'bg-primary/5' : ''
              } ${isClosed ? 'opacity-60 text-slate-400' : ''}`}
            >
              {isAdmin && (
                <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(lead.id)}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-primary focus:ring-primary"
                    aria-label={`Select lead ${lead.leadId}`}
                  />
                </td>
              )}
              <td className="truncate px-4 py-4 text-sm font-semibold text-primary" title={toDisplayText(lead.leadId, '-')}>{toDisplayText(lead.leadId, '-')}</td>
              <td className="truncate px-4 py-4 font-semibold text-slate-900" title={toDisplayText(lead.companyName)}>{toDisplayText(lead.companyName, '-')}</td>
              <td className="hidden md:table-cell truncate px-4 py-4 text-slate-700" title={toDisplayText(lead.contactPerson)}>{toDisplayText(lead.contactPerson, '-')}</td>
              <td className="hidden md:table-cell truncate px-4 py-4 text-slate-500" title={toDisplayText(lead.mobileNumber)}>{toDisplayText(lead.mobileNumber, '-')}</td>
              <td className="px-4 py-4 text-center">
                <Badge variant={STATUS_VARIANTS[toDisplayText(lead.status)] || 'new'}>{toDisplayText(lead.status, '-')}</Badge>
              </td>
              <td className="hidden lg:table-cell truncate px-4 py-4 text-slate-600" title={toDisplayText(lead.stage)}>{toDisplayText(lead.stage, '-')}</td>
              <td className="hidden lg:table-cell truncate px-4 py-4 text-slate-600" title={toDisplayText(lead.source)}>{toDisplayText(lead.source, '-')}</td>
              <td className="hidden lg:table-cell truncate px-4 py-4 text-slate-600" title={toDisplayText(lead.category)}>{toDisplayText(lead.category, '-')}</td>
              <td className="px-4 py-4 text-center">
                <Badge variant={PRIORITY_VARIANTS[toDisplayText(lead.priority)] || 'new'}>{toDisplayText(lead.priority, '-')}</Badge>
              </td>
              {isAdmin && (
                <td className="hidden md:table-cell truncate px-4 py-4 text-slate-600 font-medium" title={toDisplayText(lead.assignedToName)}>
                  {toDisplayText(lead.assignedToName, '-')}
                </td>
              )}
              <td className="truncate px-4 py-4 text-slate-500 whitespace-nowrap" title={formatDate(lead.createdAt)}>{formatDate(lead.createdAt)}</td>
              <td className="hidden lg:table-cell px-4 py-4 text-left whitespace-nowrap">
                {isOverdue ? (
                  <div className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                      <span className="sr-only">Warning: Lead is overdue</span>
                      Overdue {getDaysOverdue(lead.nextFollowupDate) > 0 ? `(${getDaysOverdue(lead.nextFollowupDate)}d)` : ''}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">{formatFollowupDate(lead.nextFollowupDate)}</span>
                  </div>
                ) : (
                  <span className={isClosed ? "text-slate-400" : "text-slate-650"}>
                    {formatFollowupDate(lead.nextFollowupDate)}
                  </span>
                )}
              </td>
              <td className="hidden lg:table-cell truncate px-4 py-4 text-right font-semibold text-slate-900 whitespace-nowrap" title={formatCurrency(lead.estimatedValue)}>{formatCurrency(lead.estimatedValue)}</td>
            </tr>);
          })}
        </tbody>
      </table>
    </div>
  );
}
