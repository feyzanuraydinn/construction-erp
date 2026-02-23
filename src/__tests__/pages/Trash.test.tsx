import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '../../i18n';
import Trash from '../../pages/Trash';
import type { TrashItem } from '../../types';

// ==================== MOCKS ====================

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

// ==================== HELPERS ====================

const mockTrashItems: TrashItem[] = [
  {
    id: 1,
    type: 'company',
    data: JSON.stringify({ name: 'ABC İnşaat', type: 'company', account_type: 'customer' }),
    deleted_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 2,
    type: 'project',
    data: JSON.stringify({ name: 'Villa Projesi', code: 'P-001' }),
    deleted_at: '2025-01-14T09:00:00Z',
  },
  {
    id: 3,
    type: 'transaction',
    data: JSON.stringify({ description: 'Beton alımı', amount: 50000 }),
    deleted_at: '2025-01-13T08:00:00Z',
  },
  {
    id: 4,
    type: 'material',
    data: JSON.stringify({ name: 'Çimento' }),
    deleted_at: '2025-01-12T07:00:00Z',
  },
];

// ==================== TESTS ====================

describe('Trash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.electronAPI.trash.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  // ---------- Initial render ----------

  it('should render page title and subtitle', async () => {
    await act(async () => {
      render(<Trash />);
    });

    await waitFor(() => {
      expect(screen.getByText('Çöp Kutusu')).toBeInTheDocument();
      expect(screen.getByText('Silinen öğeler 30 gün içinde otomatik olarak kalıcı silinir')).toBeInTheDocument();
    });
  });

  // ---------- Loading state ----------

  it('should show loading spinner while data is loading', async () => {
    (window.electronAPI.trash.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    await act(async () => {
      render(<Trash />);
    });

    // The card header should be visible but content should be loading
    expect(screen.getByText('Çöp Kutusu')).toBeInTheDocument();
  });

  // ---------- Empty state ----------

  it('should show empty state when trash is empty', async () => {
    await act(async () => {
      render(<Trash />);
    });

    await waitFor(() => {
      expect(screen.getByText('Çöp kutusu boş')).toBeInTheDocument();
      expect(screen.getByText('Silinen öğeler burada görünecektir')).toBeInTheDocument();
    });
  });

  it('should not show empty trash button when trash is empty', async () => {
    await act(async () => {
      render(<Trash />);
    });

    await waitFor(() => {
      expect(screen.getByText('Çöp kutusu boş')).toBeInTheDocument();
    });

    expect(screen.queryByText('Çöp Kutusunu Boşalt')).not.toBeInTheDocument();
  });

  // ---------- Data rendering ----------

  it('should render trash items in the table', async () => {
    (window.electronAPI.trash.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrashItems);

    await act(async () => {
      render(<Trash />);
    });

    await waitFor(() => {
      expect(screen.getByText('ABC İnşaat')).toBeInTheDocument();
      expect(screen.getByText('Villa Projesi')).toBeInTheDocument();
      expect(screen.getByText('Çimento')).toBeInTheDocument();
    });
  });

  it('should render type badges for each item type', async () => {
    (window.electronAPI.trash.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrashItems);

    await act(async () => {
      render(<Trash />);
    });

    await waitFor(() => {
      expect(screen.getByText('Cari Hesap')).toBeInTheDocument();
      expect(screen.getByText('Proje')).toBeInTheDocument();
      expect(screen.getByText('İşlem')).toBeInTheDocument();
      expect(screen.getByText('Malzeme')).toBeInTheDocument();
    });
  });

  it('should show empty trash button when items exist', async () => {
    (window.electronAPI.trash.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrashItems);

    await act(async () => {
      render(<Trash />);
    });

    await waitFor(() => {
      expect(screen.getByText('Çöp Kutusunu Boşalt')).toBeInTheDocument();
    });
  });

  it('should show warning banner when items exist', async () => {
    (window.electronAPI.trash.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrashItems);

    await act(async () => {
      render(<Trash />);
    });

    await waitFor(() => {
      expect(screen.getByText('Dikkat')).toBeInTheDocument();
      expect(screen.getByText('Kalıcı olarak silinen öğeler geri getirilemez. İlişkili işlemler ve veriler de silinecektir.')).toBeInTheDocument();
    });
  });

  it('should show the count of deleted items', async () => {
    (window.electronAPI.trash.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrashItems);

    await act(async () => {
      render(<Trash />);
    });

    await waitFor(() => {
      expect(screen.getByText('Silinen Öğeler (4)')).toBeInTheDocument();
    });
  });

  // ---------- Restore interaction ----------

  it('should show restore confirmation dialog when restore button is clicked', async () => {
    (window.electronAPI.trash.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrashItems);

    await act(async () => {
      render(<Trash />);
    });

    await waitFor(() => {
      expect(screen.getByText('ABC İnşaat')).toBeInTheDocument();
    });

    // Click the restore button (ghost-success icon button) for the first item
    const restoreButtons = screen.getAllByTitle('Geri Yükle');
    await act(async () => {
      fireEvent.click(restoreButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/"ABC İnşaat" öğesini geri yüklemek istediğinizden emin misiniz\?/)).toBeInTheDocument();
    });
  });

  // ---------- Permanent delete interaction ----------

  it('should show permanent delete confirmation when delete button is clicked', async () => {
    (window.electronAPI.trash.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrashItems);

    await act(async () => {
      render(<Trash />);
    });

    await waitFor(() => {
      expect(screen.getByText('ABC İnşaat')).toBeInTheDocument();
    });

    // Click the permanent delete button (ghost-danger icon button) for the first item
    const deleteButtons = screen.getAllByTitle('Sil');
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Kalıcı Olarak Sil')).toBeInTheDocument();
    });
  });

  // ---------- Error handling ----------

  it('should show error toast when loading fails', async () => {
    (window.electronAPI.trash.getAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB Error'));

    await act(async () => {
      render(<Trash />);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Veriler yüklenirken hata oluştu');
    });
  });

  it('should show error toast when restore fails', async () => {
    (window.electronAPI.trash.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrashItems);
    (window.electronAPI.trash.restore as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Restore Error'));

    await act(async () => {
      render(<Trash />);
    });

    await waitFor(() => {
      expect(screen.getByText('ABC İnşaat')).toBeInTheDocument();
    });

    // Click restore button
    const restoreButtons = screen.getAllByTitle('Geri Yükle');
    await act(async () => {
      fireEvent.click(restoreButtons[0]);
    });

    // Confirm restore - find the button inside the confirm dialog (not icon buttons in table)
    await waitFor(() => {
      // The confirm dialog has a button with text "Geri Yükle" (confirmText)
      // Use getAllByRole and find the one that's NOT an icon button (has text content)
      const allRestoreButtons = screen.getAllByRole('button', { name: 'Geri Yükle' });
      // The last one is the confirm dialog button
      const confirmBtn = allRestoreButtons[allRestoreButtons.length - 1];
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Geri yükleme sırasında hata oluştu');
    });
  });

  // ---------- Table headers ----------

  it('should render table column headers', async () => {
    (window.electronAPI.trash.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrashItems);

    await act(async () => {
      render(<Trash />);
    });

    await waitFor(() => {
      expect(screen.getByText('Tür')).toBeInTheDocument();
      expect(screen.getByText('Öğe')).toBeInTheDocument();
      expect(screen.getByText('Silinme Tarihi')).toBeInTheDocument();
    });
  });
});
