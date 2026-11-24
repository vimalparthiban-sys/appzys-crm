import React, { useState } from 'react';
import { 
  Users, 
  Send, 
  Calendar, 
  AlertTriangle, 
  HeartHandshake, 
  Trophy, 
  Info, 
  MoreHorizontal, 
  ChevronRight, 
  Clock, 
  Building,
  AlertCircle,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard({ data, onOpenAddLead, error, onRetry }) {
  const navigate = useNavigate();
  const [followUpTab, setFollowUpTab] = useState('TODAY');

  // Stats config mapped from database DTO
  const stats = [
    { label: 'Total Leads', value: data?.totalLeads ?? 0, icon: Users, color: 'text-purple-600 bg-purple-50', change: data?.totalLeadsChange || '+12%', filter: null },
    { label: 'Contacted', value: (data?.contacted ?? data?.contactedLeads) ?? 0, icon: Send, color: 'text-sky-600 bg-sky-50', change: data?.contactedChange || '+18%', filter: 'CONTACTED' },
    { label: 'Follow-up Today', value: (data?.followUpToday ?? data?.followUpsToday) ?? 0, icon: Calendar, color: 'text-amber-600 bg-amber-50', urgency: 'TODAY' },
    { label: 'Overdue', value: (data?.overdue ?? data?.overdueTasks) ?? 0, icon: AlertTriangle, color: 'text-rose-600 bg-rose-50', urgency: 'OVERDUE' },
    { label: 'Interested', value: (data?.interested ?? data?.interestedLeads) ?? 0, icon: HeartHandshake, color: 'text-emerald-600 bg-emerald-50', filter: 'INTERESTED' },
    { label: 'Converted', value: (data?.converted ?? data?.convertedClients) ?? 0, icon: Trophy, color: 'text-green-600 bg-green-50', filter: 'CONVERTED' },
  ];

  // Pipeline stage cards mapping dynamically from database DTO breakdown (All 8 Pipeline Statuses)
  const pb = data?.pipelineBreakdown || {};
  const pipelineStages = [
    { label: 'Found', count: pb['FOUND'] ?? 0, color: 'bg-indigo-50/70 text-indigo-700 border-indigo-100 hover:border-indigo-300', key: 'FOUND' },
    { label: 'Contacted', count: pb['CONTACTED'] ?? 0, color: 'bg-sky-50/70 text-sky-700 border-sky-100 hover:border-sky-300', key: 'CONTACTED' },
    { label: 'Replied', count: pb['REPLY_RECEIVED'] ?? 0, color: 'bg-purple-50/70 text-purple-700 border-purple-100 hover:border-purple-300', key: 'REPLY_RECEIVED' },
    { label: 'Interested', count: pb['INTERESTED'] ?? 0, color: 'bg-teal-50/70 text-teal-700 border-teal-100 hover:border-teal-300', key: 'INTERESTED' },
    { label: 'Meeting', count: pb['MEETING'] ?? 0, color: 'bg-cyan-50/70 text-cyan-700 border-cyan-100 hover:border-cyan-300', key: 'MEETING' },
    { label: 'Converted', count: pb['CONVERTED'] ?? 0, color: 'bg-emerald-50/70 text-emerald-700 border-emerald-100 hover:border-emerald-300', key: 'CONVERTED' },
    { label: 'No Reply', count: pb['NO_REPLY'] ?? 0, color: 'bg-slate-50/90 text-slate-700 border-slate-200 hover:border-slate-300', key: 'NO_REPLY' },
    { label: 'Rejected', count: pb['REJECTED'] ?? 0, color: 'bg-rose-50/90 text-rose-700 border-rose-200 hover:border-rose-300', key: 'REJECTED' },
  ];

  // Follow-up tab selections
  const followUpTasks = 
    followUpTab === 'TODAY' 
      ? (data?.todayFollowUps || []) 
      : followUpTab === 'OVERDUE' 
        ? (data?.overdueFollowUps || []) 
        : (data?.upcomingFollowUps || []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Backend Disconnection Banner */}
      {error && (
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Backend Connection Notice: </span>
              <span>{error}</span>
            </div>
          </div>
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-all shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Sync</span>
          </button>
        </div>
      )}

      {/* Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-crm-dark flex items-center gap-2">
            Good morning! 👋
          </h2>
          <p className="text-xs sm:text-sm text-crm-muted mt-0.5 sm:mt-1">
            Here's your client acquisition overview.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards: Responsive 2-Column Grid on Mobile, 3 on Tablet, 6 on Desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {stats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              onClick={() => {
                if (item.urgency) navigate(`/follow-ups?tab=${item.urgency}`);
                else if (item.filter) navigate(`/companies?status=${item.filter}`);
              }}
              className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 shadow-soft hover:shadow-card hover:-translate-y-0.5 cursor-pointer transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {item.change && (
                  <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 flex items-center">
                    {item.change}
                  </span>
                )}
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-medium text-crm-muted truncate">{item.label}</p>
                <h3 className="text-xl sm:text-2xl font-bold text-crm-dark mt-0.5">{item.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline Stage Bar & Sources Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Lead Pipeline */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 shadow-soft">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-crm-dark text-sm sm:text-base">Lead Pipeline</h3>
              <Info className="w-4 h-4 text-gray-400" />
            </div>
            <span className="text-xs font-semibold text-crm-muted">
              Total: {data?.totalLeads ?? 0}
            </span>
          </div>

          {/* Responsive 4-col x 2-row grid on desktop, 2-col on mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {pipelineStages.map((stage) => (
              <div
                key={stage.key}
                onClick={() => navigate(`/companies?status=${stage.key}`)}
                className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border text-center cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all select-none ${stage.color}`}
              >
                <div className="text-xs font-semibold mb-1 truncate">{stage.label}</div>
                <div className="text-xl sm:text-2xl font-black">{stage.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Leads by Source */}
        <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-crm-dark text-sm sm:text-base">Leads by Source</h3>
            <button 
              onClick={() => navigate('/settings')}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Settings"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 my-auto">
            {(!data?.leadsBySource || data.leadsBySource.length === 0) ? (
              <div className="text-xs text-center py-4 text-crm-muted">No sources recorded yet.</div>
            ) : (
              data.leadsBySource.map((src) => (
                <div key={src.platform} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium gap-2">
                    <span className="text-crm-dark truncate">{src.platform}</span>
                    <span className="text-crm-muted font-semibold shrink-0">{src.count} ({src.percentage}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${src.percentage}%`, backgroundColor: src.color || '#6D42D8' }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 mt-2 border-t border-gray-50 text-center">
            <span className="text-[11px] sm:text-xs text-crm-muted">Sources auto-normalized & deduplicated</span>
          </div>
        </div>
      </div>

      {/* Follow-up Tasks & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Follow-up Tasks Panel */}
        <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 shadow-soft flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-crm-dark text-sm sm:text-base">Follow-up Tasks</h3>
            <button
              onClick={() => navigate('/follow-ups')}
              className="text-xs font-semibold text-crm-primary hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Follow-up Tabs: Responsive wrap or flex */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100 rounded-xl mb-4 w-full sm:w-fit">
            <button
              onClick={() => setFollowUpTab('TODAY')}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
                followUpTab === 'TODAY'
                  ? 'bg-crm-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-crm-dark'
              }`}
            >
              Today ({data?.todayFollowUps?.length ?? 0})
            </button>
            <button
              onClick={() => setFollowUpTab('OVERDUE')}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
                followUpTab === 'OVERDUE'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-crm-dark'
              }`}
            >
              Overdue ({data?.overdueFollowUps?.length ?? 0})
            </button>
            <button
              onClick={() => setFollowUpTab('UPCOMING')}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
                followUpTab === 'UPCOMING'
                  ? 'bg-crm-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-crm-dark'
              }`}
            >
              Upcoming ({data?.upcomingFollowUps?.length ?? 0})
            </button>
          </div>

          {/* Tasks List */}
          <div className="space-y-2 flex-1 overflow-y-auto">
            {followUpTasks.length === 0 ? (
              <div className="text-center py-8 text-crm-muted text-xs">No follow-ups in this queue.</div>
            ) : (
              followUpTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/companies/${task.companyId || 1}`)}
                  className="p-3 sm:p-3.5 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/20 cursor-pointer transition-all flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-crm-primary flex items-center justify-center shrink-0">
                      <Building className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-crm-dark truncate">{task.companyName || 'Lead Record'}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{task.reason || 'General check-in'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className="text-[11px] sm:text-xs text-gray-400 font-medium whitespace-nowrap">
                      {task.scheduledDate || 'Today'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Timeline Panel */}
        <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 shadow-soft flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-crm-dark text-sm sm:text-base">Recent Activity</h3>
            <button
              onClick={() => navigate('/companies')}
              className="text-xs font-semibold text-crm-primary hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 sm:space-y-4 flex-1">
            {(!data?.recentActivities || data.recentActivities.length === 0) ? (
              <div className="text-center py-8 text-crm-muted text-xs">No activity recorded yet.</div>
            ) : (
              data.recentActivities.map((act, i) => (
                <div key={act.id || i} className="flex items-start gap-2.5 sm:gap-3 relative">
                  {i < (data.recentActivities.length - 1) && (
                    <span className="w-0.5 h-10 bg-gray-100 absolute left-4 top-8 -z-0"></span>
                  )}
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-crm-primary flex items-center justify-center shrink-0 z-10">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-crm-dark truncate">{act.title}</h5>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {act.eventTimestamp ? new Date(act.eventTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                      </span>
                    </div>
                    <p className="text-[11px] text-crm-muted mt-0.5 break-words">{act.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
