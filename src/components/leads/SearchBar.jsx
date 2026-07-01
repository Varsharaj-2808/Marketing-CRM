export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative w-full">
      <label htmlFor="lead-search" className="sr-only">Search leads</label>
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
        search
      </span>
      <input
        id="lead-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by lead ID, company, contact, or mobile"
        className="w-full rounded-lg border border-outline-variant bg-white/70 py-2.5 pl-10 pr-3 text-body-md text-on-surface placeholder:text-outline focus:outline-none input-focus-effect"
      />
    </div>
  );
}
