import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  CalendarClock, 
  BarChart3, 
  Settings, 
  Target,
  Sparkles,
  LogOut,
  UserCheck
} from 'lucide-react';
import { CRM_API, getAuthUser } from '../services/api';

export default function Sidebar({ onLogout }) {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Companies', path: '/companies', icon: Building2 },
    { name: 'Follow-ups', path: '/follow-ups', icon: CalendarClock },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out of APPZYS CRM?')) {
      await CRM_API.logout();
      if (onLogout) onLogout();
    }
  };

  const username = getAuthUser();

  return (
    <aside className="hidden md:flex w-64 h-screen sticky top-0 bg-crm-sidebar text-white flex-col justify-between shrink-0 select-none overflow-y-auto border-r border-white/5 z-30 transition-all duration-300">
      <div>
        {/* Brand Header */}
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-crm-primary flex items-center justify-center shadow-lg shadow-purple-900/50 shrink-0">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wide text-white">APPZYS</h1>
            <p className="text-xs text-purple-300 font-medium tracking-wider">Client CRM</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-crm-primary text-white shadow-md shadow-purple-950/40'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: User Session & Logout */}
      <div className="p-4 space-y-3">
        {/* User Status Bar */}
        <div className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse"></div>
            <span className="font-medium text-gray-200 truncate">{username}</span>
          </div>
          <button
            onClick={handleLogout}
            title="Log out of session"
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>

        {/* Footer Info Pill */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">Client Acquisition</h4>
              <p className="text-[10px] text-gray-400">Track • Follow-up • Convert</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
