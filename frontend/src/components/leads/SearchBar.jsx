import { useState, useRef, useEffect } from 'react';

export default function SearchBar({ value, onChange, suggestions = [], onSelectSuggestion, placeholder }) {
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  const hasSuggestions = suggestions && suggestions.length > 0;

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFocus = () => {
    setFocused(true);
    if (hasSuggestions) setShowSuggestions(true);
  };

  const handleBlur = () => {
    setFocused(false);
  };

  const handleSelect = (item) => {
    if (onSelectSuggestion) {
      onSelectSuggestion(item);
    } else if (item.value) {
      onChange(item.value);
    }
    setShowSuggestions(false);
  };

  useEffect(() => {
    setShowSuggestions(focused && hasSuggestions && value.length > 0);
  }, [focused, hasSuggestions, value]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label htmlFor="lead-search" className="sr-only">Search leads</label>
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
        search
      </span>
      <input
        ref={inputRef}
        id="lead-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder || "Search by lead ID, company, contact, or mobile..."}
        className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150"
      />
      {showSuggestions && (
        <ul
          role="listbox"
          aria-label="Search suggestions"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-outline-variant bg-white shadow-lg"
        >
          {suggestions.map((item, idx) => (
            <li
              key={item.id || idx}
              role="option"
              aria-selected={false}
              onMouseDown={() => handleSelect(item)}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-body-sm text-on-surface hover:bg-primary/5"
            >
              {item.icon && (
                <span className="material-symbols-outlined text-[16px] text-outline">{item.icon}</span>
              )}
              <span className="truncate">{item.label || item.value || item}</span>
              {item.badge && (
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-label-xs text-primary">
                  {item.badge}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
