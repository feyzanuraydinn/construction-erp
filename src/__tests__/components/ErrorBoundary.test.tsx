import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '../../i18n';
import { ErrorBoundary, PageErrorBoundary } from '../../components/ErrorBoundary';

vi.mock('../../utils/logger', () => ({
  uiLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const ThrowError = ({ error }: { error: Error }) => {
  throw error;
};

const SafeComponent = () => <div>Safe Content</div>;

const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
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
    it.each([
      ['Database connection failed', 'Yüksek Öncelik'],
      ['Something odd happened', 'Orta Öncelik'],
      ['Validation failed', 'Düşük Öncelik'],
    ])('shows the badge for "%s"', (message, label) => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error(message)} />
        </ErrorBoundary>
      );
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  describe('Recovery Actions', () => {
    it('should show retry button for recoverable errors', () => {
      const error = new Error('Network fetch failed');
      render(
        <ErrorBoundary>
          <ThrowError error={error} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Tekrar dene')).toBeInTheDocument();
    });

    it('should not show retry button for non-recoverable errors', () => {
      const error = new Error('Permission denied');
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
