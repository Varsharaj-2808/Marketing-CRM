export default function Pagination({ currentPage, totalPages, totalRecords, pageSize, onPageChange }) {
  const safePage = Number.isFinite(Number(currentPage)) && Number(currentPage) >= 1 ? Number(currentPage) : 1;
  const safeTotal = Number.isFinite(Number(totalPages)) && Number(totalPages) >= 1 ? Number(totalPages) : 1;
  const safeRecords = Number.isFinite(Number(totalRecords)) && Number(totalRecords) >= 0 ? Number(totalRecords) : 0;
  const safeSize = Number.isFinite(Number(pageSize)) && Number(pageSize) >= 1 ? Number(pageSize) : 25;

  if (!safeRecords || safeTotal <= 1) return null;

  const pages = [];
  const start = Math.max(1, Math.min(safePage - 2, safeTotal - 4));
  const end = Math.min(safeTotal, start + 4);
  for (let page = start; page <= end; page += 1) pages.push(page);

  return (
    <div className="flex flex-col gap-3 border-t border-outline-variant/30 px-1 pt-4 md:flex-row md:items-center md:justify-between">
      <p className="text-label-sm text-on-surface-variant">
        Page {String(safePage)} of {String(safeTotal)} · {String(safeRecords)} matching records · {String(safeSize)} records per page
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-outline-variant px-3 text-label-sm font-label-sm text-on-surface-variant transition-colors hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          Previous
        </button>
        {pages.map((page) => (
          <button
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
            className={`h-9 min-w-9 rounded-lg px-2 text-label-sm font-label-sm transition-colors ${
              page === safePage
                ? 'bg-primary text-white'
                : 'border border-outline-variant text-on-surface-variant hover:bg-white/60'
            }`}
            aria-current={page === safePage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= safeTotal}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-outline-variant px-3 text-label-sm font-label-sm text-on-surface-variant transition-colors hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
