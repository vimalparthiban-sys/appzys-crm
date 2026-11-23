import React, { useState, useEffect } from 'react';
import { CalendarClock, CheckCircle2, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CRM_API } from '../services/api';
import FollowUpBadge from '../components/FollowUpBadge';

export default function FollowUpsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'TODAY'; // TODAY, OVERDUE, UPCOMING

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFollowUps = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CRM_API.getCompanies({ followUp: activeTab });
      setCompanies(data);
    } catch (err) {
      setError(err.message || 'Failed to load follow-ups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, [activeTab]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const handleComplete = async (e, companyId, followUpId) => {
    e.stopPropagation();
    try {
      await CRM_API.completeFollowUp(companyId, followUpId);
      fetchFollowUps();
    } catch (err) {
      alert(err.message || 'Failed to complete follow-up.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-crm-dark">Follow-ups Management</h2>
        <p className="text-xs text-crm-muted mt-1">
          Date-focused workspace for today's tasks, overdue outreach, and upcoming touchpoints
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-3 border-b border-gray-200">
        <button
          onClick={() => handleTabChange('TODAY')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'TODAY'
              ? 'border-crm-primary text-crm-primary'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          <span>Follow-up Today</span>
        </button>

        <button
          onClick={() => handleTabChange('OVERDUE')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'OVERDUE'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Overdue Tasks</span>
        </button>

        <button
          onClick={() => handleTabChange('UPCOMING')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'UPCOMING'
              ? 'border-crm-primary text-crm-primary'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Upcoming Schedule</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-xs font-semibold text-red-900">{error}</span>
          </div>
          <button
            onClick={fetchFollowUps}
            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Follow-up List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-crm-muted text-xs">Loading follow-ups...</div>
        ) : companies.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center text-crm-muted space-y-2">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
            <h4 className="text-sm font-bold text-crm-dark">All clear!</h4>
            <p className="text-xs">No pending follow-ups in this queue right now.</p>
          </div>
        ) : (
          companies.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/companies/${c.id}`)}
              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-soft hover:shadow-card hover:border-purple-200 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'OVERDUE' ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-crm-primary'
                }`}>
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-crm-dark group-hover:text-crm-primary transition-colors">
                      {c.name}
                    </h3>
                    <FollowUpBadge urgency={c.followUpUrgency} date={c.nextFollowUpDate} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {c.nextFollowUpReason || 'General follow-up touchpoint'}
                  </p>
                  <div className="text-[11px] text-gray-400 mt-1 flex gap-3">
                    {c.contactPerson && <span>Contact: {c.contactPerson}</span>}
                    <span>Source: {c.primarySource || 'Direct'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Action Button */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => handleComplete(e, c.id, c.activeFollowUpId)}
                  className="px-3.5 py-1.5 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Complete</span>
                </button>
                <div className="p-2 text-gray-400 group-hover:text-crm-primary">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
