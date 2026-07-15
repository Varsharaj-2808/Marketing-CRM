export default function SortableTableHeader({ label, sortKey, currentSort, onSort, align = 'left', className = '' }) {
  const active = currentSort.sortBy === sortKey;
  const icon = active && currentSort.sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward';

  return (
    <th className={`px-4 py-3.5 text-${align} text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-0.5 rounded-md text-xs font-semibold transition-colors hover:text-primary ${align === 'right' ? 'justify-end w-full' : ''}`}
        aria-label={`${label} sort ${active ? currentSort.sortOrder : 'none'}`}
      >
        <span className="truncate">{label}</span>
        <span className={`material-symbols-outlined text-[16px] shrink-0 ${active ? 'text-primary' : 'text-slate-400'}`}>
          {icon}
        </span>
      </button>
    </th>
  );
}
