import { Suspense, lazy, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageErrorBoundary } from '../ErrorBoundary';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useSync } from '../../contexts/SyncContext';
import { cn } from '../../utils/cn';

const Dashboard = lazy(() => import('../../pages/Dashboard'));
const Companies = lazy(() => import('../../pages/Companies'));
const CompanyDetail = lazy(() => import('../../pages/CompanyDetail'));
const Projects = lazy(() => import('../../pages/Projects'));
const ProjectDetail = lazy(() => import('../../pages/ProjectDetail'));
const Stock = lazy(() => import('../../pages/Stock'));
const CompanyAccount = lazy(() => import('../../pages/CompanyAccount'));
const Transactions = lazy(() => import('../../pages/Transactions'));
const Analytics = lazy(() => import('../../pages/Analytics'));
const Settings = lazy(() => import('../../pages/Settings'));
const Trash = lazy(() => import('../../pages/Trash'));
const DataReview = lazy(() => import('../../pages/DataReview'));

const ROUTES = [
  { path: '/', labelKey: 'menu.dashboard', Page: Dashboard },
  { path: '/companies', labelKey: 'menu.companies', Page: Companies },
  { path: '/companies/:id', labelKey: 'menu.companies', Page: CompanyDetail },
  { path: '/projects', labelKey: 'menu.projects', Page: Projects },
  { path: '/projects/:id', labelKey: 'menu.projects', Page: ProjectDetail },
  { path: '/stock', labelKey: 'menu.stock', Page: Stock },
  { path: '/company-account', labelKey: 'menu.companyAccount', Page: CompanyAccount },
  { path: '/transactions', labelKey: 'menu.transactions', Page: Transactions },
  { path: '/analytics', labelKey: 'menu.analytics', Page: Analytics },
  { path: '/settings', labelKey: 'menu.settings', Page: Settings },
  { path: '/trash', labelKey: 'menu.trash', Page: Trash },
  { path: '/data-review', labelKey: 'dataReview.title', Page: DataReview },
];

interface RoutePageProps {
  labelKey: string;
  children: ReactNode;
  className?: string;
}

function RoutePage({ labelKey, children, className }: RoutePageProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { triggerReload } = useSync();
  return (
    <PageErrorBoundary
      key={`${pathname}:${triggerReload}`}
      pageName={t(labelKey)}
      className={className}
    >
      {children}
    </PageErrorBoundary>
  );
}

function PageLoader({ className }: { className?: string }) {
  return <LoadingSpinner className={cn('h-full', className)} />;
}

export function AppRoutes({ className }: { className?: string }) {
  return (
    <div className={cn('flex-1 min-h-0', className)}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {ROUTES.map(({ path, labelKey, Page }) => (
            <Route
              key={path}
              path={path}
              element={
                <RoutePage labelKey={labelKey}>
                  <Page />
                </RoutePage>
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
