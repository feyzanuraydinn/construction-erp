import type { ErrorInfo } from 'react';
import type { IconType } from 'react-icons';
import { FiAlertTriangle, FiRefreshCw, FiHome, FiDatabase, FiWifi, FiServer } from 'react-icons/fi';
import { Button } from './ui/Button';
import { i18n } from '../i18n';
import { cn } from '../utils/cn';

type ErrorSeverity = 'low' | 'medium' | 'high';
type ErrorType = 'network' | 'database' | 'validation' | 'permission' | 'unknown';

export interface ErrorMeta {
  type: ErrorType;
  severity: ErrorSeverity;
  recoverable: boolean;
  messageKey: string;
}

const TYPE_VIEW: Record<
  ErrorType,
  { icon: IconType; iconClass: string; background: string; titleKey: string }
> = {
  database: {
    icon: FiDatabase,
    iconClass: 'text-orange-600',
    background: 'bg-orange-100',
    titleKey: 'errorBoundary.databaseError',
  },
  network: {
    icon: FiWifi,
    iconClass: 'text-blue-600',
    background: 'bg-blue-100',
    titleKey: 'errorBoundary.networkError',
  },
  permission: {
    icon: FiServer,
    iconClass: 'text-purple-600',
    background: 'bg-purple-100',
    titleKey: 'errorBoundary.permissionError',
  },
  validation: {
    icon: FiAlertTriangle,
    iconClass: 'text-red-600',
    background: 'bg-red-100',
    titleKey: 'errorBoundary.validationError',
  },
  unknown: {
    icon: FiAlertTriangle,
    iconClass: 'text-red-600',
    background: 'bg-red-100',
    titleKey: 'errorBoundary.generalError',
  },
};

const SEVERITY_VIEW: Record<ErrorSeverity, { className: string; labelKey: string }> = {
  high: { className: 'bg-orange-100 text-orange-800', labelKey: 'errorBoundary.severityHigh' },
  medium: { className: 'bg-yellow-100 text-yellow-800', labelKey: 'errorBoundary.severityMedium' },
  low: { className: 'bg-gray-100 text-gray-800', labelKey: 'errorBoundary.severityLow' },
};

interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  meta: ErrorMeta;
  onGoHome: () => void;
  onReload: () => void;
  onReset: () => void;
  className?: string;
}

export function ErrorFallback({
  error,
  errorInfo,
  meta,
  onGoHome,
  onReload,
  onReset,
  className,
}: ErrorFallbackProps) {
  const view = TYPE_VIEW[meta.type];
  const severity = SEVERITY_VIEW[meta.severity];
  const Icon = view.icon;

  return (
    <div className={cn('min-h-screen bg-gray-100 flex items-center justify-center p-4', className)}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
        <div
          className={`w-20 h-20 ${view.background} rounded-full flex items-center justify-center mx-auto mb-6`}
        >
          <Icon className={`w-10 h-10 ${view.iconClass}`} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{i18n.t(view.titleKey)}</h1>
        <p className="text-gray-500 mb-6">{i18n.t(meta.messageKey)}</p>

        <div className="flex justify-center mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${severity.className}`}>
            {i18n.t(severity.labelKey)}
          </span>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-mono text-red-600 mb-2">{error.toString()}</p>
            {errorInfo && (
              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer hover:text-gray-700 mb-2">
                  {i18n.t('errorBoundary.stackTrace')}
                </summary>
                <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button variant="secondary" icon={FiHome} onClick={onGoHome}>
            {i18n.t('errorBoundary.homePage')}
          </Button>
          <Button icon={FiRefreshCw} onClick={onReload}>
            {i18n.t('errorBoundary.refreshPage')}
          </Button>
        </div>

        {meta.recoverable && (
          <Button variant="ghost" size="sm" onClick={onReset} className="mt-4 underline">
            {i18n.t('errorBoundary.retry')}
          </Button>
        )}
      </div>
    </div>
  );
}

export function PageErrorFallback({
  pageName,
  className,
}: {
  pageName?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-[400px] p-8', className)}>
      <FiAlertTriangle className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {i18n.t('errorBoundary.pageLoadError')}
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        {i18n.t('errorBoundary.pageLoadFailed', {
          page: pageName || i18n.t('errorBoundary.thisPage'),
        })}
      </p>
      <Button icon={FiRefreshCw} onClick={() => window.location.reload()}>
        {i18n.t('errorBoundary.refreshPage')}
      </Button>
    </div>
  );
}
