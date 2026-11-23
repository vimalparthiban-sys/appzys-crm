import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Header({ onRefresh, isRefreshing, lastRefreshed, onOpenAddLead }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  // Synchronize navbar input whenever the search URL query param changes
  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchTerm.trim();
    if (query) {
      navigate(`/companies?search=${encodeURIComponent(query)}`);
    } else {
      navigate('/companies');
    }
  };

  return (
    <header className="h-18 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-20 shrink-0">
      {/* Global Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search company, contact, or email..."
          className="w-full pl-11 pr-4 py-2 text-xs sm:text-sm bg-gray-50/80 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all text-crm-dark placeholder-gray-400"
        />
      </form>

      {/* Right Controls: Add Lead & Auto-Refresh Sync */}
      <div className="flex items-center gap-3">
        {/* Primary Add Lead Button (Moved to top navbar) */}
        <button
          onClick={onOpenAddLead}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-crm-primary hover:bg-crm-primary-hover text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Lead</span>
        </button>

        {/* Auto-refresh indicator & trigger */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Auto-refreshes every 5 mins. Click to refresh now."
          className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-crm-primary px-3.5 py-2 rounded-xl border border-gray-200 hover:border-crm-light bg-white transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-crm-primary' : ''}`} />
          <span className="hidden sm:inline">
            {isRefreshing ? 'Refreshing...' : `Sync: ${lastRefreshed || 'Just now'}`}
          </span>
        </button>
      </div>
    </header>
  );
}
