import React, { Component, ErrorInfo, ReactNode, createContext, useContext } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome, FiDatabase, FiWifi, FiServer } from 'react-icons/fi';
import { Button } from './ui/Button';
import { uiLogger } from '../utils/logger';
import i18n from '../i18n';

/** Error severity levels */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/** Error types for categorization */
export type ErrorType = 'render' | 'network' | 'database' | 'validation' | 'permission' | 'unknown';

/** Error metadata for enhanced error handling */
export interface ErrorMeta {
  type: ErrorType;
  severity: ErrorSeverity;
  recoverable: boolean;
  userMessage: string;
  technicalMessage?: string;
  context?: Record<string, unknown>;
}

/** Enhanced error class with metadata */
export class AppRenderError extends Error {
  meta: ErrorMeta;

  constructor(message: string, meta: Partial<ErrorMeta> = {}) {
    super(message);
    this.name = 'AppRenderError';
    this.meta = {
      type: meta.type || 'unknown',
      severity: meta.severity || 'medium',
      recoverable: meta.recoverable ?? true,
      userMessage: meta.userMessage || i18n.t('errorBoundary.unexpectedError'),
      technicalMessage: meta.technicalMessage,
      context: meta.context,
    };
  }
}

/** Error context for error reporting from children */
interface ErrorContextValue {
  reportError: (error: Error, context?: Record<string, unknown>) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextValue>({
  reportError: () => {},
  clearError: () => {},
});

/** Hook to access error reporting functions */
export function useErrorBoundary() {
  return useContext(ErrorContext);
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Component name for logging */
  componentName?: string;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Show technical details in production */
  showDetailsInProduction?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorMeta: ErrorMeta | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorMeta: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Extract metadata if it's an AppRenderError
    const errorMeta = error instanceof AppRenderError
      ? error.meta
      : ErrorBoundary.inferErrorMeta(error);

    return { hasError: true, error, errorMeta };
  }

