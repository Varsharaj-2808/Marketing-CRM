import SelectField from '../common/SelectField';

export default function LeadSourceDropdown({ value, onChange, error, sources = [] }) {
  const options = sources.map((s) => ({
    value: s.id || s.name,
    label: s.name,
  }));

  return (
    <SelectField
      label="Lead Source"
      name="leadSource"
      value={value}
      onChange={onChange}
      error={error}
      required
      placeholder="Select Lead Source"
      icon="source"
      options={options}
    />
  );
}
