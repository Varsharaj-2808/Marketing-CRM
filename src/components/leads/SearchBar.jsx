export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative w-full">
      <label htmlFor="lead-search" className="sr-only">Search leads</label>
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
        search
      </span>
      <input
        id="lead-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by lead ID, company, contact, or mobile..."
        className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150"
      />
    </div>
  );
}
