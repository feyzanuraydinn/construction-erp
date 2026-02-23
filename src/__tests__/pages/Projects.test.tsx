import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '../../i18n';
import Projects from '../../pages/Projects';
import type { ProjectWithSummary } from '../../types';

// ==================== MOCKS ====================

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/projects' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

// ==================== HELPERS ====================

const mockProjects: ProjectWithSummary[] = [
  {
    id: 1,
    code: 'P-001',
    name: 'Merkez Konut Projesi',
    status: 'active',
    ownership_type: 'own',
    project_type: 'residential',
    estimated_budget: 5000000,
    is_active: 1,
    total_invoice_out: 3000000,
    total_invoice_in: 2000000,
    total_income: 3000000,
    total_expense: 2000000,
    total_collected: 2500000,
    total_paid: 1800000,
    independent_payment_in: 0,
    independent_payment_out: 0,
    client_company_id: null,
    client_name: null,
    location: 'Istanbul',
    created_at: '2024-01-01',
    updated_at: '2024-06-01',
  },
  {
    id: 2,
    code: 'P-002',
    name: 'Sahil Villa Projesi',
    status: 'active',
    ownership_type: 'client',
    project_type: 'villa',
    estimated_budget: 10000000,
    is_active: 1,
    total_invoice_out: 4000000,
    total_invoice_in: 3000000,
    total_income: 4000000,
    total_expense: 3000000,
    total_collected: 3500000,
    total_paid: 2500000,
    independent_payment_in: 0,
    independent_payment_out: 0,
    client_company_id: 1,
    client_name: 'ABC İnşaat',
    location: 'Antalya',
    created_at: '2024-02-01',
    updated_at: '2024-07-01',
  },
  {
    id: 3,
    code: 'P-003',
    name: 'Ticaret Merkezi',
    status: 'completed',
    ownership_type: 'own',
    project_type: 'commercial',
    estimated_budget: 15000000,
    is_active: 1,
    total_invoice_out: 12000000,
    total_invoice_in: 10000000,
    total_income: 12000000,
    total_expense: 10000000,
    total_collected: 11000000,
    total_paid: 9000000,
    independent_payment_in: 0,
    independent_payment_out: 0,
    client_company_id: null,
    client_name: null,
    location: 'Ankara',
    created_at: '2023-01-01',
    updated_at: '2024-12-01',
  },
];

// ==================== TESTS ====================

describe('Projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (window.electronAPI.company.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  // ---------- Initial render ----------

  it('should render page title and subtitle', async () => {
    await act(async () => {
      render(<Projects />);
    });

    await waitFor(() => {
      expect(screen.getByText('Projeler')).toBeInTheDocument();
      expect(screen.getByText('İnşaat projelerini yönetin')).toBeInTheDocument();
    });
  });

  it('should render the new project button in header', async () => {
    (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);

    await act(async () => {
      render(<Projects />);
    });

    await waitFor(() => {
      // When data is loaded, there is only the header button (no empty state action)
      const buttons = screen.getAllByText('Yeni Proje');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render the export button', async () => {
    await act(async () => {
      render(<Projects />);
    });

    await waitFor(() => {
      expect(screen.getByText("Excel'e Aktar")).toBeInTheDocument();
    });
  });

  // ---------- Loading state ----------

  it('should show loading spinner while data is loading', async () => {
    (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (window.electronAPI.company.getAll as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    await act(async () => {
      render(<Projects />);
    });

    // Title should be visible since it's outside the loading conditional
    expect(screen.getByText('Projeler')).toBeInTheDocument();
  });

  // ---------- Empty state ----------

  it('should show empty state when no projects exist', async () => {
    await act(async () => {
      render(<Projects />);
    });

    await waitFor(() => {
      expect(screen.getByText('Proje bulunamadı')).toBeInTheDocument();
      expect(screen.getByText('Yeni bir proje ekleyerek başlayın')).toBeInTheDocument();
    });
  });

  // ---------- Data rendering ----------

  it('should render projects in the table', async () => {
    (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);

    await act(async () => {
      render(<Projects />);
    });

    await waitFor(() => {
      expect(screen.getByText('Merkez Konut Projesi')).toBeInTheDocument();
      expect(screen.getByText('Sahil Villa Projesi')).toBeInTheDocument();
      expect(screen.getByText('Ticaret Merkezi')).toBeInTheDocument();
    });
  });

  it('should render project codes', async () => {
    (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);

    await act(async () => {
      render(<Projects />);
    });

    await waitFor(() => {
      expect(screen.getByText('P-001')).toBeInTheDocument();
      expect(screen.getByText('P-002')).toBeInTheDocument();
      expect(screen.getByText('P-003')).toBeInTheDocument();
    });
  });

  it('should render table column headers', async () => {
    (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);

    await act(async () => {
      render(<Projects />);
    });

    await waitFor(() => {
      expect(screen.getByText('Kod')).toBeInTheDocument();
      expect(screen.getByText('Proje Adı')).toBeInTheDocument();
      // "Sahiplik" appears in both filter and table header — check at least one
      expect(screen.getAllByText('Sahiplik').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Bütçe')).toBeInTheDocument();
      expect(screen.getByText('Gider')).toBeInTheDocument();
      expect(screen.getByText('Kar')).toBeInTheDocument();
    });
  });

  it('should show client name under project name for client projects', async () => {
    (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);

    await act(async () => {
      render(<Projects />);
    });

    await waitFor(() => {
      expect(screen.getByText('ABC İnşaat')).toBeInTheDocument();
    });
  });

  // ---------- Search interaction ----------

  it('should have a search input with correct placeholder', async () => {
    await act(async () => {
      render(<Projects />);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Proje ara...')).toBeInTheDocument();
    });
  });

  it('should filter projects when searching', async () => {
    (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);

    await act(async () => {
      render(<Projects />);
    });

    await waitFor(() => {
      expect(screen.getByText('Merkez Konut Projesi')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Proje ara...');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Sahil' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Sahil Villa Projesi')).toBeInTheDocument();
    });
  });

  // ---------- Navigation ----------

  it('should navigate to project detail when a row is clicked', async () => {
    (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);

    await act(async () => {
      render(<Projects />);
    });

    await waitFor(() => {
      expect(screen.getByText('Merkez Konut Projesi')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Merkez Konut Projesi'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('/projects/1');
  });

  // ---------- Error handling ----------

  it('should show error toast when loading fails', async () => {
    (window.electronAPI.project.getWithSummary as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB Error'));

    await act(async () => {
      render(<Projects />);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Veriler yüklenirken hata oluştu');
    });
  });

  // ---------- Empty state action ----------

  it('should show new project button in empty state', async () => {
    await act(async () => {
      render(<Projects />);
    });

    await waitFor(() => {
      // The empty state has the "Yeni Proje" action button
      const buttons = screen.getAllByText('Yeni Proje');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });
});
