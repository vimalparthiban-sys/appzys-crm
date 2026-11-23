import React, { useState } from 'react';
import { X, AlertTriangle, ExternalLink, PlusCircle, Check } from 'lucide-react';
import { CRM_API } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function AddLeadModal({ isOpen, onClose, onLeadCreated }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    officialWebsite: '',
    sourcePlatform: 'LinkedIn',
    sourceUrl: '',
    contactPerson: '',
    email: '',
    phone: '',
    followUpDate: '',
    followUpReason: 'Initial check-in',
  });

  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null); // stores duplicate match info
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (duplicateWarning) setDuplicateWarning(null); // clear warning when user changes inputs
  };

  const handleSubmit = async (e, force = false) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Check duplicate if not forced
      if (!force) {
        const dupCheck = await CRM_API.checkDuplicate(
          formData.name,
          formData.officialWebsite,
          formData.sourceUrl
        );

        if (dupCheck.duplicateFound && dupCheck.matchingCompanies?.length > 0) {
          setDuplicateWarning(dupCheck);
          setLoading(false);
          return;
        }
      }

      // 2. Proceed with creation
      const created = await CRM_API.createLead({
        ...formData,
        forceCreate: force,
      });

      onLeadCreated(created);
      handleClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to create lead.');
    } finally {
      setLoading(false);
    }
  };

  const handleAttachSource = async (existingCompanyId) => {
    setLoading(true);
    try {
      await CRM_API.attachSource(existingCompanyId, {
        platformName: formData.sourcePlatform,
        sourceUrl: formData.sourceUrl,
        notes: `Added from duplicate discovery modal for ${formData.name}`,
      });
      handleClose();
      navigate(`/companies/${existingCompanyId}`);
    } catch (err) {
      setErrorMsg('Failed to attach source to existing company.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      officialWebsite: '',
      sourcePlatform: 'LinkedIn',
      sourceUrl: '',
      contactPerson: '',
      email: '',
      phone: '',
      followUpDate: '',
      followUpReason: 'Initial check-in',
    });
    setDuplicateWarning(null);
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-crm-bg/60">
          <div>
            <h3 className="text-lg font-bold text-crm-dark">Add New Lead</h3>
            <p className="text-xs text-crm-muted">Add a prospective company and record discovery source</p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Duplicate Decision View */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* DUPLICATE WARNING MODAL STATE */}
          {duplicateWarning ? (
            <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Possible Duplicate Detected!</h4>
                  <p className="text-xs text-amber-800 mt-0.5">{duplicateWarning.reason}</p>
                </div>
              </div>

              {/* Matching companies card */}
              <div className="bg-white p-4 rounded-xl border border-amber-200/60 divide-y divide-gray-100">
                {duplicateWarning.matchingCompanies.map((match) => (
                  <div key={match.id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-crm-dark">{match.name}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-crm-primary font-medium">
                        {match.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Website: {match.officialWebsite}</span>
                      {match.contactPerson && <span>Contact: {match.contactPerson}</span>}
                    </div>

                    {/* Action buttons per duplicate rule (Section 7) */}
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          navigate(`/companies/${match.id}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700 flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Existing Company
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAttachSource(match.id)}
                        className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-xs font-semibold text-crm-primary flex items-center gap-1.5 transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Add Source to Existing
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="text-xs text-gray-500 hover:text-gray-800 font-medium"
                >
                  ← Edit Lead Info
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  {loading ? 'Saving...' : 'Continue as New Company'}
                </button>
              </div>
            </div>
          ) : (
            <form id="addLeadForm" onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
              {/* Required: Company Name */}
              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1.5">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all"
                />
              </div>

              {/* Required: Official Company URL */}
              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1.5">
                  Official Company Website URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  name="officialWebsite"
                  required
                  placeholder="https://example.com"
                  value={formData.officialWebsite}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all"
                />
              </div>

              {/* Source Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-crm-dark mb-1.5">
                    Source Platform <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="sourcePlatform"
                    value={formData.sourcePlatform}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary bg-white transition-all"
                  >
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Company Website">Company Website</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-crm-dark mb-1.5">
                    Source URL <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    name="sourceUrl"
                    placeholder="https://linkedin.com/in/prospect"
                    value={formData.sourceUrl}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all"
                  />
                </div>
              </div>

              {/* Contact Person & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-crm-dark mb-1.5">
                    Contact Person <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    placeholder="John Doe"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-crm-dark mb-1.5">
                    Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all"
                  />
                </div>
              </div>

              {/* Phone & Follow-up Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-crm-dark mb-1.5">
                    Phone <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-crm-dark mb-1.5">
                    Initial Follow-up Date <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    name="followUpDate"
                    value={formData.followUpDate}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        {!duplicateWarning && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="addLeadForm"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-crm-primary hover:bg-crm-primary-hover text-white text-xs font-semibold shadow-md shadow-purple-900/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Checking & Saving...' : 'Save Lead'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
