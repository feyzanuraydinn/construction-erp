import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '../../i18n';
import Companies from '../../pages/Companies';
import type { CompanyWithBalance } from '../../types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/companies' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

const mockCompanies: CompanyWithBalance[] = [
  {
    id: 1,
    name: 'ABC İnşaat A.Ş.',
    type: 'company',
    account_type: 'customer',
    phone: '05551234567',
    email: 'info@abc.com',
    address: 'Istanbul',
    receivable: 100000,
    payable: 30000,
    balance: 70000,
    created_at: '2024-01-01',
    updated_at: '2024-06-01',
  } as CompanyWithBalance,
  {
    id: 2,
    name: 'Mehmet Yılmaz',
    type: 'person',
    account_type: 'supplier',
    phone: '05559876543',
    email: null,
    address: null,
    receivable: 0,
    payable: 50000,
    balance: -50000,
    created_at: '2024-02-01',
    updated_at: '2024-07-01',
  } as CompanyWithBalance,
  {
    id: 3,
    name: 'XYZ Beton Ltd.',
    type: 'company',
    account_type: 'subcontractor',
    phone: null,
    email: 'info@xyz.com',
    address: 'Ankara',
    receivable: 20000,
    payable: 80000,
    balance: -60000,
    created_at: '2024-03-01',
    updated_at: '2024-08-01',
  } as CompanyWithBalance,
];

describe('Companies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.electronAPI.company.getWithBalance as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it('should render page title and subtitle', async () => {
    await act(async () => {
      render(<Companies />);
    });

    await waitFor(() => {
      expect(screen.getByText('Cari Hesaplar')).toBeInTheDocument();
      expect(screen.getByText('Müşteri, tedarikçi ve taşeron yönetimi')).toBeInTheDocument();
    });
  });

  it('should render the new company button', async () => {
    await act(async () => {
      render(<Companies />);
    });

    await waitFor(() => {
      expect(screen.getByText('Yeni Cari')).toBeInTheDocument();
    });
  });

  it('should render the export button', async () => {
    await act(async () => {
      render(<Companies />);
    });

    await waitFor(() => {
      expect(screen.getByText("Excel'e Aktar")).toBeInTheDocument();
    });
  });

  it('should show loading spinner while data is loading', async () => {
    (window.electronAPI.company.getWithBalance as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );

    await act(async () => {
      render(<Companies />);
    });

    expect(screen.getByText('Cari Hesaplar')).toBeInTheDocument();
  });

  it('should show empty state when no companies exist', async () => {
    await act(async () => {
      render(<Companies />);
    });

    await waitFor(() => {
      expect(screen.getByText('Cari hesap bulunamadı')).toBeInTheDocument();
      expect(screen.getByText('Yeni bir cari hesap ekleyerek başlayın')).toBeInTheDocument();
    });
  });

  it('should render companies in the table', async () => {
    (window.electronAPI.company.getWithBalance as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCompanies
    );

    await act(async () => {
      render(<Companies />);
    });

    await waitFor(() => {
      expect(screen.getByText('ABC İnşaat A.Ş.')).toBeInTheDocument();
      expect(screen.getByText('Mehmet Yılmaz')).toBeInTheDocument();
      expect(screen.getByText('XYZ Beton Ltd.')).toBeInTheDocument();
    });
  });

  it('should render table column headers', async () => {
    (window.electronAPI.company.getWithBalance as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCompanies
    );

    await act(async () => {
      render(<Companies />);
    });

    await waitFor(() => {
      expect(screen.getByText('Ad/Ünvan')).toBeInTheDocument();
      expect(screen.getByText('Telefon')).toBeInTheDocument();
      expect(screen.getByText('Alacak')).toBeInTheDocument();
      expect(screen.getByText('Borç')).toBeInTheDocument();
      expect(screen.getByText('Bakiye')).toBeInTheDocument();
    });
  });

  it('should have a search input with correct placeholder', async () => {
    await act(async () => {
      render(<Companies />);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Cari ara...')).toBeInTheDocument();
    });
  });

  it('should filter companies when searching', async () => {
    (window.electronAPI.company.getWithBalance as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCompanies
    );

    await act(async () => {
      render(<Companies />);
    });

    await waitFor(() => {
      expect(screen.getByText('ABC İnşaat A.Ş.')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Cari ara...');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Mehmet' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Mehmet Yılmaz')).toBeInTheDocument();
    });
  });

  it('should navigate to company detail when a row is clicked', async () => {
    (window.electronAPI.company.getWithBalance as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCompanies
    );

    await act(async () => {
      render(<Companies />);
    });

    await waitFor(() => {
      expect(screen.getByText('ABC İnşaat A.Ş.')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('ABC İnşaat A.Ş.'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('/companies/1');
  });

  it('should show error toast when loading fails', async () => {
    (window.electronAPI.company.getWithBalance as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('DB Error')
    );

    await act(async () => {
      render(<Companies />);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Veriler yüklenemedi:'));
    });
  });

  it('should show add new button in empty state', async () => {
    await act(async () => {
      render(<Companies />);
    });

    await waitFor(() => {
      expect(screen.getByText('Yeni Cari Ekle')).toBeInTheDocument();
    });
  });
});
