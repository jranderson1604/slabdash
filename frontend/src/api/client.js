import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('slabdash_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('slabdash_token');
      localStorage.removeItem('slabdash_user');
      localStorage.removeItem('slabdash_company');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};
export const submissions = {
  list: (params) => api.get('/submissions', { params }),
  get: (id) => api.get('/submissions/' + id),
  create: (data) => api.post('/submissions', data),
  update: (id, data) => api.patch('/submissions/' + id, data),
  delete: (id) => api.delete('/submissions/' + id),
  refresh: (id) => api.post('/submissions/' + id + '/refresh'),
  refreshAll: () => api.post('/submissions/refresh-all'),
  assignCustomer: (id, customerId) => api.post('/submissions/' + id + '/assign-customer', { customer_id: customerId }),
};
export const cards = {
  list: (params) => api.get('/cards', { params }),
  get: (id) => api.get('/cards/' + id),
  create: (data) => api.post('/cards', data),
  bulkCreate: (submissionId, cards) => api.post('/cards/bulk', { submission_id: submissionId, cards }),
  update: (id, data) => api.patch('/cards/' + id, data),
  delete: (id) => api.delete('/cards/' + id),
  lookupCert: (id) => api.post('/cards/' + id + '/lookup-cert'),
};
export const customers = {
  list: (params) => api.get('/customers', { params }),
  get: (id) => api.get('/customers/' + id),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.patch('/customers/' + id, data),
  delete: (id) => api.delete('/customers/' + id),
  sendPortalLink: (id) => api.post('/customers/' + id + '/send-portal-link'),
};
export const companies = {
  get: () => api.get('/companies/me'),
  update: (data) => api.patch('/companies/me', data),
};
export const psa = {
  testConnection: () => api.get('/psa/test'),
};
export default api;
