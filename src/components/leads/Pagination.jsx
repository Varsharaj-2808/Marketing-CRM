export default function Pagination({ currentPage, totalPages, totalRecords, pageSize, onPageChange }) {
  if (!totalRecords || totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let page = start; page <= end; page += 1) pages.push(page);

  return (
    <div className="flex flex-col gap-3 border-t border-outline-variant/30 px-1 pt-4 md:flex-row md:items-center md:justify-between">
      <p className="text-label-sm text-on-surface-variant">
        Page {currentPage} of {totalPages} · {totalRecords} matching records · 25 records per page
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
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
              page === currentPage
                ? 'bg-primary text-white'
                : 'border border-outline-variant text-on-surface-variant hover:bg-white/60'
            }`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-outline-variant px-3 text-label-sm font-label-sm text-on-surface-variant transition-colors hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
