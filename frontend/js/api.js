const TOKEN_KEY = 'kids-star-dashboard.sessionToken';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }
export function hasToken() { return !!getToken(); }

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || res.statusText);
    err.code = data?.error?.code || 'http_error';
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // Identity
  createChild: (body) => request('POST', '/api/children', body),
  login: (accessCode) => request('POST', '/api/sessions', { accessCode }),
  recover: (body) => request('POST', '/api/recovery', body),
  me: () => request('GET', '/api/children/me'),
  updateName: (name) => request('PATCH', '/api/children/me', { name }),
  deleteMe: () => request('DELETE', '/api/children/me'),

  // Days / agenda (US1)
  getDay: (date) => request('GET', `/api/days/${date}`),
  saveAgenda: (date, hour, body) => request('PUT', `/api/days/${date}/agenda/${hour}`, body),
};
