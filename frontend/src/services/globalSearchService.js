import { apiClient } from '../utils/apiClient';

export async function globalSearch(query, signal) {
  return await apiClient('/search/global', {
    params: { q: query },
    signal,
  });
}
