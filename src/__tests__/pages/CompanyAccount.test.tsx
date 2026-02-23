import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '../../i18n';
import CompanyAccount from '../../pages/CompanyAccount';
import type { TransactionWithDetails, Category } from '../../types';

// ==================== MOCKS ====================

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
  useLocation: () => ({ pathname: '/company-account', search: '' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

// ==================== TEST DATA ====================

const mockTransactions: TransactionWithDetails[] = [
  {
    id: 20,
    type: 'invoice_out',
    scope: 'company',
    amount: 50000,
    amount_try: 50000,
    currency: 'TRY',
    exchange_rate: 1,
    date: '2025-07-01',
    description: 'Kira geliri',
    company_id: null,
    company_name: null,
    project_id: null,
    project_name: null,
    category_id: 4,
    category_name: 'Kira Geliri',
    category_color: '#22c55e',
    document_no: 'G-001',
    notes: null,
    created_at: '2025-07-01',
    updated_at: '2025-07-01',
  },
  {
    id: 21,
    type: 'invoice_in',
    scope: 'company',
    amount: 30000,
    amount_try: 30000,
    currency: 'TRY',
    exchange_rate: 1,
    date: '2025-07-05',
    description: 'Ofis kirası ödemesi',
    company_id: null,
    company_name: null,
    project_id: null,
    project_name: null,
    category_id: 18,
    category_name: 'Ofis Kirası',
    category_color: '#ef4444',
    document_no: 'G-002',
    notes: null,
    created_at: '2025-07-05',
    updated_at: '2025-07-05',
  },
  {
    id: 22,
    type: 'invoice_in',
    scope: 'company',
    amount: 15000,
    amount_try: 15000,
    currency: 'TRY',
    exchange_rate: 1,
    date: '2025-07-10',
    description: 'Elektrik faturası',
    company_id: null,
    company_name: null,
    project_id: null,
    project_name: null,
    category_id: 19,
    category_name: 'Elektrik/Su/Doğalgaz',
    category_color: '#f59e0b',
    document_no: null,
    notes: null,
    created_at: '2025-07-10',
    updated_at: '2025-07-10',
  },
];

const mockCategories: Category[] = [
  { id: 4, name: 'Kira Geliri', type: 'invoice_out', color: '#22c55e', is_default: 1, created_at: '2024-01-01' },
  { id: 18, name: 'Ofis Kirası', type: 'invoice_in', color: '#ef4444', is_default: 1, created_at: '2024-01-01' },
  { id: 19, name: 'Elektrik/Su/Doğalgaz', type: 'invoice_in', color: '#f59e0b', is_default: 1, created_at: '2024-01-01' },
  { id: 30, name: 'Nakit', type: 'payment', color: '#3b82f6', is_default: 1, created_at: '2024-01-01' },
];

// ==================== HELPERS ====================

function setupMocksWithData() {
  (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockTransactions);
  (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockCategories);
}

function setupMocksEmpty() {
  (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

// ==================== TESTS ====================

describe('CompanyAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocksWithData();
  });

  // ---------- Initial render ----------

  it('should render page title and description', async () => {
    await act(async () => {
      render(<CompanyAccount />);
    });

    await waitFor(() => {
      expect(screen.getByText('Firma Hesabı')).toBeInTheDocument();
      expect(screen.getByText('Projelere bağlı olmayan genel firma gelir ve giderleri')).toBeInTheDocument();
    });
  });

  it('should render action buttons in header', async () => {
    await act(async () => {
      render(<CompanyAccount />);
    });

    await waitFor(() => {
      expect(screen.getByText("Excel'e Aktar")).toBeInTheDocument();
      expect(screen.getByText('Yazdır')).toBeInTheDocument();
      expect(screen.getByText('Yeni İşlem')).toBeInTheDocument();
    });
  });

  // ---------- Loading state ----------

  it('should show loading spinner while data is loading', async () => {
    (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    await act(async () => {
      render(<CompanyAccount />);
    });

    // Page title should be visible since it is outside the loading check
    expect(screen.getByText('Firma Hesabı')).toBeInTheDocument();
    // The loading spinner should be in the card body
    expect(screen.getByRole('status', { name: 'Yükleniyor...' })).toBeInTheDocument();
  });

  // ---------- Empty state ----------

  it('should show empty state when no transactions exist', async () => {
    setupMocksEmpty();

    await act(async () => {
      render(<CompanyAccount />);
    });

    await waitFor(() => {
      expect(screen.getByText('İşlem bulunamadı')).toBeInTheDocument();
      expect(screen.getByText('Firma genel gelir/gider ekleyerek başlayın')).toBeInTheDocument();
    });
  });

  // ---------- Stats cards ----------

  it('should display financial stat cards', async () => {
    await act(async () => {
      render(<CompanyAccount />);
    });

    await waitFor(() => {
      expect(screen.getByText('Genel Gelir')).toBeInTheDocument();
      expect(screen.getByText('Genel Gider')).toBeInTheDocument();
      // "Net Durum" may appear in both stat card and print view
      const netElements = screen.getAllByText('Net Durum');
      expect(netElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------- Transaction table ----------

  it('should render transactions in the table', async () => {
    await act(async () => {
      render(<CompanyAccount />);
    });

    await waitFor(() => {
      // Transaction descriptions appear in the table (may also appear in print view)
      const kiraElements = screen.getAllByText('Kira geliri');
      expect(kiraElements.length).toBeGreaterThanOrEqual(1);
      const ofisElements = screen.getAllByText('Ofis kirası ödemesi');
      expect(ofisElements.length).toBeGreaterThanOrEqual(1);
      const elektrikElements = screen.getAllByText('Elektrik faturası');
      expect(elektrikElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render transaction table column headers', async () => {
    await act(async () => {
      render(<CompanyAccount />);
    });

    await waitFor(() => {
      const dateHeaders = screen.getAllByText('Tarih');
      expect(dateHeaders.length).toBeGreaterThanOrEqual(1);
      const typeHeaders = screen.getAllByText('Tür');
      expect(typeHeaders.length).toBeGreaterThanOrEqual(1);
      const categoryHeaders = screen.getAllByText('Kategori');
      expect(categoryHeaders.length).toBeGreaterThanOrEqual(1);
      const amountHeaders = screen.getAllByText('Tutar');
      expect(amountHeaders.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------- Expense breakdown sidebar ----------

  it('should display expense breakdown section', async () => {
    await act(async () => {
      render(<CompanyAccount />);
    });

    await waitFor(() => {
      // "Gider Dağılımı" may appear in both sidebar and print view
      const elements = screen.getAllByText('Gider Dağılımı');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show empty expense breakdown when no expenses', async () => {
    // Only income transaction, no expenses
    (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([mockTransactions[0]]);

    await act(async () => {
      render(<CompanyAccount />);
    });

    await waitFor(() => {
      expect(screen.getByText('Gider kaydı yok')).toBeInTheDocument();
    });
  });

  // ---------- Document number display ----------

  it('should display document numbers when available', async () => {
    await act(async () => {
      render(<CompanyAccount />);
    });

    await waitFor(() => {
      const docElements = screen.getAllByText('Belge: G-001');
      expect(docElements.length).toBeGreaterThanOrEqual(1);
      const docElements2 = screen.getAllByText('Belge: G-002');
      expect(docElements2.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------- Error handling ----------

  it('should handle API error gracefully', async () => {
    (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB Error'));

    await act(async () => {
      render(<CompanyAccount />);
    });

    // After error, loading should be false and empty state should show
    await waitFor(() => {
      expect(screen.getByText('İşlem bulunamadı')).toBeInTheDocument();
    });
  });

  // ---------- Transaction section title ----------

  it('should render transactions section heading', async () => {
    await act(async () => {
      render(<CompanyAccount />);
    });

    await waitFor(() => {
      // "İşlemler" may appear in both the card header and print view
      const elements = screen.getAllByText('İşlemler');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
