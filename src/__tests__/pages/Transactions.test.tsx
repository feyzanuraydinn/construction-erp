import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import '../../i18n';
import Transactions from '../../pages/Transactions';
import type { TransactionWithDetails } from '../../types';

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
  (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(
    mockTransactions
  );
  (window.electronAPI.company.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([
    { id: 1, name: 'ABC İnşaat', company_type: 'company', account_type: 'customer' },
  ]);
  (window.electronAPI.project.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([
    { id: 1, code: 'P-001', name: 'Konut Projesi', status: 'active' },
  ]);
  (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
}

describe('Transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocksEmpty();
  });

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

  it('should show loading state while data is loading', async () => {
    (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );
    (window.electronAPI.company.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );
    (window.electronAPI.project.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );
    (window.electronAPI.category.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    );

    await act(async () => {
      render(<Transactions />);
    });

    expect(screen.getByText('Tüm İşlemler')).toBeInTheDocument();
    expect(screen.queryByText('İşlem bulunamadı')).not.toBeInTheDocument();
  });

  it('should show empty state when no transactions exist', async () => {
    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      expect(screen.getByText('İşlem bulunamadı')).toBeInTheDocument();
      expect(screen.getByText('Filtrelere uygun işlem kaydı yok')).toBeInTheDocument();
    });
  });

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

  it('should navigate to company detail when company name is clicked', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      const elements = screen.getAllByText('ABC İnşaat');
      expect(elements.length).toBeGreaterThanOrEqual(2);
    });

    const companyLink = screen.getAllByText('ABC İnşaat').find((el) => el.tagName === 'BUTTON');
    expect(companyLink).toBeDefined();
    await act(async () => {
      fireEvent.click(companyLink!);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/companies/1');
  });

  it('should have a search input with correct placeholder', async () => {
    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('İşlem ara...')).toBeInTheDocument();
    });
  });

  it('should show error toast when loading fails', async () => {
    (window.electronAPI.transaction.getAll as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('DB Error')
    );

    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Veriler yüklenemedi:'));
    });
  });

  it('should show Firma Genel for transactions without company or project', async () => {
    setupMocksWithData();

    await act(async () => {
      render(<Transactions />);
    });

    await waitFor(() => {
      const elements = screen.getAllByText('Firma Genel');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('editing and deleting', () => {
    const rowOf = (text: string) => {
      const row = screen.getByText(text).closest('tr');
      if (!row) throw new Error(`row ${text} not found`);
      return row;
    };
    const buttonIn = (row: HTMLElement, title: string) => {
      const button = row.querySelector(`button[title="${title}"]`);
      if (!button) throw new Error(`${title} button not found`);
      return button;
    };

    beforeEach(() => {
      window.electronAPI.exchange.getRates = vi.fn().mockResolvedValue({ USD: 30, EUR: 32 });
      window.electronAPI.transaction.getMatchCandidates = vi.fn().mockResolvedValue([]);
      window.electronAPI.transaction.getAllocationsForInvoice = vi.fn().mockResolvedValue([]);
      window.electronAPI.transaction.getAllocationsForPayment = vi.fn().mockResolvedValue([]);
    });

    it('edits an account transaction in the same detailed form as the account page', async () => {
      setupMocksWithData();
      await act(async () => {
        render(<Transactions />);
      });
      await waitFor(() => expect(screen.getByText('Daire satış faturası')).toBeInTheDocument());

      await act(async () => {
        fireEvent.click(buttonIn(rowOf('Daire satış faturası'), 'Düzenle'));
      });

      expect(await screen.findByText('İşlem Düzenle')).toBeInTheDocument();
      const form = screen.getByRole('dialog');
      expect(within(form).getByText('Para Birimi')).toBeInTheDocument();
      expect(within(form).getByText('Tahsilat')).toBeInTheDocument();
      await waitFor(() =>
        expect(window.electronAPI.transaction.getMatchCandidates).toHaveBeenCalledWith({
          type: 'invoice_out',
          companyId: 1,
          projectId: null,
          selfId: 1,
        })
      );
    });

    it('edits a firm record in the firm income/expense form', async () => {
      setupMocksWithData();
      await act(async () => {
        render(<Transactions />);
      });
      await waitFor(() => expect(screen.getByText('Genel tahsilat')).toBeInTheDocument());

      await act(async () => {
        fireEvent.click(buttonIn(rowOf('Genel tahsilat'), 'Düzenle'));
      });

      expect(await screen.findByText('İşlem Düzenle')).toBeInTheDocument();
      const form = screen.getByRole('dialog');
      expect(within(form).queryByText('Para Birimi')).not.toBeInTheDocument();
      expect(within(form).getByText('Gelir')).toBeInTheDocument();
    });

    it('opens the shared detail view from a row and goes on to the form', async () => {
      setupMocksWithData();
      await act(async () => {
        render(<Transactions />);
      });
      await waitFor(() => expect(screen.getByText('Beton alım faturası')).toBeInTheDocument());

      await act(async () => {
        fireEvent.click(screen.getByText('Beton alım faturası'));
      });
      await waitFor(() =>
        expect(window.electronAPI.transaction.getAllocationsForInvoice).toHaveBeenCalledWith(2)
      );
      const dialog = await screen.findByRole('dialog');
      await act(async () => {
        fireEvent.click(within(dialog).getByText('Düzenle'));
      });
      expect(await screen.findByText('İşlem Düzenle')).toBeInTheDocument();
      await waitFor(() =>
        expect(window.electronAPI.transaction.getMatchCandidates).toHaveBeenCalledWith(
          expect.objectContaining({ projectId: 1, selfId: 2 })
        )
      );
    });

    it('deletes from the row after confirmation', async () => {
      setupMocksWithData();
      window.electronAPI.transaction.delete = vi.fn().mockResolvedValue({ success: true });
      await act(async () => {
        render(<Transactions />);
      });
      await waitFor(() => expect(screen.getByText('Daire satış faturası')).toBeInTheDocument());

      await act(async () => {
        fireEvent.click(buttonIn(rowOf('Daire satış faturası'), 'Sil'));
      });
      const dialog = await screen.findByRole('alertdialog');
      await act(async () => {
        fireEvent.click(within(dialog).getByRole('button', { name: 'Sil' }));
      });
      await waitFor(() => expect(window.electronAPI.transaction.delete).toHaveBeenCalledWith(1));
    });

    it('forgets a selected row once the search hides it, so bulk delete cannot reach it', async () => {
      setupMocksWithData();
      await act(async () => {
        render(<Transactions />);
      });
      await waitFor(() => expect(screen.getByText('Daire satış faturası')).toBeInTheDocument());

      const checkbox = within(rowOf('Daire satış faturası')).getByRole('checkbox');
      await act(async () => {
        fireEvent.click(checkbox);
      });
      expect(screen.getByRole('button', { name: '1 işlem sil' })).toBeInTheDocument();

      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText('İşlem ara...'), {
          target: { value: 'Beton' },
        });
      });
      await waitFor(() =>
        expect(screen.queryByText('Daire satış faturası')).not.toBeInTheDocument()
      );
      expect(screen.queryByRole('button', { name: /işlem sil$/i })).not.toBeInTheDocument();
    });
  });
});
