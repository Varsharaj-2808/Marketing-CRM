import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Generic Algolia-powered search hook.
 *
 * @param {Function} searchFn   - async (params, signal) => response
 * @param {Object}   params     - query/filter params that trigger a new search
 * @param {Object}   opts
 * @param {number}   opts.debounceMs   - debounce delay (default 300)
 * @param {boolean}  opts.enabled      - skip search when false
 * @param {Function} opts.normalizeFn  - optional response normalizer
 * @param {string}   opts.cacheKey     - optional cache prefix
 */
export default function useAlgoliaSearch(
  searchFn,
  params = {},
  { debounceMs = DEFAULT_DEBOUNCE_MS, enabled = true, normalizeFn, cacheKey } = {},
) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const abortRef = useRef(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const cacheRef = useRef(new Map());
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(
    async (overrides = {}, pageNum) => {
      if (!enabled || !searchFn) return;

      // Cancel in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const effectiveParams = { ...params, ...overrides };
      if (pageNum !== undefined) effectiveParams.page = pageNum;

      const key = cacheKey
        ? `${cacheKey}:${JSON.stringify(effectiveParams)}`
        : JSON.stringify(effectiveParams);

      // Serve from cache
      if (cacheRef.current.has(key)) {
        const cached = cacheRef.current.get(key);
        if (mountedRef.current) {
          setData(cached.data);
          setTotalPages(cached.totalPages);
          setTotalCount(cached.totalCount);
          setPage(cached.page);
          setLoading(false);
        }
        return;
      }

      if (mountedRef.current) setLoading(true);

      try {
        const response = await searchFn(effectiveParams, controller.signal);
        if (controller.signal.aborted) return;

        const normalized = normalizeFn ? normalizeFn(response) : response;
        const result = normalized?.data || normalized || {};
        const list = Array.isArray(result)
          ? result
          : Array.isArray(result.data)
            ? result.data
            : [];
        const tp = result.totalPages ?? result.total_pages ?? 1;
        const tc = result.totalCount ?? result.total_count ?? result.totalRecords ?? list.length;
        const pg = result.page ?? effectiveParams.page ?? 1;

        // Cache result
        cacheRef.current.set(key, { data: list, totalPages: tp, totalCount: tc, page: pg });
        // Evict stale cache entries (keep last 20)
        if (cacheRef.current.size > 20) {
          const firstKey = cacheRef.current.keys().next().value;
          cacheRef.current.delete(firstKey);
        }

        if (mountedRef.current) {
          setData(list);
          setTotalPages(tp);
          setTotalCount(tc);
          setPage(pg);
          setError(null);
        }
      } catch (err) {
        if (err?.name === 'AbortError' || controller.signal.aborted) return;
        if (mountedRef.current) {
          setError(err?.message || 'Search failed');
          setData([]);
          setTotalPages(1);
          setTotalCount(0);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [searchFn, params, enabled, normalizeFn, cacheKey],
  );

  // Debounced auto-search when params change
  useEffect(() => {
    if (!enabled) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      execute({}, 1);
    }, debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [paramsKey, enabled, execute, debounceMs]);

  // Manual page change (no debounce)
  const goToPage = useCallback(
    (newPage) => {
      setPage(newPage);
      execute({ page: newPage }, newPage);
    },
    [execute],
  );

  // Manual search trigger (e.g. on Enter)
  const triggerSearch = useCallback(
    (overrides = {}) => {
      clearTimeout(timerRef.current);
      execute(overrides, 1);
    },
    [execute],
  );

  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    data,
    loading,
    error,
    page,
    totalPages,
    totalCount,
    goToPage,
    triggerSearch,
    clearCache,
  };
}
