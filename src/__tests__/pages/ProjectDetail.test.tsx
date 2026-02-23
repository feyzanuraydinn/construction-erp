import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '../../i18n';
import ProjectDetail from '../../pages/ProjectDetail';
import type { ProjectWithSummary, TransactionWithDetails, Company, Category, CategoryBreakdown } from '../../types';

// ==================== MOCKS ====================

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
  useLocation: () => ({ pathname: '/projects/1', search: '' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

// Mock recharts to avoid ResizeObserver issues in tests
vi.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div>{children}</div>,
  Cell: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Tooltip: () => <div />,
}));

// ==================== TEST DATA ====================

const mockProject: ProjectWithSummary = {
  id: 1,
  code: 'P-001',
  name: 'Merkez Konut Projesi',
  ownership_type: 'own',
  status: 'active',
  project_type: 'residential',
  location: 'İstanbul, Kartal',
  total_area: 5000,
  unit_count: 24,
  estimated_budget: 10000000,
  planned_start: '2025-01-01',
  planned_end: '2026-06-30',
  actual_start: '2025-02-15',
  actual_end: null,
  description: 'Merkez konut projesi açıklaması',
  client_company_id: null,
  client_name: null,
  is_active: 1,
  created_at: '2024-12-01',
  updated_at: '2025-06-01',
  total_invoice_out: 200000,
  total_invoice_in: 120000,
  total_collected: 180000,
  total_paid: 100000,
  independent_payment_in: 30000,
  independent_payment_out: 20000,
  total_income: 230000,
  total_expense: 140000,
  transaction_count: 5,
  party_count: 2,
};

const mockTransactions: TransactionWithDetails[] = [
  {
    id: 30,
    type: 'invoice_out',
    scope: 'project',
    amount: 200000,
    amount_try: 200000,
    currency: 'TRY',
    exchange_rate: 1,
    date: '2025-03-01',
    description: 'Daire satış faturası A-1',
    company_id: 1,
    company_name: 'Müşteri A.Ş.',
    project_id: 1,
    project_name: 'Merkez Konut Projesi',
    category_id: 1,
    category_name: 'Daire/Konut Satışı',
    category_color: '#22c55e',
    document_no: 'PF-001',
    notes: null,
    created_at: '2025-03-01',
    updated_at: '2025-03-01',
  },
  {
    id: 31,
    type: 'invoice_in',
    scope: 'project',
    amount: 120000,
    amount_try: 120000,
    currency: 'TRY',
    exchange_rate: 1,
    date: '2025-04-01',
    description: 'Beton alım faturası',
    company_id: 2,
    company_name: 'Tedarikçi Ltd.',
    project_id: 1,
    project_name: 'Merkez Konut Projesi',
    category_id: 9,
    category_name: 'Beton',
    category_color: '#ef4444',
    document_no: 'PF-002',
    notes: null,
    created_at: '2025-04-01',
    updated_at: '2025-04-01',
  },
];

const mockCompanies: Company[] = [
  {
    id: 1,
    type: 'company',
    account_type: 'customer',
    name: 'Müşteri A.Ş.',
    phone: '05551111111',
    email: 'info@musteri.com',
    is_active: 1,
    created_at: '2024-01-01',
    updated_at: '2024-06-01',
  },
  {
    id: 2,
    type: 'company',
    account_type: 'supplier',
    name: 'Tedarikçi Ltd.',
    phone: '05552222222',
    email: 'info@tedarikci.com',
    is_active: 1,
    created_at: '2024-01-01',
    updated_at: '2024-06-01',
  },
];

const mockCategories: Category[] = [
  { id: 1, name: 'Daire/Konut Satışı', type: 'invoice_out', color: '#22c55e', is_default: 1, created_at: '2024-01-01' },
  { id: 9, name: 'Beton', type: 'invoice_in', color: '#ef4444', is_default: 1, created_at: '2024-01-01' },
];

const mockCategoryBreakdown: CategoryBreakdown[] = [
  { category: 'Beton', color: '#ef4444', total: 120000 },
];

// ==================== HELPERS ====================

function setupMocksWithData() {
  (window.electronAPI.project.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockProject);
  (window.electronAPI.transaction.getByProject as ReturnType<typeof vi.fn>).mockResolvedValue(mockTransactions);
  (window.electronAPI.company.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockCompanies);
  (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockCategories);
  (window.electronAPI.analytics.getProjectCategoryBreakdown as ReturnType<typeof vi.fn>).mockResolvedValue(mockCategoryBreakdown);
}