  /**
   * Infer error metadata from standard errors
   */
  static inferErrorMeta(error: Error): ErrorMeta {
    const message = error.message.toLowerCase();

    // Database errors
    if (message.includes('database') || message.includes('sqlite') || message.includes('sql')) {
      return {
        type: 'database',
        severity: 'high',
        recoverable: true,
        userMessage: i18n.t('errorBoundary.databaseMessage'),
      };
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return {
        type: 'network',
        severity: 'medium',
        recoverable: true,
        userMessage: i18n.t('errorBoundary.networkMessage'),
      };
    }

    // Permission errors
    if (message.includes('permission') || message.includes('access denied')) {
      return {
        type: 'permission',
        severity: 'high',
        recoverable: false,
        userMessage: i18n.t('errorBoundary.permissionMessage'),
      };
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return {
        type: 'validation',
        severity: 'low',
        recoverable: true,
        userMessage: i18n.t('errorBoundary.validationMessage'),
      };
    }

    // Default unknown error
    return {
      type: 'unknown',
      severity: 'medium',
      recoverable: true,
      userMessage: i18n.t('errorBoundary.unexpectedError'),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error with context
    const componentName = this.props.componentName || 'Unknown';
    uiLogger.error(`Error in ${componentName}: ${error.message}`, {
      componentStack: errorInfo.componentStack,
      errorMeta: this.state.errorMeta,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  /**
   * Report error from child components (programmatic)
   */
  reportError = (error: Error, context?: Record<string, unknown>): void => {
    const errorMeta = error instanceof AppRenderError
      ? { ...error.meta, context: { ...error.meta.context, ...context } }
      : { ...ErrorBoundary.inferErrorMeta(error), context };

    this.setState({
      hasError: true,
      error,
      errorMeta,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.hash = '/';
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorMeta: null,
    });
  };

  /**
   * Get icon based on error type
   */
  getErrorIcon(): ReactNode {
    const meta = this.state.errorMeta;
    const iconClass = 'w-10 h-10';

    switch (meta?.type) {
      case 'database':
        return <FiDatabase className={`${iconClass} text-orange-600`} />;
      case 'network':
        return <FiWifi className={`${iconClass} text-blue-600`} />;
      case 'permission':
        return <FiServer className={`${iconClass} text-purple-600`} />;
      default:
        return <FiAlertTriangle className={`${iconClass} text-red-600`} />;
    }
  }

  /**
   * Get background color based on error type
   */
  getIconBackground(): string {
    const meta = this.state.errorMeta;

    switch (meta?.type) {
      case 'database':
        return 'bg-orange-100';
      case 'network':
        return 'bg-blue-100';
      case 'permission':
        return 'bg-purple-100';
      default:
        return 'bg-red-100';
    }
  }

  /**
   * Get title based on error type
   */
  getErrorTitle(): string {
    const meta = this.state.errorMeta;

    switch (meta?.type) {
      case 'database':
        return i18n.t('errorBoundary.databaseError');
      case 'network':
        return i18n.t('errorBoundary.networkError');
      case 'permission':
        return i18n.t('errorBoundary.permissionError');
      case 'validation':
        return i18n.t('errorBoundary.validationError');
      default:
        return i18n.t('errorBoundary.generalError');
    }
  }

  render(): ReactNode {
    const { hasError, error, errorInfo, errorMeta } = this.state;
    const { fallback, showDetailsInProduction } = this.props;

    if (hasError) {
      // Özel fallback varsa onu göster
      if (fallback) {
        return fallback;
      }

      const showDetails = process.env.NODE_ENV === 'development' || showDetailsInProduction;
      const userMessage = errorMeta?.userMessage || i18n.t('errorBoundary.unexpectedError');
      const isRecoverable = errorMeta?.recoverable ?? true;

      // Varsayılan hata ekranı
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
            {/* Hata ikonu */}
            <div className={`w-20 h-20 ${this.getIconBackground()} rounded-full flex items-center justify-center mx-auto mb-6`}>
              {this.getErrorIcon()}
            </div>

            {/* Başlık */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{this.getErrorTitle()}</h1>
            <p className="text-gray-500 mb-6">{userMessage}</p>

            {/* Severity badge */}
            {errorMeta && (
              <div className="flex justify-center mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    errorMeta.severity === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : errorMeta.severity === 'high'
                        ? 'bg-orange-100 text-orange-800'
                        : errorMeta.severity === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {errorMeta.severity === 'critical'
                    ? i18n.t('errorBoundary.severityCritical')
                    : errorMeta.severity === 'high'
                      ? i18n.t('errorBoundary.severityHigh')
                      : errorMeta.severity === 'medium'
                        ? i18n.t('errorBoundary.severityMedium')
                        : i18n.t('errorBoundary.severityLow')}
                </span>
              </div>
            )}

            {/* Hata detayları (geliştirme modu için) */}
            {showDetails && error && (
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
                {errorMeta?.context && (
                  <details className="text-xs text-gray-500 mt-2">
                    <summary className="cursor-pointer hover:text-gray-700 mb-2">
                      {i18n.t('errorBoundary.errorContext')}
                    </summary>
                    <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                      {JSON.stringify(errorMeta.context, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Butonlar */}
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" icon={FiHome} onClick={this.handleGoHome}>
                {i18n.t('errorBoundary.homePage')}
              </Button>
              <Button icon={FiRefreshCw} onClick={this.handleReload}>
                {i18n.t('errorBoundary.refreshPage')}
              </Button>
            </div>

            {/* Retry button - only for recoverable errors */}
            {isRecoverable && (
              <Button variant="ghost" size="sm" onClick={this.handleReset} className="mt-4 underline">
                {i18n.t('errorBoundary.retry')}
              </Button>
            )}
          </div>
        </div>
      );
    }

    // Provide error context to children
    const contextValue: ErrorContextValue = {
      reportError: this.reportError,
      clearError: this.handleReset,
    };

    return (
      <ErrorContext.Provider value={contextValue}>
        {this.props.children}
      </ErrorContext.Provider>
    );
  }
}

/**
 * Page-level error boundary with compact UI
 */
export function PageErrorBoundary({ children, pageName }: { children: ReactNode; pageName?: string }) {
  return (
    <ErrorBoundary
      componentName={pageName || 'Page'}
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <FiAlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {i18n.t('errorBoundary.pageLoadError')}
          </h2>
          <p className="text-gray-500 mb-4">
            {i18n.t('errorBoundary.pageLoadFailed', { page: pageName || i18n.t('errorBoundary.thisPage') })}
          </p>
          <Button icon={FiRefreshCw} onClick={() => window.location.reload()}>
            {i18n.t('errorBoundary.refreshPage')}
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Component-level error boundary with inline UI
 */
export function ComponentErrorBoundary({
  children,
  componentName,
  fallback,
}: {
  children: ReactNode;
  componentName?: string;
  fallback?: ReactNode;
}) {
  return (
    <ErrorBoundary
      componentName={componentName || 'Component'}
      fallback={
        fallback || (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <FiAlertTriangle className="w-5 h-5" />
              <span className="font-medium">{i18n.t('errorBoundary.componentLoadFailed')}</span>
            </div>
            <p className="mt-1 text-sm text-red-600">
              {i18n.t('errorBoundary.componentError', { component: componentName || i18n.t('errorBoundary.thisPage') })}
            </p>
          </div>
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
