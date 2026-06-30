import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LeadForm from '../../components/leads/LeadForm';

export default function CreateLead() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleSuccess = (leadId) => {
    navigate(`/app/leads/${leadId}`);
  };

  const handleViewExisting = (leadId) => {
    navigate(`/app/leads/${leadId}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/app/leads')}
          className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface transition-colors font-label-md text-label-md mb-3"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back to Leads
        </button>
        <h2 className="font-headline-md text-headline-md text-on-surface">
          Create Lead
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant/70">
          Enter lead details to create a new lead record
        </p>
      </div>
      <LeadForm onSuccess={handleSuccess} onViewLead={handleViewExisting} />
    </div>
  );
}