function setupMocksEmpty() {
  (window.electronAPI.project.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockProject);
  (window.electronAPI.transaction.getByProject as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.company.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.analytics.getProjectCategoryBreakdown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

function setupMocksNotFound() {
  (window.electronAPI.project.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  (window.electronAPI.transaction.getByProject as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.company.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.analytics.getProjectCategoryBreakdown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

// ==================== TESTS ====================

describe('ProjectDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocksWithData();
  });

  // ---------- Loading state ----------

  it('should show loading spinner while data is loading', async () => {
    (window.electronAPI.project.getById as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.transaction.getByProject as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.company.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.analytics.getProjectCategoryBreakdown as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    await act(async () => {
      render(<ProjectDetail />);
    });

    expect(screen.getByRole('status', { name: 'Yükleniyor...' })).toBeInTheDocument();
  });

  // ---------- Not found state ----------

  it('should show not found state when project does not exist', async () => {
    setupMocksNotFound();

    await act(async () => {
      render(<ProjectDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText('Proje bulunamadı')).toBeInTheDocument();
      expect(screen.getByText('Aradığınız proje mevcut değil')).toBeInTheDocument();
    });
  });

  it('should navigate back to projects list when not-found action is clicked', async () => {
    setupMocksNotFound();

    await act(async () => {
      render(<ProjectDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText('Projelere Dön')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Projelere Dön'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('/projects');
  });

  // ---------- Initial render after data loads ----------

  it('should render project name in page title', async () => {
    await act(async () => {
      render(<ProjectDetail />);
    });

    await waitFor(() => {
      // Project name appears in header and possibly in print view
      const nameElements = screen.getAllByText('Merkez Konut Projesi');
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
      const pageTitle = nameElements.find((el) => el.classList.contains('page-title'));
      expect(pageTitle).toBeDefined();
    });
  });

  it('should display project code and ownership badge', async () => {
    await act(async () => {
      render(<ProjectDetail />);
    });

    await waitFor(() => {
      // Project code P-001 should be visible
      const codeElements = screen.getAllByText((content) => content.includes('P-001'));
      expect(codeElements.length).toBeGreaterThanOrEqual(1);
      // Ownership badge: "Kendi Projemiz"
      const ownershipElements = screen.getAllByText('Kendi Projemiz');
      expect(ownershipElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should display project info section', async () => {
    await act(async () => {
      render(<ProjectDetail />);
    });

    await waitFor(() => {
      // "Proje Bilgileri" appears in the info card (may also appear in print view)
      const infoElements = screen.getAllByText('Proje Bilgileri');
      expect(infoElements.length).toBeGreaterThanOrEqual(1);
      // Location
      const locationElements = screen.getAllByText('İstanbul, Kartal');
      expect(locationElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------- Stats cards ----------

  it('should display financial stat cards for own project', async () => {
    await act(async () => {
      render(<ProjectDetail />);
    });

    await waitFor(() => {
      // Stats titles for own project
      const incomeElements = screen.getAllByText('Toplam Gelir');
      expect(incomeElements.length).toBeGreaterThanOrEqual(1);
      const expenseElements = screen.getAllByText('Toplam Gider');
      expect(expenseElements.length).toBeGreaterThanOrEqual(1);
      const profitElements = screen.getAllByText('Proje Kârı');
      expect(profitElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------- Transaction list ----------

  it('should render transactions in the table', async () => {
    await act(async () => {
      render(<ProjectDetail />);
    });

    await waitFor(() => {
      // Transaction descriptions appear in both table and print view
      const invoiceElements = screen.getAllByText('Daire satış faturası A-1');
      expect(invoiceElements.length).toBeGreaterThanOrEqual(1);
      const betonElements = screen.getAllByText('Beton alım faturası');
      expect(betonElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show empty state when there are no transactions', async () => {
    setupMocksEmpty();

    await act(async () => {
      render(<ProjectDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText('İşlem bulunamadı')).toBeInTheDocument();
    });
  });

  // ---------- Header buttons ----------

  it('should render action buttons in header', async () => {
    await act(async () => {
      render(<ProjectDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText("Excel'e Aktar")).toBeInTheDocument();
      expect(screen.getByText('Yazdır')).toBeInTheDocument();
      expect(screen.getByText('Yeni İşlem')).toBeInTheDocument();
    });
  });

  // ---------- Back navigation ----------

  it('should navigate back to projects when back button is clicked', async () => {
    await act(async () => {
      render(<ProjectDetail />);
    });

    await waitFor(() => {
      const nameElements = screen.getAllByText('Merkez Konut Projesi');
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
    });

    const backButton = screen.getByLabelText('Geri');
    await act(async () => {
      fireEvent.click(backButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/projects');
  });

  // ---------- Error handling ----------

  it('should show error toast when API call fails', async () => {
    (window.electronAPI.project.getById as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB Error'));

    await act(async () => {
      render(<ProjectDetail />);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Veriler yüklenirken hata oluştu');
    });
  });

  // ---------- Stakeholders tab ----------

  it('should show stakeholders when parties tab is clicked', async () => {
    await act(async () => {
      render(<ProjectDetail />);
    });

    // Wait for data to load
    await waitFor(() => {
      const nameElements = screen.getAllByText('Merkez Konut Projesi');
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
    });

    // The tab labels use missing i18n keys, so they render as key strings
    // t('projectDetail.transactionsTab') and t('projectDetail.partiesTab')
    // These resolve to the key itself since they are not in tr.json
    const partiesTab = screen.getByText('projectDetail.partiesTab');
    await act(async () => {
      fireEvent.click(partiesTab);
    });

    // After switching to parties tab, stakeholder company names should be visible
    await waitFor(() => {
      const musteriElements = screen.getAllByText('Müşteri A.Ş.');
      expect(musteriElements.length).toBeGreaterThanOrEqual(1);
      const tedarikciElements = screen.getAllByText('Tedarikçi Ltd.');
      expect(tedarikciElements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
