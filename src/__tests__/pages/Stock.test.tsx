import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '../../i18n';
import Stock from '../../pages/Stock';
import type { Material, StockMovementWithDetails } from '../../types';

// ==================== MOCKS ====================

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

// ==================== HELPERS ====================

const mockMaterials: Material[] = [
  {
    id: 1,
    code: 'M-001',
    name: 'Çimento',
    category: 'construction',
    unit: 'Torba',
    current_stock: 500,
    min_stock: 100,
    notes: '',
    is_active: 1,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  },
  {
    id: 2,
    code: 'M-002',
    name: 'Demir Çubuk',
    category: 'steel',
    unit: 'Ton',
    current_stock: 5,
    min_stock: 20,
    notes: '',
    is_active: 1,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  },
];

const mockMovements: StockMovementWithDetails[] = [
  {
    id: 1,
    material_id: 1,
    material_name: 'Çimento',
    material_code: 'M-001',
    material_unit: 'Torba',
    movement_type: 'in',
    quantity: 200,
    unit_price: 50,
    total_price: 10000,
    date: '2025-06-01',
    project_id: 1,
    project_name: 'Konut Projesi',
    company_id: 1,
    company_name: 'ABC Tedarik',
    document_no: 'IRS-001',
    description: 'Çimento alımı',
    created_at: '2025-06-01',
  },
  {
    id: 2,
    material_id: 2,
    material_name: 'Demir Çubuk',
    material_code: 'M-002',
    material_unit: 'Ton',
    movement_type: 'out',
    quantity: 3,
    unit_price: 15000,
    total_price: 45000,
    date: '2025-06-05',
    project_id: 1,
    project_name: 'Konut Projesi',
    company_id: null,
    company_name: null,
    document_no: null,
    description: 'Şantiyeye sevk',
    created_at: '2025-06-05',
  },
];

function setupMocksEmpty() {
  (window.electronAPI.material.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.stock.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.project.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.company.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

function setupMocksWithData() {
  (window.electronAPI.material.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockMaterials);
  (window.electronAPI.stock.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockMovements);
  (window.electronAPI.project.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.company.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

// ==================== TESTS ====================

describe('Stock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocksEmpty();
  });

  // ---------- Initial render ----------

  it('should render page title and subtitle', async () => {
    await act(async () => {
      render(<Stock />);
    });

    await waitFor(() => {
      expect(screen.getByText('Stok Yönetimi')).toBeInTheDocument();
      expect(screen.getByText('Malzeme ve stok takibi')).toBeInTheDocument();
    });
  });

  it('should render the new material and stock movement buttons', async () => {
    await act(async () => {
      render(<Stock />);
    });

    await waitFor(() => {
      // "Yeni Malzeme" appears in both header and empty state action
      const newMaterialButtons = screen.getAllByText('Yeni Malzeme');
      expect(newMaterialButtons.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Stok Hareketi')).toBeInTheDocument();
    });
  });

  // ---------- Tab rendering ----------

  it('should render materials and movements tabs', async () => {
    await act(async () => {
      render(<Stock />);
    });

    await waitFor(() => {
      expect(screen.getByText('Malzemeler')).toBeInTheDocument();
      expect(screen.getByText('Stok Hareketleri')).toBeInTheDocument();
    });
  });

  // ---------- Loading state ----------

  it('should show loading state while data is loading', async () => {
    (window.electronAPI.material.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.stock.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.project.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.company.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    await act(async () => {
      render(<Stock />);
    });

    // Title should be visible since it is outside loading conditional
    expect(screen.getByText('Stok Yönetimi')).toBeInTheDocument();
    // The table should not be rendered yet
    expect(screen.queryByText('Malzeme bulunamadı')).not.toBeInTheDocument();
  });

  // ---------- Empty state ----------

  it('should show empty state when no materials exist', async () => {
    await act(async () => {
      render(<Stock />);
    });

    await waitFor(() => {
      expect(screen.getByText('Malzeme bulunamadı')).toBeInTheDocument();
      expect(screen.getByText('Yeni malzeme ekleyerek başlayın')).toBeInTheDocument();
    });
  });

  it('should show empty state when switching to movements tab with no movements', async () => {
    await act(async () => {
      render(<Stock />);
    });

    await waitFor(() => {
      expect(screen.getByText('Malzeme bulunamadı')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Stok Hareketleri'));
    });

    await waitFor(() => {
      expect(screen.getByText('Stok hareketi bulunamadı')).toBeInTheDocument();
    });
  });

  // ---------- Data rendering ----------

  it('should render materials in the table', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Stock />);
    });

    await waitFor(() => {
      expect(screen.getByText('Çimento')).toBeInTheDocument();
      expect(screen.getByText('M-001')).toBeInTheDocument();
      expect(screen.getByText('Demir Çubuk')).toBeInTheDocument();
      expect(screen.getByText('M-002')).toBeInTheDocument();
    });
  });

  it('should show critical badge for low stock materials', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Stock />);
    });

    await waitFor(() => {
      expect(screen.getByText('Çimento')).toBeInTheDocument();
    });

    // Demir Çubuk has current_stock=5 < min_stock=20, so it should be "Kritik"
    // Çimento has current_stock=500 > min_stock=100, so it should be "Normal"
    // Use queryAllByText since Badge renders text content
    const kritikElements = screen.queryAllByText(/Kritik/);
    expect(kritikElements.length).toBeGreaterThanOrEqual(1);
    const normalElements = screen.queryAllByText(/Normal/);
    expect(normalElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should render table column headers for materials', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Stock />);
    });

    await waitFor(() => {
      expect(screen.getByText('Kod')).toBeInTheDocument();
      expect(screen.getByText('Malzeme Adı')).toBeInTheDocument();
      expect(screen.getByText('Birim')).toBeInTheDocument();
      expect(screen.getByText('Mevcut Stok')).toBeInTheDocument();
      expect(screen.getByText('Min. Stok')).toBeInTheDocument();
    });
  });

  // ---------- Tab switching ----------

  it('should switch to movements tab and show movement data', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Stock />);
    });

    await waitFor(() => {
      expect(screen.getByText('Çimento')).toBeInTheDocument();
    });

    // Click on the tab with role="tab" to switch
    const movementsTab = screen.getByRole('tab', { name: 'Stok Hareketleri' });
    await act(async () => {
      fireEvent.click(movementsTab);
    });

    await waitFor(() => {
      // Movement table should show project and company names
      // Both movements are from "Konut Projesi" so there are multiple
      const projects = screen.getAllByText('Konut Projesi');
      expect(projects.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('ABC Tedarik')).toBeInTheDocument();
    });
  });

  // ---------- Search ----------

  it('should have a search input with correct placeholder', async () => {
    await act(async () => {
      render(<Stock />);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Malzeme ara...')).toBeInTheDocument();
    });
  });

  // ---------- Error handling ----------

  it('should show error toast when loading fails', async () => {
    (window.electronAPI.material.getAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB Error'));

    await act(async () => {
      render(<Stock />);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Veriler yüklenirken hata oluştu');
    });
  });
});
