import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, CheckCircle2, ShieldAlert, AlertCircle } from 'lucide-react';
import { CRM_API, CRM_CACHE } from '../services/api';

export default function SettingsPage() {
  const cachedSources = CRM_CACHE.get('settings_sources')?.data;
  const [sources, setSources] = useState(() => cachedSources || []);
  const [newSourceName, setNewSourceName] = useState('');
  const [loading, setLoading] = useState(() => !cachedSources);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(null);

  const fetchSources = async () => {
    const cached = CRM_CACHE.get('settings_sources')?.data;
    if (!cached && sources.length === 0) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await CRM_API.getSettingsSources();
      CRM_CACHE.set('settings_sources', data);
      setSources(data);
    } catch (err) {
      setError(err.message || 'Failed to load source settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleAddSource = async (e) => {
    e.preventDefault();
    if (!newSourceName.trim()) return;

    try {
      await CRM_API.addSettingsSource(newSourceName.trim());
      setNewSourceName('');
      setMsg('Source added successfully!');
      setTimeout(() => setMsg(''), 3000);
      fetchSources();
    } catch (err) {
      setMsg(err.message || 'Failed to add source or duplicate found.');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleDeleteSource = async (id) => {
    try {
      await CRM_API.deleteSettingsSource(id);
      fetchSources();
    } catch (err) {
      alert(err.message || 'Failed to delete source.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto animate-fadeIn pb-12">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-crm-dark">CRM Settings</h2>
        <p className="text-xs text-crm-muted mt-0.5 sm:mt-1">
          Manage reusable platform sources and global shared workspace preferences
        </p>
      </div>

      {msg && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-purple-50 text-crm-primary text-xs font-semibold border border-purple-200">
          {msg}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl sm:rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-xs font-semibold text-red-900">{error}</span>
          </div>
          <button
            onClick={fetchSources}
            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* SECTION 16: REUSABLE PLATFORMS MANAGEMENT */}
      <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 shadow-soft space-y-4 sm:space-y-5">
        <div>
          <h3 className="font-bold text-crm-dark text-sm sm:text-base">Reusable Discovery Platforms</h3>
          <p className="text-xs text-crm-muted mt-0.5">
            These platforms appear in the "Source Platform" dropdown when creating leads and attaching links.
          </p>
        </div>

        {/* Add New Source Input */}
        <form onSubmit={handleAddSource} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            required
            placeholder="e.g. Behance, Twitter/X, Dribbble..."
            value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)}
            className="flex-1 px-3 sm:px-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-crm-primary text-white text-xs font-semibold hover:bg-crm-primary-hover shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Platform</span>
          </button>
        </form>

        {/* Sources list chips */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
            Active Discovery Platforms ({sources.filter((s) => s.name === 'LinkedIn' || s.name === 'Company Website').length})
          </label>

          <div className="flex flex-wrap gap-2">
            {(sources.filter((s) => s.name === 'LinkedIn' || s.name === 'Company Website').length > 0
              ? sources.filter((s) => s.name === 'LinkedIn' || s.name === 'Company Website')
              : [
                  { id: 1, name: 'LinkedIn', isDefault: true },
                  { id: 2, name: 'Company Website', isDefault: true },
                ]
            ).map((s) => (
              <div
                key={s.id || s.name}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50/70 border border-purple-200/60 text-xs font-semibold text-crm-dark shadow-2xs"
              >
                <span className="w-2 h-2 rounded-full bg-crm-primary"></span>
                <span>{s.name}</span>
                <span className="text-[10px] text-gray-400 font-normal ml-1">(Primary)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4: DATA BEHAVIOR NOTICE */}
      <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 shadow-soft space-y-3">
        <div className="flex items-center gap-2 text-crm-dark font-bold text-sm">
          <ShieldAlert className="w-4 h-4 text-purple-600" />
          <span>Shared Workspace & Data Behavior</span>
        </div>
        <p className="text-xs text-crm-muted leading-relaxed">
          The APPZYS Client Acquisition CRM is configured as a single shared workspace without per-user authentication. Every modification, new lead, follow-up, or activity is committed to the shared database in real-time.
        </p>
        <div className="p-3 bg-purple-50 rounded-xl text-xs text-purple-900 border border-purple-100">
          <strong>Auto-refresh:</strong> The frontend automatically polls the backend every 5 minutes (300 seconds) to ensure team members' views stay synchronized without manual reloading.
        </div>
      </div>
    </div>
  );
}
