import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '../../i18n';
import Dashboard from '../../pages/Dashboard';
import type { DashboardStats, TransactionWithDetails, DebtorCreditor, ProjectWithSummary } from '../../types';

// ==================== MOCKS ====================

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

// ==================== HELPERS ====================

const mockStats: DashboardStats = {
  totalCompanies: 10,
  activeProjects: 5,
  totalIncome: 500000,
  totalExpense: 300000,
  netProfit: 200000,
  totalCollected: 400000,
  totalPaid: 250000,
  netCash: 150000,
  totalReceivables: 100000,
  totalPayables: 50000,
  lowStockCount: 0,
};

const mockTransactions: TransactionWithDetails[] = [
  {
    id: 1,
    type: 'invoice_out',
    scope: 'cari',
    amount: 50000,
    amount_try: 50000,
    currency: 'TRY',
    date: '2026-01-15',
    description: 'Daire satış faturası',
    company_id: 1,
    company_name: 'ABC İnşaat',
    project_id: null,
    project_name: null,
    category_id: null,
    category_name: null,
    document_no: null,
    notes: null,
    exchange_rate: 1,
    created_at: '2026-01-15',
    updated_at: '2026-01-15',
  },
  {
    id: 2,
    type: 'invoice_in',
    scope: 'project',
    amount: 30000,
    amount_try: 30000,
    currency: 'TRY',
    date: '2026-01-10',
    description: 'Beton alım faturası',
    company_id: null,
    company_name: null,
    project_id: 1,
    project_name: 'Villa Projesi',
    category_id: null,
    category_name: 'Beton',
    document_no: 'F-001',
    notes: null,
    exchange_rate: 1,
    created_at: '2026-01-10',
    updated_at: '2026-01-10',
  },
];

const mockDebtors: DebtorCreditor[] = [
  { id: 1, name: 'Borçlu Firma A', type: 'company', account_type: 'customer', balance: 75000 },
  { id: 2, name: 'Borçlu Firma B', type: 'company', account_type: 'customer', balance: 50000 },
];

const mockCreditors: DebtorCreditor[] = [
  { id: 3, name: 'Alacaklı Firma X', type: 'company', account_type: 'supplier', balance: -30000 },
  { id: 4, name: 'Alacaklı Firma Y', type: 'company', account_type: 'supplier', balance: -20000 },
];

const mockProjects: ProjectWithSummary[] = [
  {
    id: 1,
    code: 'P-001',
    name: 'Konut Projesi A',
    status: 'active',
    ownership_type: 'own',
    project_type: 'residential',
    estimated_budget: 1000000,
    total_income: 600000,
    total_expense: 400000,
    total_collected: 500000,
    total_paid: 350000,
    created_at: '2024-01-01',
    updated_at: '2024-06-01',
  } as ProjectWithSummary,
  {
    id: 2,
    code: 'P-002',
    name: 'Villa Projesi B',
    status: 'active',
    ownership_type: 'client',
    project_type: 'villa',
    estimated_budget: 2000000,
    total_income: 800000,
    total_expense: 500000,
    total_collected: 700000,
    total_paid: 400000,
    created_at: '2024-02-01',
    updated_at: '2024-07-01',
  } as ProjectWithSummary,
];

function setupMocksWithData() {
  (window.electronAPI.dashboard.getStats as ReturnType<typeof vi.fn>).mockResolvedValue(mockStats);
  (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockTransactions);
  (window.electronAPI.dashboard.getTopDebtors as ReturnType<typeof vi.fn>).mockResolvedValue(mockDebtors);
  (window.electronAPI.dashboard.getTopCreditors as ReturnType<typeof vi.fn>).mockResolvedValue(mockCreditors);
  (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);
}

