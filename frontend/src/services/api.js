import axios from 'axios';

const apiBase = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api` 
  : '/api';

export const AUTH_STORAGE_KEYS = {
  TOKEN: 'crm_auth_token',
  USER: 'crm_auth_user',
  REMEMBER: 'crm_auth_remember',
};

export const getAuthToken = () => {
  return localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN) || sessionStorage.getItem(AUTH_STORAGE_KEYS.TOKEN) || null;
};

export const setAuthToken = (token, username = '', remember = false) => {
  if (remember) {
    localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(AUTH_STORAGE_KEYS.USER, username);
    localStorage.setItem(AUTH_STORAGE_KEYS.REMEMBER, 'true');
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.USER);
  } else {
    sessionStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, token);
    sessionStorage.setItem(AUTH_STORAGE_KEYS.USER, username);
    localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
    localStorage.removeItem(AUTH_STORAGE_KEYS.REMEMBER);
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
  localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
  localStorage.removeItem(AUTH_STORAGE_KEYS.REMEMBER);
  sessionStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
  sessionStorage.removeItem(AUTH_STORAGE_KEYS.USER);
};

export const getAuthUser = () => {
  return localStorage.getItem(AUTH_STORAGE_KEYS.USER) || sessionStorage.getItem(AUTH_STORAGE_KEYS.USER) || 'Admin';
};

const api = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Attach Authorization Bearer token to every request
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response interceptor for 401 and 429 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new CustomEvent('crm:unauthorized'));
    }
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
    const customErr = new Error(serverMessage);
    customErr.status = error.response?.status;
    customErr.retryAfter = error.response?.headers?.['retry-after'];
    return Promise.reject(customErr);
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
  // Authentication & Access Control
  login: async ({ username, password, rememberDevice = false }) => {
    const res = await api.post('/auth/login', { username, password, rememberDevice });
    if (res.data?.token) {
      setAuthToken(res.data.token, res.data.username || username, rememberDevice);
    }
    return res.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Continue client cleanup even if network fails
    } finally {
      clearAuthToken();
      CRM_CACHE.clear();
      window.dispatchEvent(new CustomEvent('crm:logout'));
    }
  },

  checkAuth: async () => {
    const token = getAuthToken();
    if (!token) return { authenticated: false };
    try {
      const res = await api.get('/auth/check');
      return res.data;
    } catch {
      clearAuthToken();
      return { authenticated: false };
    }
  },

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
