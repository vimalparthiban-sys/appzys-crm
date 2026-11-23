import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, CheckCircle2, ShieldAlert, AlertCircle } from 'lucide-react';
import { CRM_API } from '../services/api';

export default function SettingsPage() {
  const [sources, setSources] = useState([]);
  const [newSourceName, setNewSourceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(null);

  const fetchSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CRM_API.getSettingsSources();
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
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-crm-dark">CRM Settings</h2>
        <p className="text-xs text-crm-muted mt-1">
          Manage reusable platform sources and global shared workspace preferences
        </p>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-purple-50 text-crm-primary text-xs font-semibold border border-purple-200">
          {msg}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between">
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
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft space-y-5">
        <div>
          <h3 className="font-bold text-crm-dark">Reusable Discovery Platforms</h3>
          <p className="text-xs text-crm-muted mt-0.5">
            These platforms appear in the "Source Platform" dropdown when creating leads and attaching links.
          </p>
        </div>

        {/* Add New Source Input */}
        <form onSubmit={handleAddSource} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="e.g. Behance, Twitter/X, Dribbble..."
            value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)}
            className="flex-1 px-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-crm-primary text-white text-xs font-semibold hover:bg-crm-primary-hover shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Platform</span>
          </button>
        </form>

        {/* Sources list chips */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
            Available Platforms ({sources.length})
          </label>

          <div className="flex flex-wrap gap-2">
            {sources.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-crm-dark"
              >
                <span>{s.name}</span>
                {!s.isDefault && (
                  <button
                    onClick={() => handleDeleteSource(s.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4: DATA BEHAVIOR NOTICE */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft space-y-3">
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
