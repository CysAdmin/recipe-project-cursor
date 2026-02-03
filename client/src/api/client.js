const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API = baseUrl ? `${baseUrl}/api` : '/api';

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
  resendVerificationEmail: (email) =>
    api('/auth/resend-verification-email', { method: 'POST', body: JSON.stringify({ email }) }),
  me: () => api('/auth/me'),
  updateProfile: (body) => api('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),
  completeOnboarding: () =>
    api('/auth/me', { method: 'PATCH', body: JSON.stringify({ onboarding_completed: true }) }),
  changePassword: (currentPassword, newPassword) =>
    api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
  forgotPassword: (email) =>
    api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, newPassword) =>
    api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    }),
  deleteAccount: () => api('/auth/me', { method: 'DELETE' }),
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
  byIngredients: (ingredients) => {
    const list = Array.isArray(ingredients)
      ? ingredients
      : typeof ingredients === 'string'
        ? ingredients.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    const q = list.length ? `ingredients=${encodeURIComponent(list.join(','))}` : '';
    return api(`/recipes/by-ingredients${q ? `?${q}` : ''}`);
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

export const collections = {
  list: () => api('/collections'),
  create: (body) => api('/collections', { method: 'POST', body: JSON.stringify(body) }),
  get: (id) => api(`/collections/${id}`),
  update: (id, body) => api(`/collections/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => api(`/collections/${id}`, { method: 'DELETE' }),
  addRecipe: (collectionId, recipeId) =>
    api(`/collections/${collectionId}/recipes`, { method: 'POST', body: JSON.stringify({ recipe_id: recipeId }) }),
  removeRecipe: (collectionId, recipeId) =>
    api(`/collections/${collectionId}/recipes/${recipeId}`, { method: 'DELETE' }),
};

export const admin = {
  users: {
    list: () => api('/admin/users'),
    get: (id) => api(`/admin/users/${id}`),
    create: (body) => api('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => api(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id) => api(`/admin/users/${id}`, { method: 'DELETE' }),
    resendVerification: (id) =>
      api(`/admin/users/${id}/resend-verification`, { method: 'POST' }),
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
  logs: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api(`/admin/logs${q ? `?${q}` : ''}`);
    },
  },
};
