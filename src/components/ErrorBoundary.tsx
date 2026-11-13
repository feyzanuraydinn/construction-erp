import { Component, ErrorInfo, ReactNode } from 'react';
import { uiLogger } from '../utils/logger';
import { ErrorFallback, PageErrorFallback, type ErrorMeta } from './ErrorFallback';

const ERROR_RULES: { pattern: RegExp; meta: ErrorMeta }[] = [
  {
    pattern: /database|sqlite|sql/,
    meta: {
      type: 'database',
      severity: 'high',
      recoverable: true,
      messageKey: 'errorBoundary.databaseMessage',
    },
  },
  {
    pattern: /network|fetch|connection/,
    meta: {
      type: 'network',
      severity: 'medium',
      recoverable: true,
      messageKey: 'errorBoundary.networkMessage',
    },
  },
  {
    pattern: /permission|access denied/,
    meta: {
      type: 'permission',
      severity: 'high',
      recoverable: false,
      messageKey: 'errorBoundary.permissionMessage',
    },
  },
  {
    pattern: /validation|invalid/,
    meta: {
      type: 'validation',
      severity: 'low',
      recoverable: true,
      messageKey: 'errorBoundary.validationMessage',
    },
  },
];

const UNKNOWN_ERROR: ErrorMeta = {
  type: 'unknown',
  severity: 'medium',
  recoverable: true,
  messageKey: 'errorBoundary.unexpectedError',
};

function inferErrorMeta(error: Error): ErrorMeta {
  const message = error.message.toLowerCase();
  return ERROR_RULES.find((rule) => rule.pattern.test(message))?.meta ?? UNKNOWN_ERROR;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  className?: string;
}

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    uiLogger.error(`Error in ${this.props.componentName || 'Unknown'}: ${error.message}`, {
      componentStack: errorInfo.componentStack,
      errorMeta: inferErrorMeta(error),
    });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.hash = '/';
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({ error: null, errorInfo: null });
  };

  render(): ReactNode {
    const { error, errorInfo } = this.state;
    const { fallback, className } = this.props;

    if (!error) return this.props.children;
    if (fallback) return fallback;

    return (
      <ErrorFallback
        error={error}
        errorInfo={errorInfo}
        meta={inferErrorMeta(error)}
        onGoHome={this.handleGoHome}
        onReload={this.handleReload}
        onReset={this.handleReset}
        className={className}
      />
    );
  }
}

export function PageErrorBoundary({
  children,
  pageName,
  className,
}: {
  children: ReactNode;
  pageName?: string;
  className?: string;
}) {
  return (
    <ErrorBoundary
      componentName={pageName || 'Page'}
      fallback={<PageErrorFallback pageName={pageName} className={className} />}
    >
      {children}
    </ErrorBoundary>
  );
}
