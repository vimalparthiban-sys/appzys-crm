import axios from 'axios';

const apiBase = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api` 
  : '/api';

const api = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    let serverMessage = 'An unexpected server error occurred.';
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data === 'string') {
        serverMessage = data;
      } else if (typeof data === 'object') {
        serverMessage = data.message || data.error || (data.status ? `Server error (${data.status}): ${data.error || 'Failed request'}` : JSON.stringify(data));
      }
    } else if (error.message) {
      serverMessage = error.message;
    }
    console.error('API Error:', serverMessage);
    return Promise.reject(new Error(serverMessage));
  }
);

// High-speed in-memory client cache with Stale-While-Revalidate support
const memoryCache = new Map();

export const CRM_CACHE = {
  get: (key) => memoryCache.get(key),
  set: (key, data) => memoryCache.set(key, { data, timestamp: Date.now() }),
  delete: (key) => memoryCache.delete(key),
  clear: () => memoryCache.clear(),
  deletePattern: (prefix) => {
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) memoryCache.delete(key);
    }
  }
};

export const CRM_API = {
  // Dashboard Overview
  getDashboard: async () => {
    const res = await api.get('/dashboard/overview');
    CRM_CACHE.set('/dashboard/overview', res.data);
    return res.data;
  },

  // Reports Analytics Summary with optional date filters
  getReportsSummary: async (params = {}) => {
    const cacheKey = `reports_${JSON.stringify(params)}`;
    const res = await api.get('/reports/summary', { params });
    CRM_CACHE.set(cacheKey, res.data);
    return res.data;
  },

  // Companies / Leads list with search, status, source, follow-up, and date range filters
  getCompanies: async (params = {}) => {
    const cacheKey = `companies_${JSON.stringify(params)}`;
    const res = await api.get('/companies', { params });
    CRM_CACHE.set(cacheKey, res.data);
    return res.data;
  },

  getCompanyById: async (id) => {
    const cacheKey = `company_${id}`;
    const res = await api.get(`/companies/${id}`);
    CRM_CACHE.set(cacheKey, res.data);
    return res.data;
  },

  checkDuplicate: async (name, officialWebsite, sourceUrl = '') => {
    const res = await api.post('/companies/check-duplicate', null, {
      params: { name, officialWebsite, sourceUrl }
    });
    return res.data;
  },

  createLead: async (payload) => {
    const res = await api.post('/companies', payload);
    CRM_CACHE.clear(); // invalidate all cached lists and stats
    return res.data;
  },

  updateLead: async (id, payload) => {
    const res = await api.put(`/companies/${id}`, payload);
    CRM_CACHE.clear();
    return res.data;
  },

  updateStatus: async (id, status) => {
    const res = await api.patch(`/companies/${id}/status`, { status });
    CRM_CACHE.clear();
    return res.data;
  },

  attachSource: async (companyId, payload) => {
    const res = await api.post(`/companies/${companyId}/sources`, payload);
    CRM_CACHE.clear();
    return res.data;
  },

  scheduleFollowUp: async (companyId, payload) => {
    const res = await api.post(`/companies/${companyId}/follow-ups`, payload);
    CRM_CACHE.clear();
    return res.data;
  },

  completeFollowUp: async (companyId, followUpId) => {
    const res = await api.patch(`/companies/${companyId}/follow-ups/${followUpId}/complete`);
    CRM_CACHE.clear();
    return res.data;
  },

  addActivity: async (companyId, payload) => {
    const res = await api.post(`/companies/${companyId}/activities`, payload);
    CRM_CACHE.clear();
    return res.data;
  },

  updateActivityDescription: async (companyId, activityId, description) => {
    const res = await api.patch(`/companies/${companyId}/activities/${activityId}/description`, { description });
    CRM_CACHE.clear();
    return res.data;
  },

  // Company Contacts (Person-level CRM)
  getCompanyContacts: async (companyId) => {
    const res = await api.get(`/companies/${companyId}/contacts`);
    return res.data;
  },

  addCompanyContact: async (companyId, payload) => {
    const res = await api.post(`/companies/${companyId}/contacts`, payload);
    CRM_CACHE.clear();
    return res.data;
  },

  getCompanyContact: async (companyId, contactId) => {
    const res = await api.get(`/companies/${companyId}/contacts/${contactId}`);
    return res.data;
  },

  updateCompanyContact: async (companyId, contactId, payload) => {
    const res = await api.put(`/companies/${companyId}/contacts/${contactId}`, payload);
    CRM_CACHE.clear();
    return res.data;
  },

  updateContactStatus: async (companyId, contactId, status) => {
    const res = await api.patch(`/companies/${companyId}/contacts/${contactId}/status`, { status });
    CRM_CACHE.clear();
    return res.data;
  },

  addPersonActivity: async (companyId, contactId, payload) => {
    const res = await api.post(`/companies/${companyId}/contacts/${contactId}/activities`, payload);
    CRM_CACHE.clear();
    return res.data;
  },

  getPersonActivities: async (companyId, contactId) => {
    const res = await api.get(`/companies/${companyId}/contacts/${contactId}/activities`);
    return res.data;
  },

  // Settings: Reusable discovery platforms
  getSettingsSources: async () => {
    const res = await api.get('/settings/sources');
    return res.data;
  },

  addSettingsSource: async (name) => {
    const res = await api.post('/settings/sources', { name });
    return res.data;
  },

  deleteSettingsSource: async (id) => {
    const res = await api.delete(`/settings/sources/${id}`);
    return res.data;
  },
};
