export default function SortableTableHeader({ label, sortKey, currentSort, onSort, align = 'left', className = '' }) {
  const active = currentSort.sortBy === sortKey;
  const icon = active && currentSort.sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward';

  return (
    <th className={`px-3 py-3 text-${align} text-label-sm font-label-sm text-on-surface-variant whitespace-nowrap ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-0.5 rounded-md text-label-sm font-label-sm transition-colors hover:text-primary ${align === 'right' ? 'justify-end w-full' : ''}`}
        aria-label={`${label} sort ${active ? currentSort.sortOrder : 'none'}`}
      >
        <span className="truncate">{label}</span>
        <span className={`material-symbols-outlined text-[16px] shrink-0 ${active ? 'text-primary' : 'text-outline'}`}>
          {icon}
        </span>
      </button>
    </th>
  );
}
