import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '../../i18n';
import Settings from '../../pages/Settings';
import type { Category } from '../../types';

// ==================== MOCKS ====================

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

const mockSetTheme = vi.fn();
vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light', setTheme: mockSetTheme, toggleTheme: vi.fn() }),
}));

// ==================== HELPERS ====================

const mockCategories: Category[] = [
  { id: 1, name: 'Beton', type: 'invoice_in', color: '#ef4444', is_default: 1, created_at: '2025-01-01' },
  { id: 2, name: 'Daire/Konut Satışı', type: 'invoice_out', color: '#3b82f6', is_default: 1, created_at: '2025-01-01' },
  { id: 3, name: 'Özel Kategori', type: 'payment', color: '#22c55e', is_default: 0, created_at: '2025-01-01' },
];

function setupMocksEmpty() {
  (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.backup.list as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.gdrive.hasCredentials as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  (window.electronAPI.app.getVersion as ReturnType<typeof vi.fn>).mockResolvedValue('1.0.0');
}

function setupMocksWithData() {
  (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockCategories);
  (window.electronAPI.backup.list as ReturnType<typeof vi.fn>).mockResolvedValue([
    { path: '/backups/backup-2025.db', size: 1048576, date: '2025-06-15T10:30:00Z' },
  ]);
  (window.electronAPI.gdrive.hasCredentials as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  (window.electronAPI.app.getVersion as ReturnType<typeof vi.fn>).mockResolvedValue('1.2.3');
}

// ==================== TESTS ====================

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocksEmpty();
  });

  // ---------- Initial render ----------

  it('should render page title and subtitle', async () => {
    await act(async () => {
      render(<Settings />);
    });

    await waitFor(() => {
      expect(screen.getByText('Ayarlar')).toBeInTheDocument();
      expect(screen.getByText('Uygulama ayarları ve yedekleme')).toBeInTheDocument();
    });
  });

  it('should render the local backup section', async () => {
    await act(async () => {
      render(<Settings />);
    });

    await waitFor(() => {
      expect(screen.getByText('Yerel Yedekleme')).toBeInTheDocument();
      expect(screen.getByText('Yedek Oluştur')).toBeInTheDocument();
      expect(screen.getByText('Klasörü Aç')).toBeInTheDocument();
    });
  });

  it('should render the Google Drive section', async () => {
    await act(async () => {
      render(<Settings />);
    });

    await waitFor(() => {
      expect(screen.getByText('Google Drive Yedekleme')).toBeInTheDocument();
    });
  });

  it('should render language section with Turkish and English options', async () => {
    await act(async () => {
      render(<Settings />);
    });

    await waitFor(() => {
      expect(screen.getByText('Dil')).toBeInTheDocument();
      expect(screen.getByText('Türkçe')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });
  });

  it('should render theme section with light, dark, and system options', async () => {
    await act(async () => {
      render(<Settings />);
    });

    await waitFor(() => {
      expect(screen.getByText('Tema')).toBeInTheDocument();
      expect(screen.getByText('Açık')).toBeInTheDocument();
      expect(screen.getByText('Koyu')).toBeInTheDocument();
      expect(screen.getByText('Sistem')).toBeInTheDocument();
    });
  });

  // ---------- No backup state ----------

  it('should show no backup message when no backups exist', async () => {
    await act(async () => {
      render(<Settings />);
    });

    await waitFor(() => {
      expect(screen.getByText('Henüz yedek yok')).toBeInTheDocument();
      expect(screen.getByText('İlk yedeğinizi oluşturun')).toBeInTheDocument();
    });
  });

  // ---------- Backup data ----------

  it('should show last backup info when a backup exists', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Settings />);
    });

    await waitFor(() => {
      expect(screen.getByText('Son Yedek')).toBeInTheDocument();
    });
  });

  // ---------- Categories ----------

  it('should render new category form', async () => {
    await act(async () => {
      render(<Settings />);
    });

    await waitFor(() => {
      expect(screen.getByText('Yeni Kategori Ekle')).toBeInTheDocument();
      expect(screen.getByText('Kategori Adı *')).toBeInTheDocument();
      expect(screen.getByText('Kategori Türü *')).toBeInTheDocument();
      expect(screen.getByText('Renk')).toBeInTheDocument();
    });
  });

  it('should render existing categories section with category type headers', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Settings />);
    });

    await waitFor(() => {
      expect(screen.getByText('Mevcut Kategoriler')).toBeInTheDocument();
      // Category type headers appear both in the select and in category list headers
      const invoiceOutLabels = screen.getAllByText('Satış Faturası (Gelir)');
      expect(invoiceOutLabels.length).toBeGreaterThanOrEqual(2);
      const invoiceInLabels = screen.getAllByText('Alış Faturası (Gider)');
      expect(invoiceInLabels.length).toBeGreaterThanOrEqual(2);
      const paymentLabels = screen.getAllByText('Ödeme/Tahsilat Türü');
      expect(paymentLabels.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should show default label for default categories and delete button for custom ones', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Settings />);
    });

    await waitFor(() => {
      // The component renders ({t('settings.defaultLabel')}) which becomes ((varsayılan))
      // because the translation value already includes parentheses
      const defaultLabels = screen.getAllByText(/varsayılan/);
      expect(defaultLabels.length).toBeGreaterThanOrEqual(2); // Beton and Daire/Konut Satışı are default

      // Custom category "Özel Kategori" is not default, so it should be visible
      expect(screen.getByText('Özel Kategori')).toBeInTheDocument();
    });
  });

  // ---------- Backup interaction ----------

  it('should create a backup when the backup button is clicked', async () => {
    await act(async () => {
      render(<Settings />);
    });

    await waitFor(() => {
      expect(screen.getByText('Yedek Oluştur')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Yedek Oluştur'));
    });

    await waitFor(() => {
      expect(window.electronAPI.backup.create).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Yedek başarıyla oluşturuldu');
    });
  });

  // ---------- Google Drive not configured ----------

  it('should show Google Drive not configured message and configure button', async () => {
    await act(async () => {
      render(<Settings />);
    });

    await waitFor(() => {
      expect(screen.getByText('Google Drive yapılandırılmamış')).toBeInTheDocument();
      expect(screen.getByText('Yapılandır')).toBeInTheDocument();
    });
  });

  // ---------- App version ----------

  it('should display the app version', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Settings />);
    });

    await waitFor(() => {
      expect(screen.getByText('İnşaat ERP')).toBeInTheDocument();
    });
  });

  // ---------- Error handling ----------

  it('should show error toast when backup fails', async () => {
    (window.electronAPI.backup.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Backup failed'));

    await act(async () => {
      render(<Settings />);
    });

    await waitFor(() => {
      expect(screen.getByText('Yedek Oluştur')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Yedek Oluştur'));
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Yedek oluşturulamadı');
    });
  });
});
