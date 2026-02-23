import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './i18n';
import {
  FiHome,
  FiUsers,
  FiFolder,
  FiPackage,
  FiBriefcase,
  FiList,
  FiBarChart2,
  FiSettings,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
} from 'react-icons/fi';

// Error Boundary, Toast, Theme
import ErrorBoundary, { PageErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CommandPalette, LoadingSpinner } from './components/ui';

// Logo Component
interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = 'w-10 h-10' }) => (
  <img src="./logo.svg" alt="Logo" className={className} />
);

// Lazy loaded pages for better initial load performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Companies = lazy(() => import('./pages/Companies'));
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Stock = lazy(() => import('./pages/Stock'));
const CompanyAccount = lazy(() => import('./pages/CompanyAccount'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const Trash = lazy(() => import('./pages/Trash'));

// Loading fallback component
const PageLoader: React.FC = () => <LoadingSpinner className="h-full" />;

interface MenuItemDef {
  path: string;
  icon: React.ComponentType<{ size?: number }>;
  labelKey: string;
}

const menuItemDefs: MenuItemDef[] = [
  { path: '/', icon: FiHome, labelKey: 'menu.dashboard' },
  { path: '/companies', icon: FiUsers, labelKey: 'menu.companies' },
  { path: '/projects', icon: FiFolder, labelKey: 'menu.projects' },
  { path: '/stock', icon: FiPackage, labelKey: 'menu.stock' },
  { path: '/company-account', icon: FiBriefcase, labelKey: 'menu.companyAccount' },
  { path: '/transactions', icon: FiList, labelKey: 'menu.transactions' },
  { path: '/analytics', icon: FiBarChart2, labelKey: 'menu.analytics' },
];

const bottomMenuItemDefs: MenuItemDef[] = [
  { path: '/settings', icon: FiSettings, labelKey: 'menu.settings' },
  { path: '/trash', icon: FiTrash2, labelKey: 'menu.trash' },
];

// Inner App component that can use Toast context
const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    window.electronAPI.app.getVersion().then(setAppVersion).catch(() => {});
    // Sync renderer language to main process
    const lang = localStorage.getItem('language') || 'tr';
    window.electronAPI.app.setLanguage(lang).catch(() => {});
  }, []);

  const handleBackup = useCallback(async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    try {
      await window.electronAPI.backup.create();
      toast.success(t('app.backupSuccess'));
    } catch (error) {
      toast.error(t('app.backupError'));
      console.error('Backup error:', error);
    } finally {
      setIsBackingUp(false);
    }
  }, [isBackingUp, toast, t]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K - Global search (works with both lowercase and uppercase)
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyK' || e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      // Ctrl+S - Backup database (works with both lowercase and uppercase)
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyS' || e.key.toLowerCase() === 's')) {
        e.preventDefault();
        handleBackup();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBackup]);

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarCollapsed ? 'w-20' : 'w-64'
          } bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col transition-all duration-300 ease-in-out relative flex-shrink-0`}
        >
          {/* Logo */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Logo className="w-10 h-10 text-blue-500" />
              {!sidebarCollapsed && (
                <div className="fade-in">
                  <h1 className="font-bold text-lg">{t('app.title')}</h1>
                  <p className="text-xs text-gray-400">v{appVersion || '...'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-20 bg-slate-800 text-white p-1.5 rounded-full border border-white/20 hover:bg-slate-700 transition-colors z-10"
          >
            {sidebarCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
          </button>

          {/* Search Button */}
          <div className="px-3 pt-4">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={sidebarCollapsed ? t('app.searchShortcut') : ''}
            >
              <FiSearch size={20} />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left text-sm">{t('app.search')}</span>
                  <kbd className="text-xs px-1.5 py-0.5 bg-white/10 rounded">Ctrl+K</kbd>
                </>
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {menuItemDefs.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? 'active bg-white/10' : 'text-gray-300 hover:text-white'}`
                }
                title={sidebarCollapsed ? t(item.labelKey) : ''}
              >
                <item.icon size={20} />
                {!sidebarCollapsed && <span className="fade-in">{t(item.labelKey)}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Bottom Menu */}
          <div className="border-t border-white/10 py-4 px-3 space-y-1">
            {bottomMenuItemDefs.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? 'active bg-white/10' : 'text-gray-300 hover:text-white'}`
                }
                title={sidebarCollapsed ? t(item.labelKey) : ''}
              >
                <item.icon size={20} />
                {!sidebarCollapsed && <span className="fade-in">{t(item.labelKey)}</span>}
              </NavLink>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<PageErrorBoundary pageName="Dashboard"><Dashboard /></PageErrorBoundary>} />
              <Route path="/companies" element={<PageErrorBoundary pageName="Companies"><Companies /></PageErrorBoundary>} />
              <Route path="/companies/:id" element={<PageErrorBoundary pageName="CompanyDetail"><CompanyDetail /></PageErrorBoundary>} />
              <Route path="/projects" element={<PageErrorBoundary pageName="Projects"><Projects /></PageErrorBoundary>} />
              <Route path="/projects/:id" element={<PageErrorBoundary pageName="ProjectDetail"><ProjectDetail /></PageErrorBoundary>} />
              <Route path="/stock" element={<PageErrorBoundary pageName="Stock"><Stock /></PageErrorBoundary>} />
              <Route path="/company-account" element={<PageErrorBoundary pageName="CompanyAccount"><CompanyAccount /></PageErrorBoundary>} />
              <Route path="/transactions" element={<PageErrorBoundary pageName="Transactions"><Transactions /></PageErrorBoundary>} />
              <Route path="/analytics" element={<PageErrorBoundary pageName="Analytics"><Analytics /></PageErrorBoundary>} />
              <Route path="/settings" element={<PageErrorBoundary pageName="Settings"><Settings /></PageErrorBoundary>} />
              <Route path="/trash" element={<PageErrorBoundary pageName="Trash"><Trash /></PageErrorBoundary>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        {/* Command Palette */}
        <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      </div>
    </HashRouter>
  );
};

// Main App wrapper with providers
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
