import { useState, useRef, useEffect } from 'react';

export default function ServiceMultiSelect({
  selected,
  onChange,
  error,
  options = [],
  required,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value) => {
    const exists = selected.includes(value);
    if (exists) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const removeChip = (value, e) => {
    e.stopPropagation();
    onChange(selected.filter((v) => v !== value));
  };

  return (
    <div className="space-y-1" ref={containerRef}>
      <label className="font-label-md text-label-md text-on-surface-variant ml-1">
        Service Interested{required && ' *'}
      </label>
      <div className="relative">
        <div
          className={`w-full bg-white/50 border rounded-xl py-3 px-4 font-body-md text-on-surface transition-all cursor-pointer flex flex-wrap gap-1.5 min-h-[48px] items-center ${
            error ? 'border-error' : 'border-outline-variant'
          }`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {selected.length === 0 && (
            <span className="text-outline/50">Select services</span>
          )}
          {selected.map((val) => {
            const opt = options.find((o) => (o.id || o.value) === val);
            return (
              <span
                key={val}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-label-sm font-label-sm"
              >
                {opt?.name || opt?.label || val}
                <button
                  onClick={(e) => removeChip(val, e)}
                  className="hover:text-error transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            );
          })}
          <span className="material-symbols-outlined text-[20px] text-outline ml-auto">
            expand_more
          </span>
        </div>
        {isOpen && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-outline-variant rounded-xl shadow-lg animate-fade-in-scale max-h-48 overflow-y-auto">
            {options.length === 0 ? (
              <div className="p-4 text-center text-label-sm text-on-surface-variant/50">
                No services available
              </div>
            ) : (
              options.map((opt) => {
                const val = opt.id || opt.value;
                const isSelected = selected.includes(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => toggleOption(val)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-label-sm font-label-sm transition-colors ${
                      isSelected
                        ? 'bg-primary/5 text-primary'
                        : 'text-on-surface hover:bg-white/50'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        isSelected ? 'text-primary' : 'text-outline'
                      }`}
                      style={isSelected ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                      {isSelected ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    {opt.name || opt.label || val}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="text-label-sm font-label-sm text-error mt-1 ml-1">{error}</p>
      )}
    </div>
  );
}
