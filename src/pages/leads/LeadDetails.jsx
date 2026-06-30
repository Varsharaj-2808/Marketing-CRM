import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchLeadById } from '../../services/leadService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Badge from '../../components/common/Badge';

const STATUS_MAP = {
  New: 'new',
  Contacted: 'contacted',
  Qualified: 'qualified',
  Converted: 'converted',
  Lost: 'lost',
};

export default function LeadDetails() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetchLeadById(leadId);
        setLead(res?.data || res?.lead || res || null);
      } catch {
        setLead(null);
      } finally {
        setLoading(false);
      }
    }
    if (leadId) load();
  }, [leadId]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <button
        onClick={() => navigate('/app/leads')}
        className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface transition-colors font-label-md text-label-md mb-3"
      >
        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        Back to Leads
      </button>

      {loading ? (
        <LoadingSpinner text="Loading lead details..." />
      ) : !lead ? (
        <div className="glass-card rounded-3xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />
          <p className="font-body-md text-body-md text-on-surface-variant">
            Lead not found.
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f46e5] via-[#712ae2] to-[#8b5cf6] bg-[length:200%_100%] animate-shimmer" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Lead Details
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant/70">
                {lead.leadId || lead.id || `LD-${leadId}`}
              </p>
            </div>
            <Badge variant={STATUS_MAP[lead.status] || 'new'}>
              {lead.status || 'New'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Company Name</p>
              <p className="font-body-md text-body-md text-on-surface">{lead.companyName || '-'}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Website</p>
              <p className="font-body-md text-body-md text-on-surface">{lead.website || '-'}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Contact Person</p>
              <p className="font-body-md text-body-md text-on-surface">{lead.contactPerson || '-'}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Mobile Number</p>
              <p className="font-body-md text-body-md text-on-surface">{lead.mobileNumber || '-'}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Email</p>
              <p className="font-body-md text-body-md text-on-surface">{lead.email || '-'}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">City</p>
              <p className="font-body-md text-body-md text-on-surface">{lead.city || '-'}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Lead Source</p>
              <p className="font-body-md text-body-md text-on-surface">{lead.leadSource || '-'}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Priority</p>
              <p className="font-body-md text-body-md text-on-surface">
                <Badge variant={lead.priority?.toLowerCase() || 'new'}>
                  {lead.priority || '-'}
                </Badge>
              </p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Estimated Value</p>
              <p className="font-body-md text-body-md text-on-surface">{lead.estimatedValue || '-'}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-label-sm font-label-sm text-on-surface-variant mb-1">Assigned To</p>
              <p className="font-body-md text-body-md text-on-surface">{lead.assignedTo || '-'}</p>
            </div>
          </div>

          {lead.servicesInterested && lead.servicesInterested.length > 0 && (
            <div className="mt-6">
              <h3 className="font-label-md text-label-md text-on-surface-variant mb-2">Services Interested</h3>
              <div className="flex flex-wrap gap-2">
                {(lead.servicesInterested || []).map((svc) => (
                  <span
                    key={svc}
                    className="px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-xl text-label-sm font-label-sm text-primary"
                  >
                    {svc}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-outline-variant/30">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-4">
              Timeline
            </h3>
            {lead.timeline && lead.timeline.length > 0 ? (
              <div className="space-y-3">
                {lead.timeline.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-white/30 rounded-xl border border-outline-variant/20"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] text-primary">history</span>
                    </div>
                    <div>
                      <p className="font-body-md text-body-md text-on-surface">
                        {entry.message || entry.description || ''}
                      </p>
                      <p className="text-label-sm text-label-sm text-on-surface-variant/70">
                        {entry.createdBy ? `by ${typeof entry.createdBy === 'object' ? entry.createdBy.name : entry.createdBy}` : ''}
                        {entry.createdAt ? ` on ${new Date(entry.createdAt).toLocaleString()}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-body-md text-body-md text-on-surface-variant/70">
                Lead Created by {lead.createdBy?.name || lead.createdBy || 'N/A'} on{' '}
                {lead.createdAt
                  ? new Date(lead.createdAt).toLocaleString()
                  : 'N/A'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
