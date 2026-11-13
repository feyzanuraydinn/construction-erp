import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { useAutoCollapse } from './hooks/useAutoCollapse';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SyncProvider, useSync } from './contexts/SyncContext';
import { SyncConflictModal } from './components/SyncConflictModal';
import { DriveReconnectModal } from './components/DriveReconnectModal';
import { CloseConfirmModal } from './components/CloseConfirmModal';
import { DataReviewBanner } from './components/DataReviewBanner';
import { CommandPalette } from './components/ui/CommandPalette';
import { Sidebar } from './components/layout/Sidebar';
import { AppRoutes } from './components/layout/AppRoutes';
import { cn } from './utils/cn';
import { readStoredLanguage } from './i18n';
import { useCreateBackup } from './hooks/useCreateBackup';
import { invalidateCachePattern } from './hooks/useDataCache';
import { useAppVersion } from './hooks/useAppVersion';

const NARROW_WINDOW_MAX_WIDTH = 1279;

const AppContent: React.FC<{ className?: string }> = ({ className }) => {
  const { triggerReload } = useSync();
  const [sidebarCollapsed, setSidebarCollapsed] = useAutoCollapse(NARROW_WINDOW_MAX_WIDTH);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const appVersion = useAppVersion();

  useEffect(
    () => window.electronAPI.app.onDataChanged(() => invalidateCachePattern('dashboard:.*')),
    []
  );

  useEffect(() => {
    window.electronAPI.app
      .setLanguage(readStoredLanguage())
      .catch((error: unknown) => console.error('Language sync error:', error));
  }, []);

  const { createBackup } = useCreateBackup();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyK' || e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyS' || e.key.toLowerCase() === 's')) {
        e.preventDefault();
        void createBackup();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createBackup]);

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className={cn('flex h-screen bg-gray-100 dark:bg-gray-900', className)}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          onOpenSearch={() => setCommandPaletteOpen(true)}
          appVersion={appVersion}
        />

        <main className="flex flex-col flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
          <DataReviewBanner key={triggerReload} className="flex-shrink-0" />
          <AppRoutes />
        </main>

        <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />

        <SyncConflictModal />
        <DriveReconnectModal />
        <CloseConfirmModal />
      </div>
    </HashRouter>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <SyncProvider>
            <AppContent />
          </SyncProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};
