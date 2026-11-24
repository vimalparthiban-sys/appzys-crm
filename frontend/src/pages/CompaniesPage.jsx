import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CRM_API, CRM_CACHE } from '../services/api';
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

const normalizeSource = (src) => {
  if (!src) return 'None';
  if (src.toLowerCase().includes('website') || src.toLowerCase().includes('company')) return 'Company Website';
  return 'LinkedIn';
};

function KanbanColumn({
  col,
  stageLeads,
  isDropTarget,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDragStart,
  onCardTouchStart,
  touchDraggedLead,
  isTouchDragging,
  navigate,
  onOpenAddLead,
}) {
  const listRef = useRef(null);
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const checkScroll = useCallback(() => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const canScroll = scrollHeight > clientHeight + 15;
    setShowScrollArrow(canScroll);
    if (canScroll) {
      const atBottom = scrollTop + clientHeight >= scrollHeight - 25;
      setIsAtBottom(atBottom);
    }
  }, []);

  useEffect(() => {
    checkScroll();
  }, [stageLeads.length, checkScroll]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => checkScroll());
    ro.observe(el);
    return () => ro.disconnect();
  }, [checkScroll]);

  const handleScrollToggle = (e) => {
    e.stopPropagation();
    if (!listRef.current) return;
    if (isAtBottom) {
      listRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  return (
    <div
      data-kanban-column={col.key}
      onDragOver={(e) => handleDragOver(e, col.key)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, col.key)}
      className={`w-[280px] sm:w-[310px] min-w-[280px] sm:min-w-[310px] shrink-0 rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 flex flex-col h-[620px] sm:h-[680px] relative transition-all duration-300 ${
        col.isHighlight
          ? 'bg-[#F0FDF9] ring-2 ring-teal-400/60 shadow-[0_4px_24px_rgba(20,184,166,0.15)] border border-teal-200/50'
          : 'bg-[#F6F7FB] border border-gray-200/70 shadow-2xs'
      } ${
        isDropTarget ? 'bg-purple-100/70 ring-2 ring-crm-primary border-2 border-dashed border-crm-primary' : ''
      }`}
    >
      {/* 1. Stationary Column Header */}
      <div
        className={`shrink-0 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl text-white flex items-center justify-between shadow-xs mb-3 ${col.headerBg}`}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-white/40"></span>
          <h4 className="font-bold text-xs sm:text-sm tracking-wide">{col.title}</h4>
        </div>
        <span className="text-xs font-black bg-white/20 px-2.5 py-0.5 rounded-full border border-white/20">
          {stageLeads.length}
        </span>
      </div>

      {/* 2. Independently Scrollable Lead Cards List Area */}
      <div
        ref={listRef}
        onScroll={checkScroll}
        className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-3 px-1 py-1"
      >
        {stageLeads.length === 0 ? (
          <div className="h-44 rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-200/80 flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs font-medium text-gray-400">No leads in {col.title}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Drag a lead card here</p>
          </div>
        ) : (
          stageLeads.map((lead) => {
            const isBeingDragged = touchDraggedLead?.id === lead.id;
            return (
              <div
                key={lead.id}
                draggable
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onTouchStart={(e) => onCardTouchStart(e, lead)}
                onClick={() => {
                  if (!isTouchDragging) {
                    navigate(`/companies/${lead.id}`);
                  }
                }}
                className={`bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100/90 shadow-2xs hover:shadow-card hover:border-purple-200 cursor-grab active:cursor-grabbing transition-all select-none space-y-2.5 group ${
                  isBeingDragged ? 'opacity-30 border-dashed border-crm-primary scale-95' : ''
                }`}
                style={{ touchAction: 'pan-y' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-50 text-crm-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-bold text-xs sm:text-sm text-crm-dark group-hover:text-crm-primary transition-colors truncate">
                        {lead.name}
                      </h5>
                      <div className="mt-1 flex flex-wrap gap-1 items-center">
                        {lead.primarySource && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">
                            {normalizeSource(lead.primarySource)}
                          </span>
                        )}
                        {lead.contactsCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200 font-semibold">
                            {lead.contactsCount} {lead.contactsCount === 1 ? 'contact' : 'contacts'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Person */}
                {lead.contactPerson && (
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="truncate">{lead.contactPerson}</span>
                  </div>
                )}

                {/* Footer: Follow-up & Date */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-[10px]">
                  <FollowUpBadge urgency={lead.followUpUrgency} date={lead.nextFollowUpDate} />
                  <span className="text-gray-400 truncate max-w-[100px] flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3 shrink-0" />
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Floating Scroll Navigation Control (Dynamic Down/Up Arrow) */}
      {showScrollArrow && (
        <button
          type="button"
          onClick={handleScrollToggle}
          title={isAtBottom ? `Scroll ${col.title} to top` : `Scroll ${col.title} to bottom`}
          aria-label={isAtBottom ? `Scroll to top` : `Scroll to bottom`}
          className="absolute bottom-[58px] left-1/2 -translate-x-1/2 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white text-crm-primary shadow-lg border border-purple-200 hover:bg-purple-50 active:scale-95 transition-all cursor-pointer animate-fadeIn"
        >
          {isAtBottom ? (
            <ChevronUp className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <ChevronDown className="w-4 h-4 stroke-[2.5]" />
          )}
        </button>
      )}

      {/* 4. Column Quick Add - Fixed at Bottom */}
      <button
        type="button"
        onClick={onOpenAddLead}
        className="shrink-0 w-full mt-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-dashed border-gray-300 bg-white/90 hover:bg-white text-gray-500 hover:text-crm-primary hover:border-crm-primary text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add to {col.title}</span>
      </button>
    </div>
  );
}

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
  const [viewMode, setViewMode] = useState('table'); // Default to table for immediate clarity
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Instant SWR Cache Lookup: Render immediately without showing a blank 1-second loader
  const filterParams = {
    search: search.trim() || undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    source: sourceFilter !== 'ALL' ? sourceFilter : undefined,
    followUp: followUpFilter !== 'ALL' ? followUpFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sort: sortOrder,
  };
  const cacheKey = `companies_${JSON.stringify(filterParams)}`;
  const initialCached = CRM_CACHE.get(cacheKey)?.data;

  const [companies, setCompanies] = useState(() => initialCached || []);
  const [loading, setLoading] = useState(() => !initialCached);
  const [error, setError] = useState(null);

  // Drag-and-drop state (desktop mouse HTML5 + mobile long-press touch)
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [touchDraggedLead, setTouchDraggedLead] = useState(null);
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });

  const boardScrollRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchPosRef = useRef({ x: 0, y: 0 });
  const longPressTimerRef = useRef(null);

  const fetchCompanies = async () => {
    // Only display full-screen loading spinner if we don't have cached data to display
    const cached = CRM_CACHE.get(cacheKey)?.data;
    if (!cached && companies.length === 0) {
      setLoading(true);
    }
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
    if (e && e.preventDefault) e.preventDefault();
    setDragOverCol(null);
    if (!draggedLeadId) return;

    const leadIdToMove = draggedLeadId;
    setDraggedLeadId(null);

    // Optimistic UI update
    setCompanies((prev) =>
      prev.map((c) => (c.id === Number(leadIdToMove) ? { ...c, status: targetStatus } : c))
    );

    try {
      await CRM_API.updateStatus(leadIdToMove, targetStatus);
    } catch (err) {
      console.error('Failed to change status in Kanban', err);
      fetchCompanies();
    }
  };

  const handleTouchDrop = async (leadId, targetStatus) => {
    setDragOverCol(null);
    if (!leadId || !targetStatus) return;

    // Optimistic UI update
    setCompanies((prev) =>
      prev.map((c) => (c.id === Number(leadId) ? { ...c, status: targetStatus } : c))
    );

    try {
      await CRM_API.updateStatus(leadId, targetStatus);
    } catch (err) {
      console.error('Failed to change status in touch Kanban', err);
      fetchCompanies();
    }
  };

  const handleCardTouchStart = (e, lead) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      lead,
    };
    touchPosRef.current = { x: touch.clientX, y: touch.clientY };

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      if (touchStartRef.current) {
        setIsTouchDragging(true);
        setTouchDraggedLead(lead);
        setTouchPos({ x: touchStartRef.current.x, y: touchStartRef.current.y });
        if (navigator.vibrate) {
          try { navigator.vibrate(40); } catch (_) {}
        }
      }
    }, 250);
  };

  useEffect(() => {
    const handleWindowTouchMove = (e) => {
      if (!touchStartRef.current) return;
      const touch = e.touches[0];

      if (!isTouchDragging) {
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        if (Math.hypot(dx, dy) > 8) {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
          touchStartRef.current = null;
        }
        return;
      }

      if (e.cancelable) {
        e.preventDefault();
      }
      const curX = touch.clientX;
      const curY = touch.clientY;
      touchPosRef.current = { x: curX, y: curY };
      setTouchPos({ x: curX, y: curY });

      const elem = document.elementFromPoint(curX, curY);
      const colElem = elem?.closest('[data-kanban-column]');
      if (colElem) {
        const colKey = colElem.getAttribute('data-kanban-column');
        setDragOverCol(colKey);
      } else {
        setDragOverCol(null);
      }

      if (boardScrollRef.current) {
        if (curX < 60) {
          boardScrollRef.current.scrollLeft -= 10;
        } else if (curX > window.innerWidth - 60) {
          boardScrollRef.current.scrollLeft += 10;
        }
      }
    };

    const handleWindowTouchEnd = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (isTouchDragging && touchDraggedLead) {
        const lastX = touchPosRef.current.x;
        const lastY = touchPosRef.current.y;
        const elem = document.elementFromPoint(lastX, lastY);
        const colElem = elem?.closest('[data-kanban-column]');
        if (colElem) {
          const targetStatus = colElem.getAttribute('data-kanban-column');
          if (targetStatus && targetStatus !== touchDraggedLead.status) {
            handleTouchDrop(touchDraggedLead.id, targetStatus);
          }
        }
        setIsTouchDragging(false);
        setTouchDraggedLead(null);
        setDragOverCol(null);
      }

      touchStartRef.current = null;
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [isTouchDragging, touchDraggedLead]);

  const activeFilterCount = [
    statusFilter !== 'ALL',
    sourceFilter !== 'ALL',
    followUpFilter !== 'ALL',
    Boolean(startDate),
    Boolean(endDate)
  ].filter(Boolean).length;

  const hasActiveFilters = Boolean(
    search ||
    statusFilter !== 'ALL' ||
    sourceFilter !== 'ALL' ||
    followUpFilter !== 'ALL' ||
    startDate ||
    endDate
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12">
      {/* Header Area with View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-crm-dark">Companies / Leads</h2>
          <p className="text-xs text-crm-muted mt-0.5">
            Visualize your pipeline, move deals forward, and track client acquisition
          </p>
        </div>

        {/* View Switcher & Add Lead Button */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200/60 shadow-2xs">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table' ? 'bg-white text-crm-dark shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span>List / Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'kanban' ? 'bg-white text-crm-dark shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Kanban className="w-4 h-4" />
              <span>Kanban</span>
            </button>
          </div>

          <button
            onClick={onOpenAddLead}
            className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-crm-primary text-white text-xs font-bold shadow-md shadow-purple-900/20"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Compact expandable drawer on mobile, full bar on desktop) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 shadow-soft space-y-3">
        {/* Mobile Filter Toggle Header (Hidden on desktop) */}
        <div className="flex sm:hidden items-center justify-between gap-2">
          <button
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-crm-dark"
          >
            <Filter className="w-3.5 h-3.5 text-crm-primary" />
            <span>Filter Leads</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-crm-primary text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
            {isMobileFiltersOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-500 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 ml-1" />
            )}
          </button>

          {/* Quick Sort dropdown on mobile */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 bg-white font-medium text-crm-dark focus:outline-none focus:border-crm-primary"
          >
            <option value="NEW">Newest First</option>
            <option value="OLD">Oldest First</option>
            <option value="NAME_AZ">Name A - Z</option>
            <option value="NAME_ZA">Name Z - A</option>
          </select>
        </div>

        {/* Filter Controls (Collapsible on mobile, always visible on sm+) */}
        <div className={`${isMobileFiltersOpen ? 'flex flex-col gap-3 pt-2 border-t border-gray-100' : 'hidden'} sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3`}>
          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-gray-500 mr-1">
              <Filter className="w-3.5 h-3.5 text-crm-primary" />
              <span>Filters:</span>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white font-medium text-crm-dark focus:outline-none focus:border-crm-primary"
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
              className="flex-1 sm:flex-initial px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white font-medium text-crm-dark focus:outline-none focus:border-crm-primary"
            >
              <option value="ALL">All Sources</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Company Website">Company Website</option>
            </select>

            {/* Follow-up Filter */}
            <select
              value={followUpFilter}
              onChange={(e) => setFollowUpFilter(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white font-medium text-crm-dark focus:outline-none focus:border-crm-primary"
            >
              <option value="ALL">All Follow-ups</option>
              <option value="TODAY">Due Today</option>
              <option value="OVERDUE">Overdue</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="NO_DATE">No Date</option>
              <option value="COMPLETED">Completed</option>
            </select>

            {/* Desktop Sorting */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="hidden sm:inline-block px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white font-medium text-crm-dark focus:outline-none focus:border-crm-primary"
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

            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <label className="text-gray-400 font-medium">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-auto px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-crm-dark focus:outline-none focus:border-crm-primary"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <label className="text-gray-400 font-medium">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-auto px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-crm-dark focus:outline-none focus:border-crm-primary"
              />
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 sm:gap-2 pt-2.5 border-t border-gray-100 flex-wrap text-xs">
            <span className="text-gray-400 font-medium text-[11px] sm:text-xs">Active filters:</span>

            {/* Global Search chip */}
            {search && (
              <span className="px-2.5 py-0.5 sm:py-1 rounded-full bg-purple-50 text-crm-primary border border-purple-200 flex items-center gap-1 font-semibold text-[11px] sm:text-xs">
                Search: "{search}"
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={clearSearchParam} />
              </span>
            )}

            {/* Status chip */}
            {statusFilter !== 'ALL' && (
              <span className="px-2.5 py-0.5 sm:py-1 rounded-full bg-purple-50 text-crm-primary border border-purple-200 flex items-center gap-1 font-semibold text-[11px] sm:text-xs">
                Status: {statusFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => setStatusFilter('ALL')} />
              </span>
            )}

            {/* Source chip */}
            {sourceFilter !== 'ALL' && (
              <span className="px-2.5 py-0.5 sm:py-1 rounded-full bg-purple-50 text-crm-primary border border-purple-200 flex items-center gap-1 font-semibold text-[11px] sm:text-xs">
                Source: {sourceFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => setSourceFilter('ALL')} />
              </span>
            )}

            {/* Follow-up chip */}
            {followUpFilter !== 'ALL' && (
              <span className="px-2.5 py-0.5 sm:py-1 rounded-full bg-purple-50 text-crm-primary border border-purple-200 flex items-center gap-1 font-semibold text-[11px] sm:text-xs">
                Follow-up: {followUpFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => setFollowUpFilter('ALL')} />
              </span>
            )}

            {/* Date From chip */}
            {startDate && (
              <span className="px-2.5 py-0.5 sm:py-1 rounded-full bg-purple-50 text-crm-primary border border-purple-200 flex items-center gap-1 font-semibold text-[11px] sm:text-xs">
                From: {startDate}
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => setStartDate('')} />
              </span>
            )}

            {/* Date To chip */}
            {endDate && (
              <span className="px-2.5 py-0.5 sm:py-1 rounded-full bg-purple-50 text-crm-primary border border-purple-200 flex items-center gap-1 font-semibold text-[11px] sm:text-xs">
                To: {endDate}
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => setEndDate('')} />
              </span>
            )}

            <button
              onClick={clearFilters}
              className="text-[11px] sm:text-xs text-red-500 hover:text-red-700 font-semibold ml-1 underline"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl sm:rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between">
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
        <div 
          ref={boardScrollRef}
          className="w-full overflow-x-auto pb-8 pt-2 scrollbar-thin select-none"
        >
          <div className="flex gap-4 sm:gap-5 items-start min-w-max pb-2">
            {KANBAN_STAGES.map((col) => {
              const stageLeads = companies.filter((c) => c.status === col.key);
              const isDropTarget = dragOverCol === col.key;

              return (
                <KanbanColumn
                  key={col.key}
                  col={col}
                  stageLeads={stageLeads}
                  isDropTarget={isDropTarget}
                  handleDragOver={handleDragOver}
                  handleDragLeave={handleDragLeave}
                  handleDrop={handleDrop}
                  handleDragStart={handleDragStart}
                  onCardTouchStart={handleCardTouchStart}
                  touchDraggedLead={touchDraggedLead}
                  isTouchDragging={isTouchDragging}
                  navigate={navigate}
                  onOpenAddLead={onOpenAddLead}
                />
              );
            })}
          </div>

          {/* Mobile Touch Drag Overlay */}
          {isTouchDragging && touchDraggedLead && (
            <div
              className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${touchPos.x}px`,
                top: `${touchPos.y}px`,
                width: '270px',
              }}
            >
              <div className="bg-white p-3.5 rounded-2xl border-2 border-crm-primary shadow-2xl scale-105 rotate-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-crm-primary flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-xs text-crm-dark truncate">
                      {touchDraggedLead.name}
                    </h5>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-bold border border-purple-200">
                        Drop in {dragOverCol || 'a column'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TABLE & MOBILE CARD LIST VIEW */
        <div>
          {/* MOBILE CARD LIST (Visible on < 768px) */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-crm-muted text-xs">
                Loading leads...
              </div>
            ) : companies.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-crm-muted text-xs">
                No companies found matching the specified criteria.
              </div>
            ) : (
              companies.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/companies/${c.id}`)}
                  className="bg-white p-4 rounded-xl border border-gray-100 shadow-soft hover:border-purple-200 transition-all flex flex-col gap-3 cursor-pointer active:scale-[0.99]"
                >
                  {/* Top Row: Company Icon + Name + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-crm-primary flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-crm-dark truncate">{c.name}</h4>
                        {c.officialWebsite && (
                          <a
                            href={c.officialWebsite}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-gray-400 hover:text-crm-primary hover:underline flex items-center gap-1 truncate"
                          >
                            <span>{c.officialWebsite}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={c.status} />
                    </div>
                  </div>

                  {/* Middle Row: Contacts & Source Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-50 text-xs">
                    {c.contactPerson ? (
                      <span className="flex items-center gap-1 text-gray-700 font-medium">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate max-w-[140px]">{c.contactPerson}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 text-[11px]">No contact person</span>
                    )}

                    {c.contactsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold text-[10px] border border-purple-200">
                        {c.contactsCount} {c.contactsCount === 1 ? 'contact' : 'contacts'}
                      </span>
                    )}

                    {c.primarySource && (
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium text-[10px]">
                        {normalizeSource(c.primarySource)}
                      </span>
                    )}
                  </div>

                  {/* Bottom Row: Follow-up urgency + Date Added + View Arrow */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs">
                    <div>
                      <FollowUpBadge urgency={c.followUpUrgency} date={c.nextFollowUpDate} />
                    </div>

                    <div className="flex items-center gap-2 text-gray-400 text-[11px]">
                      <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</span>
                      <div className="flex items-center gap-0.5 font-bold text-crm-primary text-xs">
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP TABLE VIEW (Visible on >= 768px md:block) */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
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
                              {normalizeSource(c.primarySource)}
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
        </div>
      )}
    </div>
  );
}
