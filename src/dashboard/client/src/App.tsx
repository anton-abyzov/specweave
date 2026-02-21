import { Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ProjectContext, useProjectManager } from './hooks/useProject';
import { SSEProvider } from './contexts/SSEContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { OverviewPage } from './pages/OverviewPage';
import { IncrementsPage } from './pages/IncrementsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CostsPage } from './pages/CostsPage';
import { SyncPage } from './pages/SyncPage';
import { ErrorsPage } from './pages/ErrorsPage';
import { ActivityPage } from './pages/ActivityPage';
import { ConfigPage } from './pages/ConfigPage';
import { PluginsPage } from './pages/PluginsPage';
import { ServicesPage } from './pages/ServicesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ReposPage } from './pages/ReposPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { IncrementDetailPage } from './pages/IncrementDetailPage';

export default function App() {
  const projectManager = useProjectManager();
  const location = useLocation();

  return (
    <ProjectContext.Provider value={projectManager}>
      <SSEProvider>
      <div className="flex min-h-screen bg-gray-950 text-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <ErrorBoundary resetKey={location.pathname}>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/increments" element={<IncrementsPage />} />
              <Route path="/increments/:id" element={<IncrementDetailPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/costs" element={<CostsPage />} />
              <Route path="/sync" element={<SyncPage />} />
              <Route path="/errors" element={<ErrorsPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/config" element={<ConfigPage />} />
              <Route path="/plugins" element={<PluginsPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/repos" element={<ReposPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="*" element={
                <div className="p-6 text-center">
                  <h2 className="text-lg font-semibold text-gray-200 mb-2">Page Not Found</h2>
                  <p className="text-sm text-gray-500">The page you're looking for doesn't exist.</p>
                </div>
              } />
            </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </div>
      </SSEProvider>
    </ProjectContext.Provider>
  );
}
