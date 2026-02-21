import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
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
      const path = window.location.pathname;
      const isPublicPage = path === '/login' || path === '/register' || path === '/' || path.startsWith('/portal');
      if (!isPublicPage) {
        localStorage.removeItem('slabdash_token');
        window.location.href = '/login';
      }
    }
    if (error.response?.status === 403 && error.response?.data?.upgrade) {
      window.dispatchEvent(new CustomEvent('slabdash:upgrade', { detail: error.response.data }));
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me', {
    headers: { 'Cache-Control': 'no-cache' },
    params: { _t: Date.now() } // Cache-busting timestamp
  })
};

export const companies = {
  get: () => api.get('/companies/settings'),
  update: (data) => api.patch('/companies/settings', data),
  updatePsaKey: (psaApiKey) => api.post('/companies/psa-key', { apiKey: psaApiKey }),
  usage: () => api.get('/companies/usage'),
  stats: () => api.get('/companies/stats'),
};

export const customers = {
  list: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.patch(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  sendPortalLink: (id) => api.post(`/customers/${id}/send-portal-link`),
  sendIntroductionEmail: (id) => api.post(`/customers/${id}/send-introduction-email`),
  sendTestIntroductionEmail: (testEmail) => api.post('/customers/send-test-introduction-email', { testEmail }),
  sendBulkIntroductionEmails: () => api.post('/customers/send-bulk-introduction-emails'),
  importCSV: (csvData) => api.post('/customers/import-csv', { csvData }),
  bulkDelete: (customerIds) => api.post('/customers/bulk-delete', { customerIds }),
  bulkAddToSubmission: (customerIds, submissionId) => api.post('/customers/bulk-add-to-submission', { customerIds, submissionId }),
  deleteAll: () => api.post('/customers/delete-all')
};

export const submissions = {
  list: (params) => api.get('/submissions', { params }),
  get: (id) => api.get(`/submissions/${id}`),
  create: (data) => api.post('/submissions', data),
  update: (id, data) => api.put(`/submissions/${id}`, data),
  delete: (id) => api.delete(`/submissions/${id}`),
  refresh: (id) => api.post(`/submissions/${id}/refresh`),
  refreshAll: () => api.post('/psa/refresh-all'),
  assignCustomer: (id, customerId) => api.put(`/submissions/${id}`, { customer_id: customerId }),
  addCustomer: (id, data) => api.post(`/submissions/${id}/customers`, data),
  removeCustomer: (id, customerId) => api.delete(`/submissions/${id}/customers/${customerId}`),
  uploadImage: (id, formData) =>
    api.post(`/submissions/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  importCSV: (id, csvData) => api.post(`/submissions/${id}/import-csv`, { csvData }),
  fixShippedStatus: () => api.post('/submissions/fix-shipped-status'),
  verifyPickupCode: (data) => api.post('/submissions/verify-pickup-code', data)
};

export const cards = {
  list: (params) => api.get('/cards', { params }),
  get: (id) => api.get(`/cards/${id}`),
  create: (data) => api.post('/cards', data),
  update: (id, data) => api.patch(`/cards/${id}`, data),
  delete: (id) => api.delete(`/cards/${id}`),
  lookupCert: (id) => api.post(`/cards/${id}/lookup-cert`),
  uploadImages: (id, formData) =>
    api.post(`/cards/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  deleteImage: (id, imageIndex) => api.delete(`/cards/${id}/images/${imageIndex}`),
  bulkAssign: (csvData, submissionId) => api.post('/cards/bulk-assign', { csvData, submissionId }),
  autoDetectSports: (submissionId) => api.post('/cards/auto-detect-sports', { submissionId }),
  lookupPrice: (id, force = false) => api.post(`/cards/${id}/lookup-price?force=${force}`),
  getComps: (id) => api.get(`/cards/${id}/comps`)
};

export const psa = {
  testConnection: () => api.get('/psa/test'),
  refreshAll: () => api.post('/psa/refresh-all'),
  sendWeeklyUpdate: (email) => api.post('/psa/send-weekly-update', { email }),
};

export const portal = {
  login: (email, password) => api.post('/portal/login', { email, password }),
  me: () => api.get('/portal/me'),
  submissions: () => api.get('/portal/submissions')
};

export const buyback = {
  list: (params) => api.get('/buyback', { params }),
  get: (id) => api.get(`/buyback/${id}`),
  create: (data) => api.post('/buyback', data),
  stats: () => api.get('/buyback/stats/summary'),
  cancel: (id) => api.patch(`/buyback/${id}/cancel`),
  markPaid: (id, data) => api.patch(`/buyback/${id}/mark-paid`, data),
  delete: (id) => api.delete(`/buyback/${id}`)
};

export const cardImport = {
  uploadCsv: (submissionId, formData) =>
    api.post(`/card-import/upload-csv?submission_id=${submissionId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  downloadTemplate: () => api.get('/card-import/csv-template', { responseType: 'blob' })
};

export const emailTemplates = {
  list: () => api.get('/email-templates'),
  get: (id) => api.get(`/email-templates/${id}`),
  create: (data) => api.post('/email-templates', data),
  update: (id, data) => api.put(`/email-templates/${id}`, data),
  delete: (id) => api.delete(`/email-templates/${id}`),
  preview: (id) => api.post(`/email-templates/${id}/preview`),
  testConfig: (testEmail) => api.post('/email-templates/test-config', { test_email: testEmail }),
  logs: (params) => api.get('/email-templates/logs', { params }),
  createDefaults: () => api.post('/email-setup/create-default-templates'),
  sendBulkStatusUpdate: () => api.post('/email-setup/send-bulk-status-update'),
  sendSubmissionUpdate: (submissionId) => api.post(`/email-setup/send-submission-update/${submissionId}`),
  sendTestSubmissionUpdate: (testEmail, submissionId = null) => api.post('/email-setup/send-test-submission-update', { testEmail, submissionId }),
  // Custom email sender endpoints
  sendToCustomer: (customerId, emailData) => api.post(`/email-sender/customer/${customerId}`, emailData),
  sendToSubmission: (submissionId, emailData) => api.post(`/email-sender/submission/${submissionId}`, emailData),
  sendBulkCustomEmail: (emailData) => api.post('/email-sender/bulk-active', emailData)
};

export const psaImport = {
  importCsv: (csvData) => api.post('/psa-import/import-psa-csv', { csvData }),
  importAndRefresh: (csvData) => api.post('/psa-import/import-and-refresh', { csvData })
};

export const pickup = {
  generateCode: (submissionId) => api.post(`/pickup/generate-code/${submissionId}`),
  verifyPickup: (submissionId, data) => api.post(`/pickup/verify-pickup/${submissionId}`, data),
  getHistory: (submissionId) => api.get(`/pickup/history/${submissionId}`),
  lookupByCode: (pickupCode) => api.get(`/pickup/lookup/${pickupCode}`)
};

export const invoices = {
  preview: (submissionId) => api.get(`/invoices/preview/${submissionId}`),
  generate: (submissionId, data) => api.post(`/invoices/generate/${submissionId}`, data)
};

export const migration = {
  checkInvoiceStatus: () => api.get('/migration/check-invoice-status'),
  runInvoiceMigration: () => api.post('/migration/add-invoice-columns')
};

export default api;