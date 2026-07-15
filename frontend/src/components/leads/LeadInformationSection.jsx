import InputField from '../common/InputField';
import LeadSourceDropdown from './LeadSourceDropdown';
import ServiceMultiSelect from './ServiceMultiSelect';
import PriorityDropdown from './PriorityDropdown';

export default function LeadInformationSection({
  formData,
  errors,
  handleChange,
  handleServiceChange,
  user,
  leadSources = [],
  services = [],
}) {
  return (
    <div>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-4">
        Lead Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LeadSourceDropdown
          value={formData.leadSource}
          onChange={handleChange}
          error={errors.leadSource}
          sources={leadSources}
        />
        <div>
          <ServiceMultiSelect
            selected={formData.servicesInterested}
            onChange={handleServiceChange}
            error={errors.servicesInterested}
            options={services}
            required
          />
        </div>
        <PriorityDropdown
          value={formData.priority}
          onChange={handleChange}
          error={errors.priority}
        />
        <InputField
          label="Estimated Value"
          name="estimatedValue"
          value={formData.estimatedValue}
          onChange={handleChange}
          onBlur={() => {}}
          placeholder="Enter estimated value"
          icon="payments"
          error={errors.estimatedValue}
        />
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface-variant ml-1">
            Assigned To
          </label>
          <div className="w-full bg-white/50 border border-outline-variant rounded-xl py-3 px-4 font-body-md text-on-surface/70 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-outline">
              person
            </span>
            {user?.name || 'Current User'}
          </div>
        </div>
      </div>
    </div>
  );
}
