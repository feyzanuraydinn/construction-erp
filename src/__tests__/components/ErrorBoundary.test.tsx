import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
// Initialize i18n before importing ErrorBoundary (which uses i18n.t() at module level)
import '../../i18n';
import ErrorBoundary, {
  AppRenderError,
  PageErrorBoundary,
  ComponentErrorBoundary,
  useErrorBoundary,
} from '../../components/ErrorBoundary';

// Mock uiLogger
vi.mock('../../utils/logger', () => ({
  uiLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Component that throws an error
const ThrowError = ({ error }: { error: Error }) => {
  throw error;
};

// Component that doesn't throw
const SafeComponent = () => <div>Safe Content</div>;

// Suppress console.error for expected errors in tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});

describe('AppRenderError', () => {
  it('should create error with default metadata', () => {
    const error = new AppRenderError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('AppRenderError');
    expect(error.meta.type).toBe('unknown');
    expect(error.meta.severity).toBe('medium');
    expect(error.meta.recoverable).toBe(true);
    expect(error.meta.userMessage).toBe('Beklenmeyen bir hata oluştu.');
  });

  it('should create error with custom metadata', () => {
    const error = new AppRenderError('Database error', {
      type: 'database',
      severity: 'high',
      recoverable: false,
      userMessage: 'Veritabanı hatası oluştu',
    });
    expect(error.meta.type).toBe('database');
    expect(error.meta.severity).toBe('high');
    expect(error.meta.recoverable).toBe(false);
    expect(error.meta.userMessage).toBe('Veritabanı hatası oluştu');
  });

  it('should include context in metadata', () => {
    const error = new AppRenderError('Error with context', {
      context: { userId: 1, action: 'save' },
    });
    expect(error.meta.context).toEqual({ userId: 1, action: 'save' });
  });
});

describe('ErrorBoundary', () => {
  describe('Normal Rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <SafeComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText('Safe Content')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch and display error', () => {
      const testError = new Error('Test error');
      render(
        <ErrorBoundary>
          <ThrowError error={testError} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Bir Hata Oluştu')).toBeInTheDocument();
    });

    it('should display AppRenderError metadata', () => {
      const error = new AppRenderError('Database error', {
        type: 'database',
        userMessage: 'Veritabanı işlemi başarısız',
      });
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Veritabanı Hatası')).toBeInTheDocument();
      expect(screen.getByText('Veritabanı işlemi başarısız')).toBeInTheDocument();
    });

    it('should display custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom Error UI</div>}>
          <ThrowError error={new Error('Test')} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });
  });

  describe('Error Type Inference', () => {
    it('should infer database error type', () => {
      const error = new Error('Database connection failed');
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Veritabanı Hatası')).toBeInTheDocument();
    });

    it('should infer network error type', () => {
      const error = new Error('Network fetch failed');
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Bağlantı Hatası')).toBeInTheDocument();
    });

    it('should infer permission error type', () => {
      const error = new Error('Permission denied');
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Yetki Hatası')).toBeInTheDocument();
    });

    it('should infer validation error type', () => {
      const error = new Error('Validation failed');
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Doğrulama Hatası')).toBeInTheDocument();
    });
  });

  describe('Severity Badges', () => {
    it('should show critical severity badge', () => {
      const error = new AppRenderError('Critical error', {
        severity: 'critical',
      });
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Kritik')).toBeInTheDocument();
    });

    it('should show high priority badge', () => {
      const error = new AppRenderError('High priority error', {
        severity: 'high',
      });
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Yüksek Öncelik')).toBeInTheDocument();
    });

    it('should show medium priority badge', () => {
      const error = new AppRenderError('Medium error', {
        severity: 'medium',
      });
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Orta Öncelik')).toBeInTheDocument();
    });

    it('should show low priority badge', () => {
      const error = new AppRenderError('Low error', {
        severity: 'low',
      });
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Düşük Öncelik')).toBeInTheDocument();
    });
  });

  describe('Recovery Actions', () => {
    it('should show retry button for recoverable errors', () => {
      const error = new AppRenderError('Recoverable error', {
        recoverable: true,
      });
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Tekrar dene')).toBeInTheDocument();
    });

    it('should not show retry button for non-recoverable errors', () => {
      const error = new AppRenderError('Non-recoverable error', {
        recoverable: false,
      });
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );
      expect(screen.queryByText('Tekrar dene')).not.toBeInTheDocument();
    });

    it('should show home and reload buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error('Test')} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Ana Sayfa')).toBeInTheDocument();
      expect(screen.getByText('Sayfayı Yenile')).toBeInTheDocument();
    });
  });

  describe('onError Callback', () => {
    it('should call onError callback when error occurs', () => {
      const onError = vi.fn();
      const error = new Error('Test error');
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError error={error} />
        </ErrorBoundary>
      );
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBe(error);
    });
  });
});

describe('PageErrorBoundary', () => {
  it('should render children when no error', () => {
    render(
      <PageErrorBoundary pageName="Dashboard">
        <SafeComponent />
      </PageErrorBoundary>
    );
    expect(screen.getByText('Safe Content')).toBeInTheDocument();
  });

  it('should show page-specific error message', () => {
    render(
      <PageErrorBoundary pageName="Dashboard">
        <ThrowError error={new Error('Test')} />
      </PageErrorBoundary>
    );
    expect(screen.getByText('Sayfa yüklenirken hata oluştu')).toBeInTheDocument();
    expect(screen.getByText('Dashboard yüklenemedi.')).toBeInTheDocument();
  });

  it('should show generic message when pageName not provided', () => {
    render(
      <PageErrorBoundary>
        <ThrowError error={new Error('Test')} />
      </PageErrorBoundary>
    );
    expect(screen.getByText('Bu sayfa yüklenemedi.')).toBeInTheDocument();
  });
});

describe('ComponentErrorBoundary', () => {
  it('should render children when no error', () => {
    render(
      <ComponentErrorBoundary componentName="Chart">
        <SafeComponent />
      </ComponentErrorBoundary>
    );
    expect(screen.getByText('Safe Content')).toBeInTheDocument();
  });

  it('should show component-specific error', () => {
    render(
      <ComponentErrorBoundary componentName="Chart">
        <ThrowError error={new Error('Test')} />
      </ComponentErrorBoundary>
    );
    expect(screen.getByText('Bileşen yüklenemedi')).toBeInTheDocument();
    expect(screen.getByText('Chart görüntülenirken bir hata oluştu.')).toBeInTheDocument();
  });

  it('should show custom fallback when provided', () => {
    render(
      <ComponentErrorBoundary fallback={<div>Custom Component Error</div>}>
        <ThrowError error={new Error('Test')} />
      </ComponentErrorBoundary>
    );
    expect(screen.getByText('Custom Component Error')).toBeInTheDocument();
  });
});

describe('useErrorBoundary Hook', () => {
  const TestComponent = () => {
    const { reportError, clearError } = useErrorBoundary();
    return (
      <div>
        <button onClick={() => reportError(new Error('Manual error'))}>
          Report Error
        </button>
        <button onClick={clearError}>Clear Error</button>
      </div>
    );
  };

  it('should provide reportError function', () => {
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Report Error')).toBeInTheDocument();
  });

  it('should trigger error when reportError is called', () => {
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText('Report Error'));
    expect(screen.getByText('Bir Hata Oluştu')).toBeInTheDocument();
  });
});
