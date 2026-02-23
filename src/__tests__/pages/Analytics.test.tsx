import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '../../i18n';
import Analytics from '../../pages/Analytics';

// ==================== MOCKS ====================

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

// Mock recharts to avoid rendering issues in JSDOM
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ReferenceLine: () => null,
}));

// ==================== HELPERS ====================

const mockTransactions = [
  { id: 1, type: 'invoice_out', scope: 'cari', amount: 100000, currency: 'TRY', date: '2025-03-15', description: 'Test', company_id: 1, company_name: 'A', project_id: null, project_name: null },
  { id: 2, type: 'invoice_in', scope: 'project', amount: 50000, currency: 'TRY', date: '2025-06-10', description: 'Test2', company_id: null, company_name: null, project_id: 1, project_name: 'B' },
];

const mockProjects = [
  { id: 1, code: 'P-001', name: 'Konut Projesi', status: 'active', total_income: 500000, total_expense: 300000 },
  { id: 2, code: 'P-002', name: 'Villa Projesi', status: 'active', total_income: 800000, total_expense: 600000 },
];

const mockCompanies = [
  { id: 1, name: 'ABC İnşaat', balance: 75000 },
  { id: 2, name: 'XYZ Tedarik', balance: -25000 },
];

const mockMonthlyStats = [
  { month: '01', income: 100000, expense: 80000, collected: 90000, paid: 70000 },
  { month: '02', income: 120000, expense: 70000, collected: 110000, paid: 60000 },
  { month: '03', income: 150000, expense: 90000, collected: 130000, paid: 80000 },
];

function setupMocksEmpty() {
  (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.company.getWithBalance as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.analytics.getMonthlyStats as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.analytics.getProjectCategoryBreakdown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.analytics.getCompanyMonthlyStats as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.analytics.getCashFlowReport as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.analytics.getAgingReceivables as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

function setupMocksWithData() {
  (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);
  (window.electronAPI.company.getWithBalance as ReturnType<typeof vi.fn>).mockResolvedValue(mockCompanies);
  (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockTransactions);
  (window.electronAPI.analytics.getMonthlyStats as ReturnType<typeof vi.fn>).mockResolvedValue(mockMonthlyStats);
  (window.electronAPI.analytics.getProjectCategoryBreakdown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.analytics.getCompanyMonthlyStats as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.analytics.getCashFlowReport as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.analytics.getAgingReceivables as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

// ==================== TESTS ====================

describe('Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocksEmpty();
  });

  // ---------- Loading state ----------

  it('should show loading spinner while initial data is loading', async () => {
    (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.company.getWithBalance as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    await act(async () => {
      render(<Analytics />);
    });

    // While loading, the page title should NOT be visible (Analytics returns LoadingSpinner early)
    expect(screen.queryByText('Analizler & Raporlar')).not.toBeInTheDocument();
  });

  // ---------- Initial render ----------

  it('should render page title and subtitle after loading', async () => {
    await act(async () => {
      render(<Analytics />);
    });

    await waitFor(() => {
      expect(screen.getByText('Analizler & Raporlar')).toBeInTheDocument();
      expect(screen.getByText('Finansal analiz ve grafikler')).toBeInTheDocument();
    });
  });

  it('should render tab navigation with all three tabs', async () => {
    await act(async () => {
      render(<Analytics />);
    });

    await waitFor(() => {
      expect(screen.getByText('Grafikler')).toBeInTheDocument();
      expect(screen.getByText('Nakit Akışı')).toBeInTheDocument();
      expect(screen.getByText('Vadesi Geçen Alacaklar')).toBeInTheDocument();
    });
  });

  it('should render the year filter dropdown', async () => {
    await act(async () => {
      render(<Analytics />);
    });

    await waitFor(() => {
      // "Tüm Zamanlar" is the "all" option in the year filter
      expect(screen.getByText('Tüm Zamanlar')).toBeInTheDocument();
    });
  });

  // ---------- Empty state ----------

  it('should show empty state for charts when no data exists', async () => {
    await act(async () => {
      render(<Analytics />);
    });

    await waitFor(() => {
      // When no monthly stats, charts show "Veri bulunamadı"
      const noDataElements = screen.getAllByText('Veri bulunamadı');
      expect(noDataElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show project selection prompt in charts tab', async () => {
    await act(async () => {
      render(<Analytics />);
    });

    await waitFor(() => {
      expect(screen.getByText('Proje Gider Dağılımı')).toBeInTheDocument();
      expect(screen.getByText('Analiz için bir proje seçin')).toBeInTheDocument();
    });
  });

  it('should show company selection prompt in charts tab', async () => {
    await act(async () => {
      render(<Analytics />);
    });

    await waitFor(() => {
      expect(screen.getByText('Cari Hareket Analizi')).toBeInTheDocument();
      expect(screen.getByText('Analiz için bir cari hesap seçin')).toBeInTheDocument();
    });
  });

  // ---------- Data rendering ----------

  it('should render summary cards with income, expense, and profit labels', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Analytics />);
    });

    await waitFor(() => {
      // Since the transactions have year 2025, the selected year becomes 2025
      // so the labels are the yearly variants
      const incomeLabels = screen.getAllByText(/Gelir/);
      expect(incomeLabels.length).toBeGreaterThanOrEqual(1);
      const expenseLabels = screen.getAllByText(/Gider/);
      expect(expenseLabels.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render chart section titles', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Analytics />);
    });

    await waitFor(() => {
      expect(screen.getByText('Aylık Gelir-Gider Trendi')).toBeInTheDocument();
      expect(screen.getByText('Aylık Kar/Zarar')).toBeInTheDocument();
    });
  });

  // ---------- Tab switching ----------

  it('should switch to cash flow tab', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Analytics />);
    });

    await waitFor(() => {
      expect(screen.getByText('Grafikler')).toBeInTheDocument();
    });

    const cashFlowTab = screen.getByRole('tab', { name: /Nakit Akışı/i });
    await act(async () => {
      fireEvent.click(cashFlowTab);
    });

    // Cash flow tab content should now be visible
    // When selectedYear is a specific year, it will try to load cash flow data
    await waitFor(() => {
      expect(window.electronAPI.analytics.getCashFlowReport).toHaveBeenCalled();
    });
  });

  it('should switch to aging tab', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Analytics />);
    });

    await waitFor(() => {
      expect(screen.getByText('Grafikler')).toBeInTheDocument();
    });

    const agingTab = screen.getByRole('tab', { name: /Vadesi Geçen Alacaklar/i });
    await act(async () => {
      fireEvent.click(agingTab);
    });

    await waitFor(() => {
      expect(window.electronAPI.analytics.getAgingReceivables).toHaveBeenCalled();
    });
  });

  // ---------- Error handling ----------

  it('should show error toast when initial loading fails', async () => {
    (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));

    await act(async () => {
      render(<Analytics />);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Veriler yüklenirken hata oluştu');
    });
  });
});
