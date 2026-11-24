import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Plus, Target, LogOut } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CRM_API } from '../services/api';

export default function Header({ onRefresh, isRefreshing, lastRefreshed, onOpenAddLead, onLogout }) {
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

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out of APPZYS CRM?')) {
      await CRM_API.logout();
      if (onLogout) onLogout();
    }
  };

  return (
    <header className="h-14 sm:h-16 md:h-18 bg-white/95 backdrop-blur-md border-b border-gray-100 px-3 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 flex items-center justify-between sticky top-0 z-30 shrink-0 gap-2 sm:gap-4 shadow-2xs">
      {/* Left: Mobile Brand + Global Search */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md min-w-0">
        {/* Mobile APPZYS brand (hidden on desktop because sidebar has it) */}
        <Link 
          to="/" 
          className="md:hidden flex items-center gap-1.5 shrink-0 group active:scale-95 transition-transform"
          title="APPZYS CRM Home"
        >
          <div className="w-8 h-8 rounded-lg bg-crm-primary flex items-center justify-center shadow-md shadow-purple-900/30 shrink-0">
            <Target className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-sm tracking-tight text-crm-primary">
            APPZYS
          </span>
        </Link>

        {/* Global Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-8 sm:pl-10 pr-2.5 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-50/90 rounded-full border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all text-crm-dark placeholder-gray-400 min-w-[100px]"
          />
        </form>
      </div>

      {/* Right Controls: Add Lead, Auto-Refresh Sync & Logout */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Primary Add Lead Button */}
        <button
          onClick={onOpenAddLead}
          className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-crm-primary hover:bg-crm-primary-hover active:bg-crm-primary-dark text-white text-xs font-bold shadow-md shadow-purple-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          title="Add New Lead"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Add Lead</span>
        </button>

        {/* Auto-refresh indicator & trigger */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Auto-refreshes every 5 mins. Click to refresh now."
          className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-gray-500 hover:text-crm-primary p-2 sm:px-3.5 sm:py-2 rounded-xl border border-gray-200 hover:border-crm-light bg-white transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-crm-primary' : ''}`} />
          <span className="hidden sm:inline">
            {isRefreshing ? 'Refreshing...' : `Sync: ${lastRefreshed || 'Just now'}`}
          </span>
        </button>

        {/* Mobile-only logout button (desktop has sidebar logout) */}
        <button
          onClick={handleLogout}
          title="Log out"
          className="md:hidden p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 bg-white transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
