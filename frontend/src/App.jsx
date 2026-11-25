import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import AddLeadModal from './components/AddLeadModal';
import DeviceActivationModal, { AccessRestrictedScreen } from './components/DeviceActivationModal';

// Pages
import Dashboard from './pages/Dashboard';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import FollowUpsPage from './pages/FollowUpsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

import { CRM_API, CRM_CACHE, getAuthToken } from './services/api';

export default function App() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAuthToken());
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(() => CRM_CACHE.get('/dashboard/overview')?.data || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState('');

  // Check if current URL contains a one-time activation invite code
  const [inviteCode, setInviteCode] = useState(() => {
    return new URLSearchParams(window.location.search).get('invite');
  });

  // Fetch / Sync CRM data from Backend
  const loadDashboardData = useCallback(async () => {
    if (!getAuthToken()) {
      setIsAuthenticated(false);
      return;
    }
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const data = await CRM_API.getDashboard();
      setDashboardData(data);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastRefreshed(timeStr);
    } catch (err) {
      console.error('Refresh failed:', err);
      setRefreshError(err.message || 'Unable to communicate with CRM backend server.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Listen for unauthorized events (e.g. Session revoked by admin)
  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setDashboardData(null);
      CRM_CACHE.clear();
    };

    window.addEventListener('crm:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('crm:unauthorized', handleUnauthorized);
    };
  }, []);

  // Initial load when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, loadDashboardData]);

  // 60-Second background auto-sync across all 4 team members
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      loadDashboardData();
    }, 60000); // 60 seconds
    return () => clearInterval(interval);
  }, [isAuthenticated, loadDashboardData]);

  // Tab-focus and event-based revalidation: Re-sync immediately
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleRefresh = () => {
      loadDashboardData();
    };
    window.addEventListener('focus', handleRefresh);
    window.addEventListener('crm:refresh', handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('crm:refresh', handleRefresh);
    };
  }, [isAuthenticated, loadDashboardData]);

  const handleLeadCreated = (newLead) => {
    loadDashboardData();
    navigate(`/companies/${newLead.id}`);
  };

  const handleActivationSuccess = () => {
    // Clean up one-time invite code from browser address bar
    window.history.replaceState({}, '', window.location.pathname);
    setInviteCode(null);
    setIsAuthenticated(true);
    loadDashboardData();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-crm-bg text-crm-dark">
      {/* 1. If an invitation code is present in URL, prompt for 6-digit PIN */}
      {inviteCode && !isAuthenticated && (
        <DeviceActivationModal
          inviteCode={inviteCode}
          onActivationSuccess={handleActivationSuccess}
        />
      )}

      {/* 2. If no invitation code and not authenticated, show static Access Restricted screen */}
      {!inviteCode && !isAuthenticated && (
        <AccessRestrictedScreen />
      )}

      {/* Desktop Left Sidebar (hidden on mobile) */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden relative">
        <Header 
          onRefresh={loadDashboardData} 
          isRefreshing={isRefreshing}
          lastRefreshed={lastRefreshed}
          onOpenAddLead={() => setIsAddLeadOpen(true)}
        />

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto min-w-0">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  data={dashboardData}
                  onOpenAddLead={() => setIsAddLeadOpen(true)}
                  error={refreshError}
                  onRetry={loadDashboardData}
                />
              }
            />
            <Route
              path="/companies"
              element={<CompaniesPage onOpenAddLead={() => setIsAddLeadOpen(true)} />}
            />
            <Route path="/companies/:id" element={<CompanyDetailPage />} />
            <Route path="/follow-ups" element={<FollowUpsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>

        {/* Mobile Fixed Bottom Navigation (hidden on desktop) */}
        <BottomNav />
      </div>

      {/* Global Add Lead Modal */}
      <AddLeadModal
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        onLeadCreated={handleLeadCreated}
      />
    </div>
  );
}
