import InputField from '../common/InputField';

export default function ContactSection({ formData, errors, handleChange }) {
  return (
    <div>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-4">
        Contact Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          label="Contact Person"
          name="contactPerson"
          value={formData.contactPerson}
          onChange={handleChange}
          onBlur={() => {}}
          placeholder="Enter contact person name"
          icon="person"
          error={errors.contactPerson}
          required
        />
        <InputField
          label="Mobile Number"
          name="mobileNumber"
          type="tel"
          value={formData.mobileNumber}
          onChange={handleChange}
          onBlur={() => {}}
          placeholder="10 digit mobile number"
          icon="phone"
          error={errors.mobileNumber}
          required
        />
        <InputField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={() => {}}
          placeholder="email@example.com"
          icon="alternate_email"
          error={errors.email}
        />
        <InputField
          label="City"
          name="city"
          value={formData.city}
          onChange={handleChange}
          onBlur={() => {}}
          placeholder="Enter city"
          icon="location_city"
          error={errors.city}
        />
      </div>
    </div>
  );
}
