import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Target, 
  RefreshCw, 
  AlertCircle,
  Users,
  Calendar,
  Layers,
  Phone,
  Mail,
  MessageSquare,
  Video,
  CornerDownLeft,
  FileText,
  Filter,
  CheckCircle2,
  Building2,
  ChevronRight
} from 'lucide-react';
import { CRM_API } from '../services/api';

const DATE_FILTERS = [
  { key: 'ALL', label: 'All Time' },
  { key: '7_DAYS', label: 'Last 7 Days' },
  { key: '30_DAYS', label: 'Last 30 Days' },
  { key: 'THIS_MONTH', label: 'This Month' },
  { key: 'THIS_YEAR', label: 'This Year' },
  { key: 'CUSTOM', label: 'Custom Range' },
];

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [appliedCustom, setAppliedCustom] = useState(false);

  const fetchReports = async (filterToUse = activeFilter, startToUse = customStart, endToUse = customEnd) => {
    setLoading(true);
    setError(null);
    try {
      const params = { filter: filterToUse };
      if (filterToUse === 'CUSTOM') {
        if (startToUse) params.startDate = startToUse;
        if (endToUse) params.endDate = endToUse;
      }
      const summary = await CRM_API.getReportsSummary(params);
      setData(summary);
    } catch (err) {
      console.error('Reports fetch failed:', err);
      setError(err.message || 'Failed to load report analytics from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeFilter !== 'CUSTOM') {
      fetchReports(activeFilter);
    }
  }, [activeFilter]);

  const handleApplyCustomFilter = (e) => {
    e.preventDefault();
    if (customStart || customEnd) {
      setAppliedCustom(true);
      fetchReports('CUSTOM', customStart, customEnd);
    }
  };

  const getActivityIcon = (iconName) => {
    switch (iconName) {
      case 'Phone': return <Phone className="w-4 h-4 text-emerald-500" />;
      case 'Mail': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'MessageSquare': return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      case 'Video': return <Video className="w-4 h-4 text-purple-500" />;
      case 'CornerDownLeft': return <CornerDownLeft className="w-4 h-4 text-teal-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  // Find max monthly lead count for proportional bar chart
  const maxMonthlyCount = data?.monthlyTrends?.reduce((max, item) => Math.max(max, item.leadCount), 0) || 1;

  return (
    <div className="space-y-7 max-w-6xl mx-auto animate-fadeIn pb-16">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-crm-dark">Reports & Acquisition Analytics</h2>
          <p className="text-xs text-crm-muted mt-1">
            Real-time pipeline progression, conversion metrics, and discovery channel efficiency derived from database
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={() => fetchReports(activeFilter, customStart, customEnd)}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:text-crm-primary hover:border-crm-light shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-crm-primary' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Date Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-soft space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <Filter className="w-3.5 h-3.5 text-crm-primary" />
            <span>Date Range:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setActiveFilter(f.key);
                  if (f.key !== 'CUSTOM') {
                    setAppliedCustom(false);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === f.key
                    ? 'bg-crm-primary text-white shadow-xs'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200/60'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {activeFilter === 'CUSTOM' && (
          <form onSubmit={handleApplyCustomFilter} className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-crm-dark focus:outline-none focus:ring-2 focus:ring-crm-primary/20 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-crm-dark focus:outline-none focus:ring-2 focus:ring-crm-primary/20 text-xs"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-1.5 bg-crm-primary text-white font-semibold rounded-xl hover:bg-opacity-90 transition-opacity shadow-xs"
            >
              Apply Filter
            </button>

            {appliedCustom && data?.startDate && data?.endDate && (
              <span className="text-gray-500 font-medium text-[11px] ml-auto">
                Filtering: <span className="text-crm-dark font-semibold">{data.startDate}</span> to <span className="text-crm-dark font-semibold">{data.endDate}</span>
              </span>
            )}
          </form>
        )}
      </div>

      {/* Loading state */}
      {loading && !data && (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 bg-white rounded-3xl border border-gray-100 shadow-soft">
          <RefreshCw className="w-8 h-8 text-crm-primary animate-spin" />
          <p className="text-xs text-crm-muted font-medium">Computing report metrics from database...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-6 bg-red-50 rounded-2xl border border-red-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-red-900">Failed to Load Reports</h3>
            <p className="text-xs text-red-700 mt-1 max-w-md mx-auto">{error}</p>
          </div>
          <button
            onClick={() => fetchReports(activeFilter, customStart, customEnd)}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors shadow-sm"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* REPORT CONTENT */}
      {data && (
        <>
          {/* SECTION 1: KPI CARDS */}
          <div className="overflow-x-auto flex gap-3 pb-2 scrollbar-none snap-x sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:gap-4">
            {/* Total Leads */}
            <div className="min-w-[200px] sm:min-w-0 shrink-0 sm:shrink snap-start bg-white p-5 rounded-2xl border border-gray-100 shadow-soft">
              <div className="flex items-center justify-between text-xs font-semibold text-crm-muted">
                <span>Total Leads</span>
                <Users className="w-4 h-4 text-crm-primary" />
              </div>
              <h3 className="text-3xl font-bold text-crm-dark mt-2">
                {data.totalUniqueLeads ?? 0}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">
                Unique prospect companies in database
              </p>
            </div>

            {/* Reply Rate */}
            <div className="min-w-[200px] sm:min-w-0 shrink-0 sm:shrink snap-start bg-white p-5 rounded-2xl border border-gray-100 shadow-soft">
              <div className="flex items-center justify-between text-xs font-semibold text-crm-muted">
                <span>Reply Rate</span>
                <TrendingUp className="w-4 h-4 text-sky-500" />
              </div>
              <h3 className="text-3xl font-bold text-crm-dark mt-2">
                {data.replyRate ?? 0}%
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">
                Responses from {data.totalContacted ?? 0} contacted leads
              </p>
            </div>

            {/* Overall Conversion Rate */}
            <div className="min-w-[200px] sm:min-w-0 shrink-0 sm:shrink snap-start bg-white p-5 rounded-2xl border border-gray-100 shadow-soft">
              <div className="flex items-center justify-between text-xs font-semibold text-crm-muted">
                <span>Conversion Rate</span>
                <Target className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-3xl font-bold text-crm-dark mt-2">
                {data.overallConversionRate ?? 0}%
              </h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                {data.totalConvertedCompanies ?? 0} converted / {data.totalUniqueLeads ?? 0} total leads
              </p>
            </div>

            {/* Best Performing Source */}
            <div className="min-w-[200px] sm:min-w-0 shrink-0 sm:shrink snap-start bg-white p-5 rounded-2xl border border-gray-100 shadow-soft">
              <div className="flex items-center justify-between text-xs font-semibold text-crm-muted">
                <span>Best Performing Source</span>
                <PieChart className="w-4 h-4 text-purple-500" />
              </div>
              <h3 className="text-2xl font-bold text-crm-dark mt-2 truncate">
                {data.topPerformingChannel || 'None'}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">
                Highest lead acquisition volume
              </p>
            </div>
          </div>

          {/* SECTION 2: LEAD ACQUISITION FUNNEL */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-crm-dark text-base">Lead Acquisition Funnel</h3>
                <p className="text-xs text-crm-muted mt-0.5">
                  Sequential progression across the 6 primary pipeline stages
                </p>
              </div>
              <span className="text-xs font-semibold text-crm-muted bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                Total Leads: {data.totalUniqueLeads}
              </span>
            </div>

            <div className="space-y-4">
              {(data.funnelStages || []).map((stage, idx) => (
                <div key={stage.stageKey} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-crm-dark">{stage.stageLabel}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {idx > 0 && stage.conversionFromPrevious > 0 && (
                        <span className="text-[11px] text-gray-400 font-normal">
                          {stage.conversionFromPrevious}% from prev
                        </span>
                      )}
                      <span className="text-crm-dark font-bold">
                        {stage.count} leads
                      </span>
                      <span className="text-crm-muted font-normal w-12 text-right">
                        ({stage.percentageOfTotal}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${stage.color || 'bg-crm-primary'}`}
                      style={{ width: `${Math.min(100, Math.max(stage.percentageOfTotal, stage.count > 0 ? 4 : 0))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3 & SECTION 4: SOURCE PERFORMANCE & MONTHLY TREND */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SECTION 3: SOURCE CHANNEL PERFORMANCE */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-crm-dark text-base">Source Channel Performance</h3>
                <p className="text-xs text-crm-muted mt-0.5">
                  Effectiveness and conversion rates by discovery platform
                </p>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-semibold text-[11px] uppercase">
                        <th className="pb-2.5">Source Channel</th>
                        <th className="pb-2.5 text-center">Total Leads</th>
                        <th className="pb-2.5 text-center">Converted</th>
                        <th className="pb-2.5 text-right">Conv. Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-medium">
                      {(data.sourcePerformance || []).length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-6 text-center text-gray-400 italic">
                            No source records available in selected timeframe.
                          </td>
                        </tr>
                      ) : (
                        (data.sourcePerformance || []).map((source) => (
                          <tr key={source.platformName} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 font-semibold text-crm-dark flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-crm-primary"></span>
                              {source.platformName}
                            </td>
                            <td className="py-3 text-center text-gray-600">
                              {source.totalLeads}
                            </td>
                            <td className="py-3 text-center text-emerald-600 font-semibold">
                              {source.convertedLeads}
                            </td>
                            <td className="py-3 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                source.conversionRate > 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {source.conversionRate}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* SECTION 4: MONTHLY LEAD ACQUISITION TREND */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft space-y-4">
              <div>
                <h3 className="font-bold text-crm-dark text-base">Monthly Lead Acquisition Trend</h3>
                <p className="text-xs text-crm-muted mt-0.5">
                  Prospect volume acquired by month using Date Added
                </p>
              </div>

              {(data.monthlyTrends || []).length === 0 ? (
                <div className="py-16 text-center text-gray-400 italic text-xs">
                  No monthly trend records found for the selected timeframe.
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {(data.monthlyTrends || []).map((trend) => {
                    const percentageOfMax = Math.round((trend.leadCount / maxMonthlyCount) * 100);
                    return (
                      <div key={trend.monthKey} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-crm-dark">{trend.monthLabel}</span>
                          <span className="text-crm-primary font-bold">{trend.leadCount} leads</span>
                        </div>
                        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-crm-primary rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentageOfMax, 5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: PIPELINE DISTRIBUTION (ALL 8 STATUSES) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft space-y-4">
            <div>
              <h3 className="font-bold text-crm-dark text-base">Pipeline Status Distribution</h3>
              <p className="text-xs text-crm-muted mt-0.5">
                Current company distribution across all 8 pipeline statuses (including terminal states)
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {(data.pipelineDistribution || []).map((item) => (
                <div key={item.statusKey} className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">{item.statusLabel}</span>
                    <span className="text-[11px] text-gray-400 font-medium">{item.percentage}%</span>
                  </div>
                  <div className="text-2xl font-bold text-crm-dark">{item.count}</div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1.5">
                    <div
                      className={`h-full ${item.badgeColor || 'bg-crm-primary'}`}
                      style={{ width: `${Math.min(100, Math.max(item.percentage, item.count > 0 ? 5 : 0))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 6: OUTREACH ACTIVITY SUMMARY */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft space-y-4">
            <div>
              <h3 className="font-bold text-crm-dark text-base">Outreach Activity Summary</h3>
              <p className="text-xs text-crm-muted mt-0.5">
                Total prospect interactions logged in the selected timeframe
              </p>
            </div>

            <div className="overflow-x-auto flex gap-3 pb-2 scrollbar-none snap-x sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:overflow-visible">
              {(data.activitySummary || []).map((act) => (
                <div
                  key={act.activityType}
                  className="min-w-[125px] sm:min-w-0 shrink-0 sm:shrink snap-start p-4 rounded-xl border border-gray-100 bg-white shadow-2xs hover:border-purple-200 transition-colors text-center space-y-1.5"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center mx-auto">
                    {getActivityIcon(act.iconName)}
                  </div>
                  <div className="text-xl font-bold text-crm-dark">{act.count}</div>
                  <div className="text-[11px] font-semibold text-gray-500 truncate">{act.label}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
