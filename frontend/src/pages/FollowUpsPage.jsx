import React, { useState, useEffect } from 'react';
import { CalendarClock, CheckCircle2, AlertCircle, Clock, ChevronRight, CalendarOff, CheckCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CRM_API } from '../services/api';
import FollowUpBadge from '../components/FollowUpBadge';

export default function FollowUpsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'TODAY'; // TODAY, OVERDUE, UPCOMING, NO_DATE, COMPLETED

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

  const tabs = [
    { key: 'TODAY', label: 'Due Today', icon: CalendarClock, activeClass: 'border-crm-primary text-crm-primary' },
    { key: 'OVERDUE', label: 'Overdue', icon: AlertCircle, activeClass: 'border-rose-600 text-rose-600' },
    { key: 'UPCOMING', label: 'Upcoming', icon: Clock, activeClass: 'border-sky-600 text-sky-600' },
    { key: 'NO_DATE', label: 'No Date Set', icon: CalendarOff, activeClass: 'border-amber-600 text-amber-600' },
    { key: 'COMPLETED', label: 'Completed', icon: CheckCheck, activeClass: 'border-emerald-600 text-emerald-600' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto animate-fadeIn pb-12">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-crm-dark">Follow-ups Management</h2>
        <p className="text-xs text-crm-muted mt-0.5 sm:mt-1">
          Date-focused workspace for today's tasks, overdue outreach, and upcoming touchpoints
        </p>
      </div>

      {/* Tabs Switcher: Horizontal scrollable tabs with clear touch targets */}
      <div className="overflow-x-auto flex gap-2 sm:gap-3 border-b border-gray-200 scrollbar-none snap-x whitespace-nowrap pt-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`shrink-0 snap-start pb-2.5 sm:pb-3 px-1 sm:px-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all ${
                isActive
                  ? t.activeClass
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl sm:rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between">
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
      <div className="space-y-2.5 sm:space-y-3">
        {loading ? (
          <div className="py-12 text-center text-crm-muted text-xs">Loading follow-ups...</div>
        ) : companies.length === 0 ? (
          <div className="bg-white p-8 sm:p-12 rounded-2xl border border-gray-100 text-center text-crm-muted space-y-2">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
            <h4 className="text-sm font-bold text-crm-dark">All clear!</h4>
            <p className="text-xs">No pending follow-ups in this queue right now.</p>
          </div>
        ) : (
          companies.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/companies/${c.id}`)}
              className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 shadow-soft hover:shadow-card hover:border-purple-200 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 group active:scale-[0.99]"
            >
              <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'OVERDUE' ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-crm-primary'
                }`}>
                  <CalendarClock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-sm text-crm-dark group-hover:text-crm-primary transition-colors truncate">
                      {c.name}
                    </h3>
                    <FollowUpBadge urgency={c.followUpUrgency} date={c.nextFollowUpDate} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {c.nextFollowUpReason || 'General follow-up touchpoint'}
                  </p>
                  <div className="text-[11px] text-gray-400 mt-1 flex flex-wrap gap-2 sm:gap-3">
                    {c.contactPerson && <span className="truncate">Contact: {c.contactPerson}</span>}
                    <span>Source: {c.primarySource || 'Direct'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-50">
                {activeTab !== 'COMPLETED' && (
                  <button
                    onClick={(e) => handleComplete(e, c.id, c.activeFollowUpId)}
                    className="px-3 py-1.5 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Complete</span>
                  </button>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-crm-primary font-semibold pl-2">
                  <span>Details</span>
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
