import SelectField from '../common/SelectField';

export default function SubCategoryDropdown({
  value,
  onChange,
  error,
  subCategories,
  disabled,
  loading,
}) {
  if (loading) {
    return (
      <div className="space-y-1">
        <label className="font-label-md text-label-md text-on-surface-variant ml-1">
          Business Sub Category *
        </label>
        <div className="w-full bg-white/50 border border-outline-variant rounded-xl py-3 px-4 font-body-md text-on-surface-variant/50 flex items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
          Loading sub categories...
        </div>
      </div>
    );
  }

  if (disabled && !value) {
    return (
      <SelectField
        label="Business Sub Category"
        name="businessSubCategory"
        value={value}
        onChange={onChange}
        error={error}
        required
        disabled
        placeholder="Select Business Category first"
        icon="folder_open"
        options={[]}
      />
    );
  }

  if (!disabled && subCategories.length === 0 && value) {
    return (
      <div className="space-y-1">
        <label className="font-label-md text-label-md text-on-surface-variant ml-1">
          Business Sub Category *
        </label>
        <div className="w-full bg-white/50 border border-outline-variant rounded-xl py-3 px-4 font-body-md text-on-surface-variant/50">
          No Sub Categories available.
        </div>
      </div>
    );
  }

  const activeSubCategories = (subCategories || []).filter((sub) => sub.isActive !== false);
  const options = activeSubCategories.map((sub) => ({
    value: sub.id || sub._id,
    label: sub.name,
  }));

  return (
    <SelectField
      label="Business Sub Category"
      name="businessSubCategory"
      value={value}
      onChange={onChange}
      error={error}
      required
      disabled={disabled}
        placeholder="Select Sub Category"
        icon="folder_open"
      options={options}
    />
  );
}
