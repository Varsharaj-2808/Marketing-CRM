import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { globalSearch } from '../../services/globalSearchService';

const DEBOUNCE_MS = 300;
const STORAGE_KEY = 'crm_recent_searches';
const MAX_RECENT = 5;

const MODULE_ROUTES = {
  Users: '/admin/users',
  Leads: '/admin/leads',
  Categories: '/admin/categories',
  Services: '/admin/services',
  Notifications: null,
  'Audit Logs': '/admin/audit-log',
  'Follow Ups': '/marketing/followups',
};

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query) {
  if (!query.trim()) return;
  const recent = getRecentSearches().filter((r) => r !== query.trim());
  recent.unshift(query.trim());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function HighlightText({ text, query }) {
  if (!query || !text) return <span>{text}</span>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-on-surface rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export default function GlobalSearch({ variant = 'admin' }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState(getRecentSearches);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const abortRef = useRef(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allResults = useMemo(() => {
    if (!results) return [];
    const flat = [];
    const moduleOrder = ['Leads', 'Users', 'Categories', 'Services', 'Notifications', 'Audit Logs', 'Follow Ups'];
    for (const mod of moduleOrder) {
      const items = results[mod] || results[mod.toLowerCase()] || [];
      if (items.length > 0) {
        items.forEach((item) => flat.push({ ...item, module: mod }));
      }
    }
    return flat;
  }, [results]);

  const search = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');
    try {
      const res = await globalSearch(q.trim(), controller.signal);
      if (!mountedRef.current || controller.signal.aborted) return;
      setResults(res?.data || null);
    } catch (err) {
      if (err?.name === 'AbortError' || controller.signal.aborted) return;
      if (mountedRef.current) {
        setError(err?.message || 'Search failed');
        setResults(null);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback((value) => {
    setQuery(value);
    setActiveIndex(-1);
    clearTimeout(timerRef.current);
    if (value.trim().length >= 2) {
      setShowDropdown(true);
      timerRef.current = setTimeout(() => search(value), DEBOUNCE_MS);
    } else {
      setResults(null);
      setShowDropdown(value.length > 0);
    }
  }, [search]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    clearTimeout(timerRef.current);
    if (query.trim().length >= 2) {
      saveRecentSearch(query);
      setRecentSearches(getRecentSearches());
      search(query);
    }
  }, [query, search]);

  const handleSelectItem = useCallback((item) => {
    setShowDropdown(false);
    setQuery('');
    setResults(null);
    const route = MODULE_ROUTES[item.module];
    if (route) {
      if (item.module === 'Leads' && item.id) {
        const prefix = variant === 'marketing' ? '/marketing' : '/admin';
        navigate(`${prefix}/leads/${item.id}`);
      } else {
        navigate(route);
      }
    }
  }, [navigate, variant]);

  const handleSelectRecent = useCallback((recent) => {
    setQuery(recent);
    setShowDropdown(true);
    timerRef.current = setTimeout(() => search(recent), DEBOUNCE_MS);
  }, [search]);

  const handleClearRecent = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRecentSearches([]);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!showDropdown) return;
    const items = query.trim().length >= 2 ? allResults : [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
      e.preventDefault();
      handleSelectItem(items[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  }, [showDropdown, activeIndex, allResults, query, handleSelectItem]);

  const groupedResults = useMemo(() => {
    if (!results) return {};
    const groups = {};
    for (const item of allResults) {
      if (!groups[item.module]) groups[item.module] = [];
      groups[item.module].push(item);
    }
    return groups;
  }, [results, allResults]);

  const hasQuery = query.trim().length >= 2;
  const hasResults = allResults.length > 0;
  const showRecent = showDropdown && !hasQuery && recentSearches.length > 0;
  const showResults = showDropdown && hasQuery && (hasResults || loading || error);
  const showEmpty = showDropdown && hasQuery && !loading && !error && !hasResults;

  let flatIndex = -1;

  return (
    <div ref={dropdownRef} className="relative w-full max-w-md">
      <form onSubmit={handleSubmit} className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
          search
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search leads, users, categories..."
          aria-label="Global search"
          aria-expanded={showDropdown}
          aria-controls="global-search-results"
          aria-activedescendant={activeIndex >= 0 ? `gs-result-${activeIndex}` : undefined}
          role="combobox"
          autoComplete="off"
          className="w-full bg-white/70 border border-outline-variant rounded-full py-2.5 pl-10 pr-10 text-body-md text-on-surface placeholder:text-outline-variant focus:outline-none input-focus-effect"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults(null); setShowDropdown(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </form>

      {showDropdown && (
        <div
          id="global-search-results"
          role="listbox"
          aria-label="Search results"
          className="absolute z-50 mt-2 w-full max-h-[480px] overflow-y-auto rounded-xl border border-outline-variant bg-white shadow-xl"
        >
          {loading && (
            <div className="flex items-center gap-3 px-4 py-6 text-body-sm text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              Searching...
            </div>
          )}

          {error && (
            <div className="px-4 py-6 text-center">
              <span className="material-symbols-outlined text-[32px] text-error/60">error</span>
              <p className="mt-2 text-body-sm text-on-surface-variant">{error}</p>
            </div>
          )}

          {showRecent && (
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-label-sm font-label-sm text-on-surface-variant">Recent Searches</span>
                <button
                  type="button"
                  onClick={handleClearRecent}
                  className="text-label-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((recent, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectRecent(recent)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-surface-container-high/50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-outline">history</span>
                  <span className="text-body-sm text-on-surface">{recent}</span>
                </button>
              ))}
            </div>
          )}

          {showResults && !loading && Object.keys(groupedResults).length > 0 && (
            <div className="p-2">
              {Object.entries(groupedResults).map(([module, items]) => (
                <div key={module} className="mb-2 last:mb-0">
                  <div className="px-3 py-1.5">
                    <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">{module}</span>
                  </div>
                  {items.map((item) => {
                    flatIndex++;
                    const idx = flatIndex;
                    return (
                      <button
                        key={`${item.module}-${item.id}-${idx}`}
                        id={`gs-result-${idx}`}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === idx}
                        onClick={() => handleSelectItem(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          activeIndex === idx ? 'bg-primary/5' : 'hover:bg-surface-container-high/50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px] text-outline shrink-0">
                          {item.icon || 'search'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-body-sm text-on-surface truncate">
                            <HighlightText text={item.title} query={query} />
                          </p>
                          {item.subtitle && (
                            <p className="text-label-xs text-on-surface-variant truncate">
                              <HighlightText text={item.subtitle} query={query} />
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {showEmpty && (
            <div className="px-4 py-8 text-center">
              <span className="material-symbols-outlined text-[40px] text-outline/40">search_off</span>
              <p className="mt-2 text-body-sm text-on-surface-variant">No results found for "{query}"</p>
              <p className="mt-1 text-label-xs text-on-surface-variant/60">Try a different search term</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
