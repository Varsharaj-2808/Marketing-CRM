import SelectField from '../common/SelectField';

export default function CategoryDropdown({ value, onChange, error, categories, loading }) {
  const options = (categories || []).map((cat) => ({
    value: cat.id || cat._id,
    label: cat.name,
  }));

  if (loading) {
    return (
      <div className="space-y-1">
        <label className="font-label-md text-label-md text-on-surface-variant ml-1">
          Business Category *
        </label>
        <div className="w-full bg-white/50 border border-outline-variant rounded-xl py-3 px-4 font-body-md text-on-surface-variant/50 flex items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
          Loading categories...
        </div>
      </div>
    );
  }

  return (
    <SelectField
      label="Business Category"
      name="businessCategory"
      value={value}
      onChange={onChange}
      error={error}
      required
      placeholder="Select Category"
      icon="category"
      options={options}
    />
  );
}