function setupMocksEmpty() {
  (window.electronAPI.dashboard.getStats as ReturnType<typeof vi.fn>).mockResolvedValue({
    totalCompanies: 0, activeProjects: 0,
    totalIncome: 0, totalExpense: 0, netProfit: 0,
    totalCollected: 0, totalPaid: 0, netCash: 0,
    totalReceivables: 0, totalPayables: 0, lowStockCount: 0,
  });
  (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.dashboard.getTopDebtors as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.dashboard.getTopCreditors as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

// ==================== TESTS ====================

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocksEmpty();
  });

  // ---------- Initial render ----------

  it('should render page title and subtitle', async () => {
    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Gösterge Paneli')).toBeInTheDocument();
      expect(screen.getByText('Genel bakış ve özet bilgiler')).toBeInTheDocument();
    });
  });

  // ---------- Loading state ----------

  it('should show loading spinner while data is loading', async () => {
    // Make APIs hang to keep loading state
    (window.electronAPI.dashboard.getStats as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.dashboard.getTopDebtors as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.dashboard.getTopCreditors as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    await act(async () => {
      render(<Dashboard />);
    });

    // While loading, no page title is rendered (only LoadingSpinner)
    expect(screen.queryByText('Gösterge Paneli')).not.toBeInTheDocument();
  });

  // ---------- Empty state ----------

  it('should show empty states when no data exists', async () => {
    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Henüz işlem bulunmuyor')).toBeInTheDocument();
      expect(screen.getByText('Aktif proje bulunmuyor')).toBeInTheDocument();
      expect(screen.getByText('Borçlu cari bulunmuyor')).toBeInTheDocument();
      expect(screen.getByText('Alacaklı cari bulunmuyor')).toBeInTheDocument();
    });
  });

  // ---------- Data rendering ----------

  it('should render stat cards with data', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Toplam Gelir')).toBeInTheDocument();
      expect(screen.getByText('Toplam Gider')).toBeInTheDocument();
      expect(screen.getByText('Net Kâr/Zarar')).toBeInTheDocument();
      expect(screen.getByText('Toplam Tahsilat')).toBeInTheDocument();
      expect(screen.getByText('Toplam Ödeme')).toBeInTheDocument();
      expect(screen.getByText('Toplam Alacak')).toBeInTheDocument();
      expect(screen.getByText('Toplam Borç')).toBeInTheDocument();
    });
  });

  it('should render recent transactions when data is loaded', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Son İşlemler')).toBeInTheDocument();
      expect(screen.getByText('Daire satış faturası')).toBeInTheDocument();
      expect(screen.getByText('Beton alım faturası')).toBeInTheDocument();
    });
  });

  it('should render active projects', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Aktif Projeler')).toBeInTheDocument();
      expect(screen.getByText('Konut Projesi A')).toBeInTheDocument();
      expect(screen.getByText('Villa Projesi B')).toBeInTheDocument();
      expect(screen.getByText('P-001')).toBeInTheDocument();
      expect(screen.getByText('P-002')).toBeInTheDocument();
    });
  });

  it('should render debtors and creditors', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Bize Borçlu Cariler')).toBeInTheDocument();
      expect(screen.getByText('Borçlu Firma A')).toBeInTheDocument();
      expect(screen.getByText('Borçlu Firma B')).toBeInTheDocument();
      expect(screen.getByText('Bizim Borçlu Olduklarımız')).toBeInTheDocument();
      expect(screen.getByText('Alacaklı Firma X')).toBeInTheDocument();
      expect(screen.getByText('Alacaklı Firma Y')).toBeInTheDocument();
    });
  });

  // ---------- Date filter interaction ----------

  it('should render date filter buttons', async () => {
    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Bu Yıl')).toBeInTheDocument();
      expect(screen.getByText('Bu Ay')).toBeInTheDocument();
      expect(screen.getByText('Bu Hafta')).toBeInTheDocument();
      expect(screen.getByText('Bugün')).toBeInTheDocument();
      expect(screen.getByText('Tüm Zamanlar')).toBeInTheDocument();
    });
  });

  it('should switch date filter when clicked', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Bu Yıl')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Tüm Zamanlar'));
    });

    // After clicking "Tüm Zamanlar", debtors/creditors should be re-fetched
    await waitFor(() => {
      expect(window.electronAPI.dashboard.getTopDebtors).toHaveBeenCalled();
    });
  });

  // ---------- Navigation ----------

  it('should navigate to transactions when "Tümünü Gör" is clicked on transactions section', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Son İşlemler')).toBeInTheDocument();
    });

    // There are two "Tümünü Gör" buttons - transactions and projects
    const viewAllButtons = screen.getAllByText('Tümünü Gör');
    await act(async () => {
      fireEvent.click(viewAllButtons[0]);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/transactions');
  });

  it('should navigate to projects when "Tümünü Gör" is clicked on projects section', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Aktif Projeler')).toBeInTheDocument();
    });

    const viewAllButtons = screen.getAllByText('Tümünü Gör');
    await act(async () => {
      fireEvent.click(viewAllButtons[1]);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/projects');
  });

  it('should navigate to company detail when a debtor is clicked', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Borçlu Firma A')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Borçlu Firma A'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('/companies/1');
  });

  // ---------- Error handling ----------

  it('should show error toast when debtors/creditors fail to load', async () => {
    (window.electronAPI.dashboard.getTopDebtors as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));
    (window.electronAPI.dashboard.getTopCreditors as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Veriler yüklenirken hata oluştu');
    });
  });

  // ---------- Transaction detail modal ----------

  it('should open transaction detail modal when a transaction is clicked', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Daire satış faturası')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Daire satış faturası'));
    });

    await waitFor(() => {
      expect(screen.getByText('İşlem Detayı')).toBeInTheDocument();
    });
  });
});
