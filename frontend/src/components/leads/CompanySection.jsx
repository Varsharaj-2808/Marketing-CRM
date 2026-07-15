import InputField from '../common/InputField';
import CategoryDropdown from './CategoryDropdown';
import SubCategoryDropdown from './SubCategoryDropdown';

export default function CompanySection({
  formData,
  errors,
  handleChange,
  categories,
  categoriesLoading,
  subCategories,
  subCategoriesLoading,
  onCategoryChange,
}) {
  return (
    <div>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-4">
        Company Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          label="Company Name"
          name="companyName"
          value={formData.companyName}
          onChange={(e) => {
            handleChange(e);
            if (errors.companyName) {
              e.target._clearError = true;
            }
          }}
          onBlur={() => {}}
          placeholder="Enter company name"
          icon="business"
          error={errors.companyName}
          required
        />
        <InputField
          label="Website"
          name="website"
          value={formData.website}
          onChange={handleChange}
          onBlur={() => {}}
          placeholder="https://example.com"
          icon="language"
          error={errors.website}
        />
        <CategoryDropdown
          value={formData.businessCategory}
          onChange={onCategoryChange}
          error={errors.businessCategory}
          categories={categories}
          loading={categoriesLoading}
        />
        <SubCategoryDropdown
          value={formData.businessSubCategory}
          onChange={handleChange}
          error={errors.businessSubCategory}
          subCategories={subCategories}
          disabled={!formData.businessCategory}
          loading={subCategoriesLoading}
        />
      </div>
    </div>
  );
}
