import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '../../i18n';
import Transactions from '../../pages/Transactions';
import type { TransactionWithDetails } from '../../types';

// ==================== MOCKS ====================

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/transactions' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

// ==================== HELPERS ====================

const mockTransactions: TransactionWithDetails[] = [
  {
    id: 1,
    type: 'invoice_out',
    scope: 'cari',
    amount: 150000,
    amount_try: 150000,
    currency: 'TRY',
    date: '2025-06-01',
    description: 'Daire satış faturası',
    company_id: 1,
    company_name: 'ABC İnşaat',
    project_id: null,
    project_name: null,
    category_id: 1,
    category_name: 'Daire/Konut Satışı',
    category_color: '#3b82f6',
    document_no: 'F-001',
    notes: null,
    exchange_rate: 0,
    created_at: '2025-06-01',
    updated_at: '2025-06-01',
  },
  {
    id: 2,
    type: 'invoice_in',
    scope: 'project',
    amount: 80000,
    amount_try: 80000,
    currency: 'TRY',
    date: '2025-06-05',
    description: 'Beton alım faturası',
    company_id: null,
    company_name: null,
    project_id: 1,
    project_name: 'Konut Projesi',
    category_id: 2,
    category_name: 'Beton',
    category_color: '#ef4444',
    document_no: 'F-002',
    notes: null,
    exchange_rate: 0,
    created_at: '2025-06-05',
    updated_at: '2025-06-05',
  },
  {
    id: 3,
    type: 'payment_in',
    scope: 'company',
    amount: 50000,
    amount_try: 50000,
    currency: 'TRY',
    date: '2025-06-10',
    description: 'Genel tahsilat',
    company_id: null,
    company_name: null,
    project_id: null,
    project_name: null,
    category_id: null,
    category_name: null,
    category_color: null,
    document_no: null,
    notes: null,
    exchange_rate: 0,
    created_at: '2025-06-10',
    updated_at: '2025-06-10',
  },
];

function setupMocksEmpty() {
  (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.company.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.project.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

function setupMocksWithData() {
  (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockTransactions);
  (window.electronAPI.company.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([
    { id: 1, name: 'ABC İnşaat', company_type: 'company', account_type: 'customer' },
  ]);
  (window.electronAPI.project.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([
    { id: 1, code: 'P-001', name: 'Konut Projesi', status: 'active' },
  ]);
  (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

// ==================== TESTS ====================

describe('Transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocksEmpty();
  });

  // ---------- Initial render ----------

  it('should render page title and subtitle', async () => {
    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      expect(screen.getByText('Tüm İşlemler')).toBeInTheDocument();
      expect(screen.getByText('Sistemdeki tüm işlem hareketleri')).toBeInTheDocument();
    });
  });

  it('should render the export button', async () => {
    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      expect(screen.getByText("Excel'e Aktar")).toBeInTheDocument();
    });
  });

  // ---------- Loading state ----------

  it('should show loading state while data is loading', async () => {
    (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.company.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.project.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    await act(async () => {
      render(<Transactions />);
    });

    // Title should be visible since it is outside the loading conditional
    expect(screen.getByText('Tüm İşlemler')).toBeInTheDocument();
    // Table should not have rendered yet
    expect(screen.queryByText('İşlem bulunamadı')).not.toBeInTheDocument();
  });

  // ---------- Empty state ----------

  it('should show empty state when no transactions exist', async () => {
    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      expect(screen.getByText('İşlem bulunamadı')).toBeInTheDocument();
      expect(screen.getByText('Filtrelere uygun işlem kaydı yok')).toBeInTheDocument();
    });
  });

  // ---------- Data rendering ----------

  it('should render transactions in the table', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      expect(screen.getByText('Daire satış faturası')).toBeInTheDocument();
      expect(screen.getByText('Beton alım faturası')).toBeInTheDocument();
      expect(screen.getByText('Genel tahsilat')).toBeInTheDocument();
    });
  });

  it('should render table column headers', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      expect(screen.getByText('Tarih')).toBeInTheDocument();
      expect(screen.getByText('Açıklama')).toBeInTheDocument();
      expect(screen.getByText('Tutar')).toBeInTheDocument();
    });
  });

  it('should render company name as a clickable link', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      // ABC İnşaat appears in both the filter dropdown and the table row
      const elements = screen.getAllByText('ABC İnşaat');
      expect(elements.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should render project name for project-scoped transactions', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      expect(screen.getByText('Konut Projesi')).toBeInTheDocument();
    });
  });

  it('should show document number when available', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      expect(screen.getByText('Belge: F-001')).toBeInTheDocument();
      expect(screen.getByText('Belge: F-002')).toBeInTheDocument();
    });
  });

  // ---------- Navigation ----------

  it('should navigate to company detail when company name is clicked', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      const elements = screen.getAllByText('ABC İnşaat');
      expect(elements.length).toBeGreaterThanOrEqual(2);
    });

    // Click on the span in the table (not the option in the select)
    const companySpan = screen.getAllByText('ABC İnşaat').find(
      (el) => el.tagName === 'SPAN'
    );
    expect(companySpan).toBeDefined();
    await act(async () => {
      fireEvent.click(companySpan!);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/companies/1');
  });

  // ---------- Search ----------

  it('should have a search input with correct placeholder', async () => {
    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('İşlem ara...')).toBeInTheDocument();
    });
  });

  // ---------- Error handling ----------

  it('should show error toast when loading fails', async () => {
    (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB Error'));

    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Veriler yüklenirken hata oluştu');
    });
  });

  // ---------- Firma Genel label ----------

  it('should show Firma Genel for transactions without company or project', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      // "Firma Genel" may appear in both scope filter and table - use getAllByText
      const elements = screen.getAllByText('Firma Genel');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
