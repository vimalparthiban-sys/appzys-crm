import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Return structured, human-readable error message from server
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

export const CRM_API = {
  // Dashboard Overview
  getDashboard: async () => {
    const res = await api.get('/dashboard/overview');
    return res.data;
  },

  // Reports Analytics Summary with optional date filters
  getReportsSummary: async (params = {}) => {
    const res = await api.get('/reports/summary', { params });
    return res.data;
  },

  // Companies / Leads list with search, status, source, follow-up, and date range filters
  getCompanies: async (params = {}) => {
    const res = await api.get('/companies', { params });
    return res.data;
  },

  getCompanyById: async (id) => {
    const res = await api.get(`/companies/${id}`);
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
    return res.data;
  },

  updateLead: async (id, payload) => {
    const res = await api.put(`/companies/${id}`, payload);
    return res.data;
  },

  updateStatus: async (id, status) => {
    const res = await api.patch(`/companies/${id}/status`, { status });
    return res.data;
  },

  attachSource: async (companyId, payload) => {
    const res = await api.post(`/companies/${companyId}/sources`, payload);
    return res.data;
  },

  scheduleFollowUp: async (companyId, payload) => {
    const res = await api.post(`/companies/${companyId}/follow-ups`, payload);
    return res.data;
  },

  completeFollowUp: async (companyId, followUpId) => {
    const res = await api.patch(`/companies/${companyId}/follow-ups/${followUpId}/complete`);
    return res.data;
  },

  addActivity: async (companyId, payload) => {
    const res = await api.post(`/companies/${companyId}/activities`, payload);
    return res.data;
  },

  updateActivityDescription: async (companyId, activityId, description) => {
    const res = await api.patch(`/companies/${companyId}/activities/${activityId}/description`, { description });
    return res.data;
  },

  // Company Contacts (Person-level CRM)
  getCompanyContacts: async (companyId) => {
    const res = await api.get(`/companies/${companyId}/contacts`);
    return res.data;
  },

  addCompanyContact: async (companyId, payload) => {
    const res = await api.post(`/companies/${companyId}/contacts`, payload);
    return res.data;
  },

  getCompanyContact: async (companyId, contactId) => {
    const res = await api.get(`/companies/${companyId}/contacts/${contactId}`);
    return res.data;
  },

  updateCompanyContact: async (companyId, contactId, payload) => {
    const res = await api.put(`/companies/${companyId}/contacts/${contactId}`, payload);
    return res.data;
  },

  updateContactStatus: async (companyId, contactId, status) => {
    const res = await api.patch(`/companies/${companyId}/contacts/${contactId}/status`, { status });
    return res.data;
  },

  addPersonActivity: async (companyId, contactId, payload) => {
    const res = await api.post(`/companies/${companyId}/contacts/${contactId}/activities`, payload);
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
