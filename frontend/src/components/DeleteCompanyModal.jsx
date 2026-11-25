import React, { useState } from 'react';
import { X, AlertTriangle, Building2, Globe, Trash2, Loader2 } from 'lucide-react';
import { CRM_API } from '../services/api';

export default function DeleteCompanyModal({ isOpen, company, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !company) return null;

  const handleDelete = async () => {
    if (loading) return; // Prevent double-click
    setErrorMsg('');
    setLoading(true);

    try {
      await CRM_API.deleteCompany(company.id);
      // Notify parent to refresh list, trigger global dashboard sync, and show toast
      window.dispatchEvent(new CustomEvent('crm:refresh'));
      onDeleted(company.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete company:', err);
      setErrorMsg(err.message || 'Failed to delete company. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (loading) return;
    setErrorMsg('');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
      onClick={handleCancel}
    >
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Delete Company?</h3>
              <p className="text-xs text-red-600 font-medium">Irreversible action</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="w-8 h-8 rounded-full hover:bg-gray-200/70 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Are you sure you want to delete this company? This action cannot be undone.
          </p>

          {/* Company Details Card */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/70 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Company Name</span>
                <span className="text-sm font-bold text-gray-900 break-words">{company.name}</span>
              </div>
            </div>

            {company.officialWebsite && (
              <div className="flex items-start gap-2.5 pt-2 border-t border-gray-200/60">
                <Globe className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Website</span>
                  <a
                    href={company.officialWebsite}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-crm-primary hover:underline font-medium break-all"
                  >
                    {company.officialWebsite}
                  </a>
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-xs hover:bg-white hover:border-gray-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting Company...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Company</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
