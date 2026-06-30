import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchLeads } from '../../services/leadService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';

const STATUS_MAP = {
  New: 'new',
  Contacted: 'contacted',
  Qualified: 'qualified',
  Converted: 'converted',
  Lost: 'lost',
};

export default function LeadList() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const res = await fetchLeads(params);
      const data = res?.data || res?.leads || [];
      setLeads(Array.isArray(data) ? data : []);
      setTotalPages(res?.totalPages || res?.pagination?.totalPages || 1);
      setTotalLeads(res?.total || res?.pagination?.total || data.length || 0);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleSearch = useCallback((e) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const handleStatusFilter = useCallback((e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  }, []);

  const handlePriorityFilter = useCallback((e) => {
    setPriorityFilter(e.target.value);
    setPage(1);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="glass-card rounded-3xl p-5 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">
              Lead Management
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant/70">
              {totalLeads > 0 ? `${totalLeads} lead${totalLeads !== 1 ? 's' : ''} found` : 'Manage your leads'}
            </p>
          </div>
          <button
            onClick={() => navigate('/app/leads/create')}
            className="btn-gradient px-6 py-3 rounded-xl text-white font-label-md text-label-md flex items-center gap-2 self-start"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Create Lead
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search leads..."
              className="w-full bg-white/50 border border-outline-variant rounded-xl py-3 pl-10 pr-4 font-body-md text-on-surface placeholder:text-outline/50 transition-all focus:outline-none input-focus-effect"
            />
          </div>
          <select
            value={statusFilter}
            onChange={handleStatusFilter}
            className="bg-white/50 border border-outline-variant rounded-xl py-3 px-4 font-body-md text-on-surface transition-all focus:outline-none input-focus-effect appearance-none cursor-pointer min-w-[140px]"
          >
            <option value="">All Status</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Converted">Converted</option>
            <option value="Lost">Lost</option>
          </select>
          <select
            value={priorityFilter}
            onChange={handlePriorityFilter}
            className="bg-white/50 border border-outline-variant rounded-xl py-3 px-4 font-body-md text-on-surface transition-all focus:outline-none input-focus-effect appearance-none cursor-pointer min-w-[140px]"
          >
            <option value="">All Priority</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
          </select>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading leads..." />
        ) : leads.length === 0 ? (
          <EmptyState
            icon="leaderboard"
            title="No leads found"
            description={
              search || statusFilter || priorityFilter
                ? 'Try adjusting your search or filters.'
                : 'Create your first lead to get started.'
            }
            action={
              !search && !statusFilter && !priorityFilter ? (
                <button
                  onClick={() => navigate('/app/leads/create')}
                  className="btn-gradient px-6 py-3 rounded-xl text-white font-label-md text-label-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Create Lead
                </button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto -mx-5 sm:-mx-6 md:-mx-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant/30">
                    <th className="text-left px-4 sm:px-6 py-3 font-label-md text-label-md text-on-surface-variant">Lead ID</th>
                    <th className="text-left px-4 sm:px-6 py-3 font-label-md text-label-md text-on-surface-variant">Company</th>
                    <th className="text-left px-4 sm:px-6 py-3 font-label-md text-label-md text-on-surface-variant hidden sm:table-cell">Contact</th>
                    <th className="text-left px-4 sm:px-6 py-3 font-label-md text-label-md text-on-surface-variant hidden md:table-cell">Mobile</th>
                    <th className="text-left px-4 sm:px-6 py-3 font-label-md text-label-md text-on-surface-variant">Status</th>
                    <th className="text-left px-4 sm:px-6 py-3 font-label-md text-label-md text-on-surface-variant hidden lg:table-cell">Priority</th>
                    <th className="text-right px-4 sm:px-6 py-3 font-label-md text-label-md text-on-surface-variant">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id || lead._id || lead.leadId}
                      className="border-b border-outline-variant/20 hover:bg-white/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/app/leads/${lead.id || lead._id || lead.leadId}`)}
                    >
                      <td className="px-4 sm:px-6 py-4 font-label-md text-label-md text-primary">
                        {lead.leadId || lead.id || 'LD-0000'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 font-body-md text-body-md text-on-surface">
                        {lead.companyName}
                      </td>
                      <td className="px-4 sm:px-6 py-4 font-body-md text-body-md text-on-surface hidden sm:table-cell">
                        {lead.contactPerson}
                      </td>
                      <td className="px-4 sm:px-6 py-4 font-body-md text-body-md text-on-surface-variant hidden md:table-cell">
                        {lead.mobileNumber}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <Badge variant={STATUS_MAP[lead.status] || 'new'}>
                          {lead.status || 'New'}
                        </Badge>
                      </td>
                      <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                        <Badge variant={lead.priority?.toLowerCase() || 'new'}>
                          {lead.priority || 'New'}
                        </Badge>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/app/leads/${lead.id || lead._id || lead.leadId}`);
                          }}
                          className="text-primary hover:text-primary/80 font-label-md text-label-md transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 border-t border-outline-variant/30 mt-6">
                <p className="text-label-sm text-label-sm text-on-surface-variant/70">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-2 rounded-xl border border-outline-variant text-on-surface-variant font-label-sm text-label-sm hover:bg-white/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const start = Math.max(1, page - 2);
                    const pg = start + i;
                    if (pg > totalPages) return null;
                    return (
                      <button
                        key={pg}
                        onClick={() => setPage(pg)}
                        className={`w-9 h-9 rounded-xl font-label-sm text-label-sm transition-all ${
                          pg === page
                            ? 'bg-primary text-white'
                            : 'border border-outline-variant text-on-surface-variant hover:bg-white/30'
                        }`}
                      >
                        {pg}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-2 rounded-xl border border-outline-variant text-on-surface-variant font-label-sm text-label-sm hover:bg-white/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
