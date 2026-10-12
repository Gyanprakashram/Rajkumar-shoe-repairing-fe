import { API_BASE } from '../apiConfig';

export async function apiClient(path, method = 'GET', body) {
  const httpOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body !== undefined && body !== null) {
    httpOptions.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, httpOptions);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}
