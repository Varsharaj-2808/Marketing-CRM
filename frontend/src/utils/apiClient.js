import { API_BASE_URL } from '../constants';

function getToken() {
  const raw =
    localStorage.getItem('crm_access_token') ||
    sessionStorage.getItem('crm_access_token');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function apiClient(
  endpoint,
  { method = 'GET', body, headers: extraHeaders, params, timeout = 15000, responseType, signal: externalSignal } = {},
) {
  const basePath = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '')
        searchParams.set(k, v);
    });
  }
  searchParams.set('_', Date.now());

  const qs = searchParams.toString();
  const url = qs ? `${basePath}?${qs}` : basePath;

  const token = getToken();
  const headers = {
    ...(method !== 'GET' && body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    ...extraHeaders,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      ...(body ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (responseType === 'blob') {
      if (!res.ok) {
        let data = null;
        try { data = await res.json(); } catch { data = null; }
        const error = new Error(data?.message || `Request failed (${res.status})`);
        error.status = res.status;
        error.payload = data;
        throw error;
      }
      return await res.blob();
    }

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // 1. Normalize success flag
      if (data.success === undefined) {
        if (data.status === 'success' || (res.status >= 200 && res.status < 300)) {
          data.success = true;
        } else if (data.status === 'error' || res.status >= 400) {
          data.success = false;
        }
      }

      // 2. Normalize body/data envelope
      if (data.data === undefined && data.body !== undefined) {
        data.data = data.body;
      }

      // 3. For flat responses that do not have data/body fields, wrap them into data
      if (data.success && data.data === undefined) {
        data.data = { ...data };
        delete data.data.data;
      }
    } else if (Array.isArray(data)) {
      // If it is a flat array, wrap it to match the expected success & data envelope
      const arrayData = data;
      data = {
        success: res.status >= 200 && res.status < 300,
        data: arrayData
      };
    }

    if (!res.ok) {
      const error = new Error(
        data?.message || `Request failed (${res.status})`,
      );
      error.status = res.status;
      error.payload = data;
      throw error;
    }

    // Custom normalization for marketing today's followups endpoint
    if (endpoint.includes('/marketing/followups/today')) {
      if (data && data.success && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        const originalData = data.data;
        if (originalData.followups) {
          data.data = originalData.followups;
          data.pagination = originalData.pagination;
        }
      }
    }

    return { ...data, httpStatus: res.status };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
