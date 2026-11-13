import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '../../i18n';
import CompanyDetail from '../../pages/CompanyDetail';
import type { Company, TransactionWithDetails, Project, Category } from '../../types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
  useLocation: () => ({ pathname: '/companies/1', search: '' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

const mockCompany: Company = {
  id: 1,
  type: 'company',
  account_type: 'customer',
  name: 'ABC İnşaat A.Ş.',
  phone: '05551234567',
  email: 'info@abc.com',
  address: 'İstanbul, Kadıköy',
  tax_office: 'Kadıköy VD',
  tax_number: '1234567890',
  trade_registry_no: null,
  contact_person: 'Ahmet Yılmaz',
  bank_name: 'Ziraat Bankası',
  iban: 'TR000000000000000000000000',
  notes: 'Önemli müşteri',
  is_active: 1,
  created_at: '2024-01-01',
  updated_at: '2024-06-01',
};

const mockTransactions: TransactionWithDetails[] = [
  {
    id: 10,
    type: 'invoice_out',
    scope: 'cari',
    amount: 150000,
    amount_try: 150000,
    currency: 'TRY',
    exchange_rate: 1,
    date: '2025-06-01',
    description: 'Daire satış faturası',
    company_id: 1,
    company_name: 'ABC İnşaat A.Ş.',
    project_id: 1,
    project_name: 'Konut Projesi',
    category_id: 1,
    category_name: 'Daire/Konut Satışı',
    category_color: '#3b82f6',
    document_no: 'F-001',
    notes: null,
    created_at: '2025-06-01',
    updated_at: '2025-06-01',
  },
  {
    id: 11,
    type: 'payment_in',
    scope: 'cari',
    amount: 100000,
    amount_try: 100000,
    currency: 'TRY',
    exchange_rate: 1,
    date: '2025-06-15',
    description: 'Müşteriden tahsilat',
    company_id: 1,
    company_name: 'ABC İnşaat A.Ş.',
    project_id: null,
    project_name: null,
    category_id: null,
    category_name: null,
    category_color: null,
    document_no: null,
    notes: null,
    created_at: '2025-06-15',
    updated_at: '2025-06-15',
  },
];

const mockProjects: Project[] = [
  {
    id: 1,
    code: 'P-001',
    name: 'Konut Projesi',
    ownership_type: 'own',
    status: 'active',
    is_active: 1,
    created_at: '2024-01-01',
    updated_at: '2024-06-01',
  },
];

const mockCategories: Category[] = [
  {
    id: 1,
    name: 'Daire/Konut Satışı',
    type: 'invoice_out',
    color: '#3b82f6',
    is_default: 1,
    created_at: '2024-01-01',
  },
  {
    id: 2,
    name: 'Beton',
    type: 'invoice_in',
    color: '#ef4444',
    is_default: 1,
    created_at: '2024-01-01',
  },
];

function setupMocksWithData() {
  (window.electronAPI.company.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockCompany);
  (window.electronAPI.transaction.getByCompany as ReturnType<typeof vi.fn>).mockResolvedValue(
    mockTransactions
  );
  (window.electronAPI.project.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);
  (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(
    mockCategories
  );
}

function setupMocksEmpty() {
  (window.electronAPI.company.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockCompany);
  (window.electronAPI.transaction.getByCompany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.project.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

function setupMocksNotFound() {
  (window.electronAPI.company.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  (window.electronAPI.transaction.getByCompany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.project.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

describe('CompanyDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocksWithData();
  });

  it('should show loading spinner while data is loading', async () => {
    (window.electronAPI.company.getById as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );
    (window.electronAPI.transaction.getByCompany as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );
    (window.electronAPI.project.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );
    (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );

    await act(async () => {
      render(<CompanyDetail />);
    });

    expect(screen.getByRole('status', { name: 'Yükleniyor...' })).toBeInTheDocument();
  });

  it('should show not found state when company does not exist', async () => {
    setupMocksNotFound();

    await act(async () => {
      render(<CompanyDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText('Cari bulunamadı')).toBeInTheDocument();
      expect(screen.getByText('Aradığınız cari hesap mevcut değil')).toBeInTheDocument();
    });
  });

  it('should navigate back to companies list when not-found action is clicked', async () => {
    setupMocksNotFound();

    await act(async () => {
      render(<CompanyDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText('Carilere Dön')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Carilere Dön'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('/companies');
  });

  it('should render company name in page title', async () => {
    await act(async () => {
      render(<CompanyDetail />);
    });

    await waitFor(() => {
      const nameElements = screen.getAllByText('ABC İnşaat A.Ş.');
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
      const pageTitle = nameElements.find((el) => el.classList.contains('page-title'));
      expect(pageTitle).toBeDefined();
    });
  });

  it('should display company contact details', async () => {
    await act(async () => {
      render(<CompanyDetail />);
    });

    await waitFor(() => {
      const phoneElements = screen.getAllByText('05551234567');
      expect(phoneElements.length).toBeGreaterThanOrEqual(1);
      const emailElements = screen.getAllByText('info@abc.com');
      expect(emailElements.length).toBeGreaterThanOrEqual(1);
      const addressElements = screen.getAllByText('İstanbul, Kadıköy');
      expect(addressElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should display company info section for company type', async () => {
    await act(async () => {
      render(<CompanyDetail />);
    });

    await waitFor(() => {
      const firmaElements = screen.getAllByText('Firma Bilgileri');
      expect(firmaElements.length).toBeGreaterThanOrEqual(1);
      const taxOfficeElements = screen.getAllByText('Kadıköy VD');
      expect(taxOfficeElements.length).toBeGreaterThanOrEqual(1);
      const taxNumberElements = screen.getAllByText('1234567890');
      expect(taxNumberElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should display financial stat cards', async () => {
    await act(async () => {
      render(<CompanyDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText('Satış Faturaları')).toBeInTheDocument();
      expect(screen.getByText('Tahsilatlar')).toBeInTheDocument();
      expect(screen.getByText('Alış Faturaları')).toBeInTheDocument();
      expect(screen.getByText('Ödemeler')).toBeInTheDocument();
      expect(screen.getByText('Alacak Bakiyesi')).toBeInTheDocument();
      expect(screen.getByText('Borç Bakiyesi')).toBeInTheDocument();
      expect(screen.getByText('Net Bakiye')).toBeInTheDocument();
    });
  });

  it('shows an overpaid supplier as a receivable instead of a negative debt', async () => {
    const supplierTransactions: TransactionWithDetails[] = [
      {
        ...mockTransactions[0],
        id: 20,
        type: 'invoice_in',
        amount: 198500,
        amount_try: 198500,
        description: 'Alış',
      },
      {
        ...mockTransactions[1],
        id: 21,
        type: 'payment_out',
        amount: 208500,
        amount_try: 208500,
        description: 'Ödeme',
      },
    ];
    vi.mocked(window.electronAPI.transaction.getByCompany).mockResolvedValue(supplierTransactions);

    await act(async () => {
      render(<CompanyDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText('Fazla ödeme yaptık')).toBeInTheDocument();
    });
    expect(screen.getByText('Biz borçluyuz')).toBeInTheDocument();
    expect(screen.queryByText(/^-.*10\.000/)).not.toBeInTheDocument();
  });

  it('should render transaction history section with transactions', async () => {
    await act(async () => {
      render(<CompanyDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText('İşlem Geçmişi')).toBeInTheDocument();
      const invoiceElements = screen.getAllByText('Daire satış faturası');
      expect(invoiceElements.length).toBeGreaterThanOrEqual(1);
      const paymentElements = screen.getAllByText('Müşteriden tahsilat');
      expect(paymentElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show empty state when there are no transactions', async () => {
    setupMocksEmpty();

    await act(async () => {
      render(<CompanyDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText('İşlem bulunamadı')).toBeInTheDocument();
      expect(screen.getByText('Bu cari hesaba ait işlem kaydı yok')).toBeInTheDocument();
    });
  });

  it('should render action buttons in header', async () => {
    await act(async () => {
      render(<CompanyDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText("Excel'e Aktar")).toBeInTheDocument();
      expect(screen.getByText('Yazdır')).toBeInTheDocument();
      expect(screen.getByText('Yeni İşlem')).toBeInTheDocument();
    });
  });

  it('should navigate back to companies when back button is clicked', async () => {
    await act(async () => {
      render(<CompanyDetail />);
    });

    await waitFor(() => {
      const nameElements = screen.getAllByText('ABC İnşaat A.Ş.');
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
    });

    const backButton = screen.getByLabelText('Geri');
    await act(async () => {
      fireEvent.click(backButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/companies');
  });

  it('should show error toast when API call fails', async () => {
    (window.electronAPI.company.getById as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('DB Error')
    );

    await act(async () => {
      render(<CompanyDetail />);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Veriler yüklenemedi:'));
    });
  });

  it('should render transaction table column headers', async () => {
    await act(async () => {
      render(<CompanyDetail />);
    });

    await waitFor(() => {
      const dateHeaders = screen.getAllByText('Tarih');
      expect(dateHeaders.length).toBeGreaterThanOrEqual(1);
      const typeHeaders = screen.getAllByText('Tür');
      expect(typeHeaders.length).toBeGreaterThanOrEqual(1);
      const amountHeaders = screen.getAllByText('Tutar');
      expect(amountHeaders.length).toBeGreaterThanOrEqual(1);
    });
  });
});
