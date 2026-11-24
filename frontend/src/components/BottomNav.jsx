import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  CalendarClock, 
  BarChart3, 
  Settings 
} from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Companies', path: '/companies', icon: Building2 },
    { name: 'Follow-ups', path: '/follow-ups', icon: CalendarClock },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden transition-all duration-300"
      style={{ paddingBottom: 'calc(0.35rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="grid grid-cols-5 items-center w-full max-w-lg mx-auto pt-1.5 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Exact match for '/' or startsWith for subroutes
          const isActive = item.path === '/' 
            ? location.pathname === '/' 
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 min-h-[48px] select-none ${
                isActive 
                  ? 'text-crm-primary' 
                  : 'text-gray-400 hover:text-gray-600 active:scale-95'
              }`}
            >
              <div className={`relative flex items-center justify-center p-1 rounded-xl transition-all ${
                isActive ? 'bg-purple-50 text-crm-primary' : ''
              }`}>
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.3]' : 'stroke-[1.8]'}`} />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 truncate max-w-full ${
                isActive ? 'font-bold text-crm-primary' : 'font-medium text-gray-500'
              }`}>
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
