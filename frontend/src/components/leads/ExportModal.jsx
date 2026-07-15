import { useState } from 'react';

export default function ExportModal({ isOpen, onClose, activeFilters, filterLabels, onExport, loading }) {
  const [format, setFormat] = useState('csv');

  if (!isOpen) return null;

  // Format filter values for display
  const getFilterSummary = () => {
    const summary = [];
    if (activeFilters.status) summary.push(`Status: ${activeFilters.status}`);
    if (activeFilters.stage) summary.push(`Stage: ${activeFilters.stage}`);
    if (activeFilters.source) summary.push(`Source: ${activeFilters.source}`);
    if (activeFilters.category) {
      const labelMap = filterLabels?.category || {};
      const name = labelMap[activeFilters.category] || activeFilters.category;
      summary.push(`Category: ${name}`);
    }
    if (activeFilters.priority) summary.push(`Quality: ${activeFilters.priority}`);
    if (activeFilters.dateFrom || activeFilters.dateTo) {
      const from = activeFilters.dateFrom || 'All Time';
      const to = activeFilters.dateTo || 'All Time';
      summary.push(`Date: ${from} to ${to}`);
    }
    return summary.length > 0 ? summary.join(', ') : 'All Leads (No filters applied)';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onExport(format);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="export-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-fade-in border border-outline-variant/10">
        <h2 
          id="export-modal-title" 
          className="text-headline-md font-headline-md text-on-surface mb-4"
        >
          Export Leads
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Active Filters Summary */}
          <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/20">
            <span className="text-label-sm font-bold text-on-surface-variant block mb-1">
              Applied Filters Summary
            </span>
            <p className="text-body-md text-on-surface">
              {getFilterSummary()}
            </p>
          </div>

          {/* Format Selection */}
          <fieldset className="space-y-3">
            <legend className="text-label-md font-bold text-on-surface-variant">
              Select Export Format
            </legend>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer font-body-md text-on-surface">
                <input
                  type="radio"
                  name="exportFormat"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                  className="w-4 h-4 text-primary focus:ring-primary/20 border-outline"
                />
                CSV
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-body-md text-on-surface">
                <input
                  type="radio"
                  name="exportFormat"
                  value="excel"
                  checked={format === 'excel'}
                  onChange={() => setFormat('excel')}
                  className="w-4 h-4 text-primary focus:ring-primary/20 border-outline"
                />
                Excel
              </label>
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 border-t border-outline-variant/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-outline-variant text-label-md font-label-md text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="confirm-export-btn"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-primary text-label-md font-label-md text-white hover:bg-primary/95 transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>Exporting...</span>
                </>
              ) : (
                'Export'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
