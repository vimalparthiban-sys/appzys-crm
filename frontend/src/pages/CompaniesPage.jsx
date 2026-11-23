import React, { useState, useEffect } from 'react';
import { 
  LayoutList, 
  Kanban, 
  Plus, 
  ExternalLink, 
  Building2, 
  MoreHorizontal,
  X,
  Filter,
  AlertCircle,
  Calendar,
  User,
  Clock
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CRM_API } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import FollowUpBadge from '../components/FollowUpBadge';

const KANBAN_STAGES = [
  { key: 'FOUND', title: 'Found', headerBg: 'bg-[#4338CA]', isHighlight: false },
  { key: 'CONTACTED', title: 'Contacted', headerBg: 'bg-[#4F46E5]', isHighlight: false },
  { key: 'REPLY_RECEIVED', title: 'Reply Received', headerBg: 'bg-[#6366F1]', isHighlight: false },
  { key: 'INTERESTED', title: 'Interested', headerBg: 'bg-[#0D9488]', isHighlight: true },
  { key: 'MEETING', title: 'Meeting', headerBg: 'bg-[#0891B2]', isHighlight: false },
  { key: 'CONVERTED', title: 'Converted', headerBg: 'bg-[#059669]', isHighlight: false },
  { key: 'NO_REPLY', title: 'No Reply', headerBg: 'bg-[#64748B]', isHighlight: false },
  { key: 'REJECTED', title: 'Rejected', headerBg: 'bg-[#E11D48]', isHighlight: false },
];

