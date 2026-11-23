import React, { useState } from 'react';
import { 
  Users, 
  Send, 
  Calendar, 
  AlertTriangle, 
  HeartHandshake, 
  Trophy, 
  ChevronRight, 
  Plus, 
  Clock, 
  MoreHorizontal,
  Building,
  Info,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import FollowUpBadge from '../components/FollowUpBadge';

export default function Dashboard({ data, onOpenAddLead, error, onRetry }) {
  const navigate = useNavigate();
  const [followUpTab, setFollowUpTab] = useState('TODAY'); // TODAY, OVERDUE, UPCOMING

  const stats = [
    { label: 'Total Leads', value: data?.totalLeads ?? 0, change: data?.totalLeadsChange || '+12%', icon: Users, color: 'text-purple-600 bg-purple-50', filter: 'ALL' },
    { label: 'Contacted', value: data?.contacted ?? 0, change: data?.contactedChange || '+18%', icon: Send, color: 'text-sky-600 bg-sky-50', filter: 'CONTACTED' },
    { label: 'Follow-up Today', value: data?.followUpToday ?? 0, icon: Calendar, color: 'text-amber-600 bg-amber-50', urgency: 'TODAY' },
    { label: 'Overdue', value: data?.overdue ?? 0, icon: AlertTriangle, color: 'text-red-600 bg-red-50', urgency: 'OVERDUE' },
    { label: 'Interested', value: data?.interested ?? 0, icon: HeartHandshake, color: 'text-emerald-600 bg-emerald-50', filter: 'INTERESTED' },
    { label: 'Converted', value: data?.converted ?? 0, icon: Trophy, color: 'text-green-600 bg-green-50', filter: 'CONVERTED' },
  ];

  const pipelineStages = [
    { key: 'FOUND', label: 'Found', count: data?.pipelineBreakdown?.FOUND ?? 0, color: 'bg-blue-50 text-blue-800' },
    { key: 'CONTACTED', label: 'Contacted', count: data?.pipelineBreakdown?.CONTACTED ?? 0, color: 'bg-sky-50 text-sky-800' },
    { key: 'REPLY_RECEIVED', label: 'Reply Received', count: data?.pipelineBreakdown?.REPLY_RECEIVED ?? 0, color: 'bg-purple-50 text-purple-800' },
    { key: 'INTERESTED', label: 'Interested', count: data?.pipelineBreakdown?.INTERESTED ?? 0, color: 'bg-amber-50 text-amber-800' },
    { key: 'MEETING', label: 'Meeting', count: data?.pipelineBreakdown?.MEETING ?? 0, color: 'bg-teal-50 text-teal-800' },
    { key: 'CONVERTED', label: 'Converted', count: data?.pipelineBreakdown?.CONVERTED ?? 0, color: 'bg-green-100 text-green-900 font-bold' },
  ];

  const followUpTasks = followUpTab === 'TODAY' 
    ? (data?.todayFollowUps || [])
    : followUpTab === 'OVERDUE'
    ? (data?.overdueFollowUps || [])
    : (data?.upcomingFollowUps || []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Error State Banner with Retry (Approved Requirement 7 & 9) */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-red-900">Backend Communication Issue</span>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors shadow-sm shrink-0"
            >
              Retry Sync
            </button>
          )}
        </div>
      )}

      {/* Greeting Banner */}
      <div>
        <h2 className="text-2xl font-bold text-crm-dark flex items-center gap-2">
          Good morning! 👋
        </h2>
        <p className="text-sm text-crm-muted mt-1">
          Here's your client acquisition overview.
        </p>
      </div>

      {/* Summary KPI Cards Grid (Ref 1 & 2) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              onClick={() => {
                if (item.urgency) navigate(`/follow-ups?tab=${item.urgency}`);
                else if (item.filter) navigate(`/companies?status=${item.filter}`);
              }}
              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-soft hover:shadow-card hover:-translate-y-0.5 cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {item.change && (
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center">
                    {item.change}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-crm-muted">{item.label}</p>
              <h3 className="text-2xl font-bold text-crm-dark mt-1">{item.value}</h3>
            </div>
          );
        })}
      </div>

      {/* Pipeline Stage Bar & Sources Chart (Ref 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Pipeline */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-crm-dark">Lead Pipeline</h3>
              <Info className="w-4 h-4 text-gray-400" />
            </div>
            <span className="text-xs font-semibold text-crm-muted">
              Total: {data?.totalLeads ?? 0}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {pipelineStages.map((stage) => (
              <div
                key={stage.key}
                onClick={() => navigate(`/companies?status=${stage.key}`)}
                className={`p-3 rounded-xl border border-gray-100 text-center cursor-pointer hover:shadow-md transition-all ${stage.color}`}
              >
                <div className="text-xs font-semibold mb-1 truncate">{stage.label}</div>
                <div className="text-xl font-bold">{stage.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Leads by Source */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-crm-dark">Leads by Source</h3>
            <button 
              onClick={() => navigate('/settings')}
              className="text-gray-400 hover:text-gray-600"
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
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-crm-dark">{src.platform}</span>
                    <span className="text-crm-muted font-semibold">{src.count} ({src.percentage}%)</span>
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

          <div className="pt-4 border-t border-gray-50 text-center">
            <span className="text-xs text-crm-muted">Sources auto-normalized & deduplicated</span>
          </div>
        </div>
      </div>

      {/* Follow-up Tasks & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follow-up Tasks Panel */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-crm-dark">Follow-up Tasks</h3>
            <button
              onClick={() => navigate('/follow-ups')}
              className="text-xs font-semibold text-crm-primary hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Follow-up Tabs */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-4 w-fit">
            <button
              onClick={() => setFollowUpTab('TODAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                followUpTab === 'TODAY'
                  ? 'bg-crm-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-crm-dark'
              }`}
            >
              Today ({data?.todayFollowUps?.length ?? 0})
            </button>
            <button
              onClick={() => setFollowUpTab('OVERDUE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                followUpTab === 'OVERDUE'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-crm-dark'
              }`}
            >
              Overdue ({data?.overdueFollowUps?.length ?? 0})
            </button>
            <button
              onClick={() => setFollowUpTab('UPCOMING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                followUpTab === 'UPCOMING'
                  ? 'bg-crm-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-crm-dark'
              }`}
            >
              Upcoming ({data?.upcomingFollowUps?.length ?? 0})
            </button>
          </div>

          {/* Tasks List */}
          <div className="space-y-2.5 flex-1 overflow-y-auto">
            {followUpTasks.length === 0 ? (
              <div className="text-center py-8 text-crm-muted text-xs">No follow-ups in this queue.</div>
            ) : (
              followUpTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/companies/${task.companyId || 1}`)}
                  className="p-3.5 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/20 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-crm-primary flex items-center justify-center shrink-0">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-crm-dark">{task.companyName || 'Lead Record'}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">{task.reason || 'General check-in'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">
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
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-crm-dark">Recent Activity</h3>
            <button
              onClick={() => navigate('/companies')}
              className="text-xs font-semibold text-crm-primary hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 flex-1">
            {(!data?.recentActivities || data.recentActivities.length === 0) ? (
              <div className="text-center py-8 text-crm-muted text-xs">No activity recorded yet.</div>
            ) : (
              data.recentActivities.map((act, i) => (
                <div key={act.id || i} className="flex items-start gap-3 relative">
                  {i < (data.recentActivities.length - 1) && (
                    <span className="w-0.5 h-10 bg-gray-100 absolute left-4 top-8 -z-0"></span>
                  )}
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-crm-primary flex items-center justify-center shrink-0 z-10">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-crm-dark truncate">{act.title}</h5>
                      <span className="text-[10px] text-gray-400">
                        {act.eventTimestamp ? new Date(act.eventTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                      </span>
                    </div>
                    <p className="text-[11px] text-crm-muted mt-0.5">{act.description}</p>
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
