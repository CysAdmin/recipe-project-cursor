const API = '/api';

function getToken() {
  return localStorage.getItem('token');
}

export async function api(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const auth = {
  register: (body) => api('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => api('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => api('/auth/me'),
};

export const recipes = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/recipes${q ? `?${q}` : ''}`);
  },
  get: (id) => api(`/recipes/${id}`),
  create: (body) => api('/recipes', { method: 'POST', body: JSON.stringify(body) }),
  importFromUrl: (url) => api('/recipes/import', { method: 'POST', body: JSON.stringify({ url }) }),
  save: (id) => api(`/recipes/${id}/save`, { method: 'POST' }),
  unsave: (id) => api(`/recipes/${id}/save`, { method: 'DELETE' }),
  updateUserRecipe: (id, body) => api(`/recipes/${id}/user-recipe`, { method: 'PATCH', body: JSON.stringify(body) }),
  /** Single-provider external search (so results show as soon as first provider returns) */
  externalSearch: (query, provider) =>
    api(`/recipes/external?q=${encodeURIComponent(query)}&provider=${encodeURIComponent(provider)}`),
};

export const mealSchedules = {
  list: (start, end) => api(`/meal-schedules?start=${start}&end=${end}`),
  add: (body) => api('/meal-schedules', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/meal-schedules/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id) => api(`/meal-schedules/${id}`, { method: 'DELETE' }),
  copyWeek: (fromStart, toStart) =>
    api('/meal-schedules/copy-week', { method: 'POST', body: JSON.stringify({ from_start: fromStart, to_start: toStart }) }),
};

export const shoppingLists = {
  generate: (start, end) => api(`/shopping-lists/generate?start=${start}&end=${end}`),
  list: () => api('/shopping-lists'),
  save: (body) => api('/shopping-lists', { method: 'POST', body: JSON.stringify(body) }),
};
