import { useEffect, useState } from 'react';
import { fetchExportHistory, downloadExportFile } from '../../services/leadService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function ExportHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchExportHistory();
      if (res.success) {
        // Sort newest first
        const sorted = (res.data || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setHistory(sorted);
      } else {
        setError(res.message || 'Failed to load export history.');
      }
    } catch (err) {
      setError(err?.message || 'Failed to load export history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDownload = async (item) => {
    setDownloadingId(item.id);
    try {
      const blob = await downloadExportFile(item.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const format = item.details?.format === 'excel' ? 'xlsx' : 'csv';
      a.download = `leads-export-${item.id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Download failed.');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFilters = (filters) => {
    if (!filters) return 'None';
    const keys = Object.keys(filters).filter(k => filters[k]);
    if (keys.length === 0) return 'All Leads';
    return keys.map(k => `${k}: ${filters[k]}`).join(', ');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <LoadingSpinner text="Loading export history..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-headline-md font-headline-md text-on-surface">Export History</h1>
          <p className="text-body-md text-on-surface-variant">View and download past lead data exports.</p>
        </div>
        <button 
          onClick={loadHistory}
          className="px-4 py-2 bg-surface-container border border-outline-variant hover:bg-surface-container-low transition-colors rounded-xl text-label-md font-label-md"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="p-5 border border-error/20 bg-error/5 text-error rounded-2xl flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-3xl mb-2">error</span>
          <p className="font-medium">{error}</p>
          <button 
            onClick={loadHistory}
            className="mt-4 px-4 py-2 bg-error text-white rounded-xl text-label-sm font-bold"
          >
            Retry
          </button>
        </div>
      ) : history.length === 0 ? (
        <div className="p-10 border border-outline-variant/40 rounded-2xl bg-white/40 text-center text-on-surface-variant flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-outline mb-3">download_done</span>
          <p className="text-body-lg font-medium">No export history found.</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-outline-variant/30 rounded-2xl bg-white/60 shadow-sm">
          <table className="w-full text-left border-collapse" role="grid" aria-label="Export History List">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md border-b border-outline-variant/15">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Format</th>
                <th className="p-4">Records</th>
                <th className="p-4">Filters</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-on-surface font-body-md text-body-md">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-white/40 transition-colors">
                  <td className="p-4 whitespace-nowrap">
                    {new Date(item.timestamp).toLocaleString()}
                  </td>
                  <td className="p-4 font-bold text-primary">
                    {(item.details?.format || 'csv').toUpperCase()}
                  </td>
                  <td className="p-4">
                    {item.details?.record_count ?? 0}
                  </td>
                  <td className="p-4 max-w-xs truncate" title={formatFilters(item.details?.filters)}>
                    {formatFilters(item.details?.filters)}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Completed
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDownload(item)}
                      disabled={downloadingId === item.id}
                      className="inline-flex items-center gap-1 text-primary hover:text-primary/85 text-label-md font-bold disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      {downloadingId === item.id ? 'Downloading...' : 'Download'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
