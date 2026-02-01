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
  verifyEmail: (token) => api(`/auth/verify-email?token=${encodeURIComponent(token)}`),
  me: () => api('/auth/me'),
  updateProfile: (body) => api('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword: (currentPassword, newPassword) =>
    api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
};

export const recipes = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/recipes${q ? `?${q}` : ''}`);
  },
  similarToFavorites: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/recipes/similar-to-favorites${q ? `?${q}` : ''}`);
  },
  get: (id) => api(`/recipes/${id}`),
  create: (body) => api('/recipes', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/recipes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  importFromUrl: (url) => api('/recipes/import', { method: 'POST', body: JSON.stringify({ url }) }),
  save: (id) => api(`/recipes/${id}/save`, { method: 'POST' }),
  unsave: (id) => api(`/recipes/${id}/save`, { method: 'DELETE' }),
  updateUserRecipe: (id, body) => api(`/recipes/${id}/user-recipe`, { method: 'PATCH', body: JSON.stringify(body) }),
  /** Single-provider external search (so results show as soon as first provider returns) */
  externalSearch: (query, provider) =>
    api(`/recipes/external?q=${encodeURIComponent(query)}&provider=${encodeURIComponent(provider)}`),
};

export const admin = {
  users: {
    list: () => api('/admin/users'),
    get: (id) => api(`/admin/users/${id}`),
    create: (body) => api('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => api(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id) => api(`/admin/users/${id}`, { method: 'DELETE' }),
  },
  recipes: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api(`/admin/recipes${q ? `?${q}` : ''}`);
    },
    get: (id) => api(`/admin/recipes/${id}`),
    update: (id, body) => api(`/admin/recipes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id) => api(`/admin/recipes/${id}`, { method: 'DELETE' }),
  },
};
