import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import AddLeadModal from './components/AddLeadModal';

// Pages
import Dashboard from './pages/Dashboard';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import FollowUpsPage from './pages/FollowUpsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

import { CRM_API } from './services/api';

export default function App() {
  const navigate = useNavigate();
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState('');

  // Fetch / Sync CRM data from Backend
  const loadDashboardData = useCallback(async () => {
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

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Periodic auto-refresh every 5 minutes (300 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData();
    }, 300000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const handleLeadCreated = (newLead) => {
    loadDashboardData();
    navigate(`/companies/${newLead.id}`);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-crm-bg text-crm-dark">
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