export default function CompaniesPage({ onOpenAddLead }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search is driven globally by the top navbar and URL query
  const search = searchParams.get('search') || '';

  // Local page filters state
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [sourceFilter, setSourceFilter] = useState(searchParams.get('source') || 'ALL');
  const [followUpFilter, setFollowUpFilter] = useState(searchParams.get('followUp') || 'ALL');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [sortOrder, setSortOrder] = useState('NEW');
  const [viewMode, setViewMode] = useState('kanban');

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Drag-and-drop state
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CRM_API.getCompanies({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        source: sourceFilter !== 'ALL' ? sourceFilter : undefined,
        followUp: followUpFilter !== 'ALL' ? followUpFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sort: sortOrder,
      });
      setCompanies(data);
    } catch (err) {
      setError(err.message || 'Failed to load companies.');
    } finally {
      setLoading(false);
    }
  };

  // Reactively re-fetch whenever global search, date range, or any filter changes
  useEffect(() => {
    fetchCompanies();
  }, [search, statusFilter, sourceFilter, followUpFilter, startDate, endDate, sortOrder]);

  const clearFilters = () => {
    setStatusFilter('ALL');
    setSourceFilter('ALL');
    setFollowUpFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSortOrder('NEW');
    setSearchParams({}); // Clears global search and URL params completely
  };

  const clearSearchParam = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('search');
    setSearchParams(next);
  };

  const handleDragStart = (e, id) => {
    setDraggedLeadId(id);
    e.dataTransfer.setData('text/plain', String(id));
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    if (dragOverCol !== colKey) {
      setDragOverCol(colKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedLeadId) return;

    // Optimistic UI update
    setCompanies((prev) =>
      prev.map((c) => (c.id === Number(draggedLeadId) ? { ...c, status: targetStatus } : c))
    );

    try {
      await CRM_API.updateStatus(draggedLeadId, targetStatus);
    } catch (err) {
      console.error('Failed to change status in Kanban', err);
      fetchCompanies();
    } finally {
      setDraggedLeadId(null);
    }
  };

  const hasActiveFilters = Boolean(
    search ||
    statusFilter !== 'ALL' ||
    sourceFilter !== 'ALL' ||
    followUpFilter !== 'ALL' ||
    startDate ||
    endDate
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Area with Right-Aligned Table / Kanban View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-crm-dark">Companies / Leads</h2>
          <p className="text-xs text-crm-muted mt-0.5">
            Visualize your pipeline, move deals forward, and track client acquisition
          </p>
        </div>

        {/* Table / Kanban View Switcher (Right-Aligned) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200/60 shadow-2xs">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table' ? 'bg-white text-crm-dark shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'kanban' ? 'bg-white text-crm-dark shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Kanban className="w-4 h-4" />
              <span>Kanban</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar (Clean dropdowns + Date Added range, using global navbar search) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-soft space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mr-1">
              <Filter className="w-3.5 h-3.5 text-crm-primary" />
              <span>Filters:</span>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white font-medium text-crm-dark focus:outline-none focus:border-crm-primary"
            >
              <option value="ALL">All Statuses</option>
              {KANBAN_STAGES.map((s) => (
                <option key={s.key} value={s.key}>{s.title}</option>
              ))}
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white font-medium text-crm-dark focus:outline-none focus:border-crm-primary"
            >
              <option value="ALL">All Sources</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Company Website">Company Website</option>
            </select>

            {/* Follow-up Filter */}
            <select
              value={followUpFilter}
              onChange={(e) => setFollowUpFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white font-medium text-crm-dark focus:outline-none focus:border-crm-primary"
            >
              <option value="ALL">All Follow-ups</option>
              <option value="TODAY">Due Today</option>
              <option value="OVERDUE">Overdue</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="NO_DATE">No Date</option>
              <option value="COMPLETED">Completed</option>
            </select>

            {/* Sorting */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white font-medium text-crm-dark focus:outline-none focus:border-crm-primary"
            >
              <option value="NEW">Newest First</option>
              <option value="OLD">Oldest First</option>
              <option value="NAME_AZ">Company A - Z</option>
              <option value="NAME_ZA">Company Z - A</option>
            </select>
          </div>

          {/* Date Added Range Filter */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-gray-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-crm-primary" />
              <span>Date Added:</span>
            </span>

            <div className="flex items-center gap-1.5">
              <label className="text-gray-400 font-medium">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-crm-dark focus:outline-none focus:border-crm-primary"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-gray-400 font-medium">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-crm-dark focus:outline-none focus:border-crm-primary"
              />
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-2.5 border-t border-gray-100 flex-wrap text-xs">
            <span className="text-gray-400 font-medium">Active filters:</span>

            {/* Global Search chip */}
            {search && (
              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-crm-primary border border-purple-200 flex items-center gap-1 font-semibold">
                Search: "{search}"
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={clearSearchParam} />
              </span>
            )}

            {/* Status chip */}
            {statusFilter !== 'ALL' && (
              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-crm-primary border border-purple-200 flex items-center gap-1 font-semibold">
                Status: {statusFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => setStatusFilter('ALL')} />
              </span>
            )}

            {/* Source chip */}
            {sourceFilter !== 'ALL' && (
              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-crm-primary border border-purple-200 flex items-center gap-1 font-semibold">
                Source: {sourceFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => setSourceFilter('ALL')} />
              </span>
            )}

            {/* Follow-up chip */}
            {followUpFilter !== 'ALL' && (
              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-crm-primary border border-purple-200 flex items-center gap-1 font-semibold">
                Follow-up: {followUpFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => setFollowUpFilter('ALL')} />
              </span>
            )}

            {/* Date From chip */}
            {startDate && (
              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-crm-primary border border-purple-200 flex items-center gap-1 font-semibold">
                From: {startDate}
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => setStartDate('')} />
              </span>
            )}

            {/* Date To chip */}
            {endDate && (
              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-crm-primary border border-purple-200 flex items-center gap-1 font-semibold">
                To: {endDate}
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => setEndDate('')} />
              </span>
            )}

            <button
              onClick={clearFilters}
              className="text-xs text-red-500 hover:text-red-700 font-semibold ml-2 underline"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-xs font-semibold text-red-900">{error}</span>
          </div>
          <button
            onClick={fetchCompanies}
            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' ? (
        <div className="w-full overflow-x-auto pb-8 pt-2 scrollbar-thin">
          <div className="flex gap-5 items-start min-w-max pb-2">
            {KANBAN_STAGES.map((col) => {
              const stageLeads = companies.filter((c) => c.status === col.key);
              const isDropTarget = dragOverCol === col.key;

              return (
                <div
                  key={col.key}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.key)}
                  className={`w-[305px] min-w-[305px] shrink-0 rounded-3xl p-3.5 flex flex-col justify-between transition-all duration-300 min-h-[660px] ${
                    col.isHighlight
                      ? 'bg-[#F0FDF9] ring-2 ring-teal-400/60 shadow-[0_4px_24px_rgba(20,184,166,0.15)] border border-teal-200/50'
                      : 'bg-[#F6F7FB] border border-gray-200/70 shadow-2xs'
                  }`}
                >
                  <div>
                    {/* Header Pill */}
                    <div
                      className={`p-3.5 rounded-2xl text-white flex items-center justify-between shadow-xs mb-3.5 ${col.headerBg}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm tracking-wide">{col.title}</span>
                        <span className="min-w-6 h-6 px-1.5 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center">
                          {stageLeads.length}
                        </span>
                      </div>
                      <button className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Cards Container */}
                    <div className="space-y-3">
                      {stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => navigate(`/companies/${lead.id}`)}
                          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(109,66,216,0.12)] hover:-translate-y-0.5 cursor-grab active:cursor-grabbing transition-all duration-200 group"
                        >
                          {/* Top row: Company icon, name, source tag, and avatar */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-purple-50 text-crm-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform shadow-2xs">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-crm-dark group-hover:text-crm-primary transition-colors truncate">
                                  {lead.name}
                                </h4>

                                <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                                  {lead.primarySource && (
                                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium text-[10px] border border-gray-200/50">
                                      {lead.primarySource}
                                    </span>
                                  )}
                                  {lead.contactsCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold text-[10px] border border-purple-200/60">
                                      {lead.contactsCount} {lead.contactsCount === 1 ? 'Contact' : 'Contacts'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Contact Person Avatar Initial */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 text-crm-primary font-bold text-xs flex items-center justify-center ring-2 ring-white shadow-2xs shrink-0" title={lead.contactPerson || 'Contact'}>
                              {lead.contactPerson 
                                ? lead.contactPerson.charAt(0).toUpperCase() 
                                : (lead.name ? lead.name.charAt(0).toUpperCase() : 'C')}
                            </div>
                          </div>

                          {/* Bottom row: Follow-up badge and contact person */}
                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-50 text-xs">
                            <FollowUpBadge urgency={lead.followUpUrgency} date={lead.nextFollowUpDate} />
                            {lead.contactPerson && (
                              <span className="text-[11px] text-gray-400 truncate max-w-[110px] flex items-center gap-1 font-medium">
                                <User className="w-3 h-3 text-gray-300 shrink-0" />
                                {lead.contactPerson}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Drop target preview indicator */}
                      {isDropTarget && (
                        <div className="min-h-[80px] border-2 border-dashed border-teal-400 bg-teal-50/50 rounded-2xl flex items-center justify-center text-xs font-bold text-teal-700 animate-pulse">
                          Drop to move into {col.title}
                        </div>
                      )}

                      {/* Empty Column Placeholder */}
                      {stageLeads.length === 0 && !isDropTarget && (
                        <div className="py-12 border-2 border-dashed border-gray-200/80 rounded-2xl text-center text-xs text-gray-400 font-medium italic">
                          No leads in {col.title}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add Lead button at column bottom */}
                  <button
                    onClick={onOpenAddLead}
                    className="w-full mt-4 py-2.5 rounded-2xl border border-dashed border-gray-300 bg-white/80 hover:bg-white text-gray-500 hover:text-crm-primary hover:border-crm-primary text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Lead</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Company</th>
                  <th className="py-4 px-6">Source</th>
                  <th className="py-4 px-6">Contact Person</th>
                  <th className="py-4 px-6">Date Added</th>
                  <th className="py-4 px-6">Pipeline Status</th>
                  <th className="py-4 px-6">Follow-up</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-crm-muted">Loading leads...</td>
                  </tr>
                ) : companies.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-crm-muted">
                      No companies found matching the specified criteria.
                    </td>
                  </tr>
                ) : (
                  companies.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/companies/${c.id}`)}
                      className="hover:bg-purple-50/30 cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 text-crm-primary flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-crm-dark group-hover:text-crm-primary transition-colors">
                              {c.name}
                            </span>
                            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <a
                                href={c.officialWebsite}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="hover:underline flex items-center gap-1"
                              >
                                {c.officialWebsite}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {c.primarySource ? (
                          <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 font-medium text-[11px]">
                            {c.primarySource}
                          </span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-crm-dark">
                            {c.contactPerson || <span className="text-gray-400">—</span>}
                          </div>
                          {c.contactsCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold text-[10px] border border-purple-200">
                              {c.contactsCount} {c.contactsCount === 1 ? 'contact' : 'contacts'}
                            </span>
                          )}
                        </div>
                        {c.email && (
                          <div className="text-[11px] text-gray-400">{c.email}</div>
                        )}
                      </td>

                      <td className="py-4 px-6 text-gray-500 font-medium">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                      </td>

                      <td className="py-4 px-6">
                        <StatusBadge status={c.status} />
                      </td>

                      <td className="py-4 px-6">
                        <FollowUpBadge urgency={c.followUpUrgency} date={c.nextFollowUpDate} />
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/companies/${c.id}`);
                          }}
                          className="px-3 py-1 rounded-lg border border-gray-200 text-crm-primary hover:bg-purple-50 font-semibold text-xs transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
