import SelectField from '../common/SelectField';

const PRIORITY_OPTIONS = [
  { value: 'Hot', label: 'Hot' },
  { value: 'Warm', label: 'Warm' },
  { value: 'Cold', label: 'Cold' },
];

export default function PriorityDropdown({ value, onChange, error }) {
  return (
    <SelectField
      label="Priority"
      name="priority"
      value={value}
      onChange={onChange}
      error={error}
      required
      placeholder="Select Priority"
      icon="priority_high"
      options={PRIORITY_OPTIONS}
    />
  );
}
