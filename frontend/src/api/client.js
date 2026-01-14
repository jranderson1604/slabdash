import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('slabdash_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me')
};

export const companies = {
  get: (id) => api.get(`/companies/${id}`),
  update: (id, data) => api.put(`/companies/${id}`, data),
  updatePsaKey: (id, psaApiKey) => api.put(`/companies/${id}/psa-key`, { psa_api_key: psaApiKey })
};

export const customers = {
  list: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  generatePortalLink: (id) => api.post(`/customers/${id}/portal-link`)
};

export const submissions = {
  list: (params) => api.get('/submissions', { params }),
  get: (id) => api.get(`/submissions/${id}`),
  create: (data) => api.post('/submissions', data),
  update: (id, data) => api.put(`/submissions/${id}`, data),
  delete: (id) => api.delete(`/submissions/${id}`),
  refresh: (id) => api.post(`/submissions/${id}/refresh`),
  assignCustomer: (id, customerId) => api.put(`/submissions/${id}`, { customer_id: customerId }),
  uploadImage: (id, formData) => 
    api.post(`/submissions/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
};

export const cards = {
  list: (params) => api.get('/cards', { params }),
  get: (id) => api.get(`/cards/${id}`),
  create: (data) => api.post('/cards', data),
  update: (id, data) => api.put(`/cards/${id}`, data),
  delete: (id) => api.delete(`/cards/${id}`),
  lookupCert: (id) => api.post(`/cards/${id}/lookup-cert`)
};

export const psa = {
  testConnection: () => api.get('/psa/test'),
  refreshAll: () => api.post('/psa/refresh-all')
};

export const portal = {
  login: (email, password) => api.post('/portal/login', { email, password }),
  me: () => api.get('/portal/me'),
  submissions: () => api.get('/portal/submissions')
};

export default api;