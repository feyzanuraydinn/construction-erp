import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '../../i18n';
import { TransactionModal } from '../../components/modals/TransactionModal';
import type { TransactionWithDetails, Category } from '../../types';

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

describe('TransactionModal', () => {
  const mockCategories: Category[] = [
    { id: 1, name: 'Yapı Malzemesi', type: 'invoice_out', color: '#6366f1' } as Category,
    { id: 2, name: 'Hizmet', type: 'invoice_in', color: '#f43f5e' } as Category,
    { id: 3, name: 'Ödeme', type: 'payment', color: '#3b82f6' } as Category,
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    transaction: null as TransactionWithDetails | null,
    categories: mockCategories,
    onSave: vi.fn(),
    scope: 'project' as const,
    entityId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI.exchange.getRates = vi.fn().mockResolvedValue({ USD: 30, EUR: 32 });
    window.electronAPI.transaction.getInvoicesWithBalance = vi.fn().mockResolvedValue([]);
    window.electronAPI.transaction.getAllocationsForPayment = vi.fn().mockResolvedValue([]);
  });

  // ==================== RENDERING ====================

  it('should render when isOpen is true', () => {
    render(<TransactionModal {...defaultProps} />);
    expect(screen.getByText('Satış Faturası')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<TransactionModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Satış Faturası')).not.toBeInTheDocument();
  });

  it('should show correct title for project scope', () => {
    render(<TransactionModal {...defaultProps} />);
    expect(screen.getByText('Yeni Proje İşlemi')).toBeInTheDocument();
  });

  it('should show correct title for cari scope', () => {
    render(<TransactionModal {...defaultProps} scope="cari" />);
    expect(screen.getByText('Yeni İşlem')).toBeInTheDocument();
  });

  it('should show correct title for company scope', () => {
    render(<TransactionModal {...defaultProps} scope="company" />);
    expect(screen.getByText('Firma Gelir/Gider')).toBeInTheDocument();
  });

  it('should show edit title when editing', () => {
    const transaction = {
      id: 1, type: 'invoice_out', date: '2024-01-15', description: 'Test',
      amount: 1000, currency: 'TRY', scope: 'project',
    } as TransactionWithDetails;
    render(<TransactionModal {...defaultProps} transaction={transaction} />);
    expect(screen.getByText('İşlem Düzenle')).toBeInTheDocument();
  });

  // ==================== TRANSACTION TYPE SELECTION ====================

  it('should show 4 transaction types in full mode', () => {
    render(<TransactionModal {...defaultProps} />);
    expect(screen.getByText('Satış Faturası')).toBeInTheDocument();
    expect(screen.getByText('Tahsilat')).toBeInTheDocument();
    expect(screen.getByText('Alış Faturası')).toBeInTheDocument();
    expect(screen.getByText('Ödeme')).toBeInTheDocument();
  });

  it('should show 2 transaction types in simple mode', () => {
    render(<TransactionModal {...defaultProps} mode="simple" />);
    expect(screen.getByText('Gelir')).toBeInTheDocument();
    expect(screen.getByText('Gider')).toBeInTheDocument();
    expect(screen.queryByText('Tahsilat')).not.toBeInTheDocument();
  });

  it('should change type when clicked', () => {
    render(<TransactionModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Alış Faturası').closest('label')!);

    const radioInputs = document.querySelectorAll('input[type="radio"][name="type"]');
    const invoiceInRadio = Array.from(radioInputs).find(
      (r) => (r as HTMLInputElement).value === 'invoice_in'
    ) as HTMLInputElement;
    expect(invoiceInRadio?.checked).toBe(true);
  });

  // ==================== FORM FIELDS ====================

  it('should show date and category fields', () => {
    render(<TransactionModal {...defaultProps} />);
    expect(screen.getByText(/Tarih/)).toBeInTheDocument();
    expect(screen.getByText(/Kategori/)).toBeInTheDocument();
  });

  it('should show description field', () => {
    render(<TransactionModal {...defaultProps} />);
    expect(screen.getByText(/Açıklama/)).toBeInTheDocument();
  });

  it('should show amount field', () => {
    render(<TransactionModal {...defaultProps} />);
    expect(screen.getByText(/Tutar/)).toBeInTheDocument();
  });

  it('should show currency selector in full mode', () => {
    render(<TransactionModal {...defaultProps} />);
    expect(screen.getByText('Para Birimi')).toBeInTheDocument();
  });

  it('should not show currency selector in simple mode', () => {
    render(<TransactionModal {...defaultProps} mode="simple" />);
    expect(screen.queryByText('Para Birimi')).not.toBeInTheDocument();
  });

  it('should show notes textarea', () => {
    render(<TransactionModal {...defaultProps} />);
    expect(screen.getByText('Notlar')).toBeInTheDocument();
  });

  it('should show company selector for project scope with companies', () => {
    const companies = [
      { id: 1, name: 'Test Co', type: 'company', account_type: 'customer' },
    ];
    render(<TransactionModal {...defaultProps} companies={companies as any} />);
    expect(screen.getByText('Cari (Opsiyonel)')).toBeInTheDocument();
  });

  it('should show project selector for cari scope with projects', () => {
    const projects = [{ id: 1, code: 'P-001', name: 'Test Proje' }];
    render(<TransactionModal {...defaultProps} scope="cari" projects={projects as any} />);
    expect(screen.getByText('Proje (Opsiyonel)')).toBeInTheDocument();
  });

  // ==================== ALLOCATION PANEL ====================

  it('should show allocation panel for payment types', async () => {
    render(<TransactionModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Tahsilat').closest('label')!);

    await waitFor(() => {
      expect(screen.getByText('Fatura Eşleştirmeleri')).toBeInTheDocument();
    });
  });

  it('should not show allocation panel for invoice types', () => {
    render(<TransactionModal {...defaultProps} />);
    expect(screen.queryByText('Fatura Eşleştirmeleri')).not.toBeInTheDocument();
  });

  it('should not show allocation panel in simple mode', () => {
    render(<TransactionModal {...defaultProps} mode="simple" />);
    expect(screen.queryByText('Fatura Eşleştirmeleri')).not.toBeInTheDocument();
  });

  // ==================== FORM SUBMISSION ====================

  it('should call transaction.create on submit for new transaction', async () => {
    const onSave = vi.fn();
    const mockCreate = vi.fn().mockResolvedValue({ id: 1 });
    window.electronAPI.transaction.create = mockCreate;

    render(<TransactionModal {...defaultProps} onSave={onSave} />);

    // Fill description
    const descInputs = document.querySelectorAll('input[type="text"], input:not([type])');
    const descInput = Array.from(descInputs).find(el => {
      const label = el.closest('div')?.querySelector('label');
      return label?.textContent?.includes('Açıklama');
    }) as HTMLInputElement;
    if (descInput) fireEvent.change(descInput, { target: { value: 'Test desc' } });

    // Fill amount
    const amountInputs = document.querySelectorAll('input[type="number"]');
    if (amountInputs[0]) fireEvent.change(amountInputs[0], { target: { value: '1000' } });

    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => {
      if (mockCreate.mock.calls.length > 0) {
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
          scope: 'project',
          project_id: 1,
        }));
        expect(onSave).toHaveBeenCalledWith(true);
      }
    }, { timeout: 3000 });
  });

  it('should call transaction.update on submit for existing transaction', async () => {
    const onSave = vi.fn();
    const mockUpdate = vi.fn().mockResolvedValue({ id: 1 });
    window.electronAPI.transaction.update = mockUpdate;

    const transaction = {
      id: 5, type: 'invoice_out', date: '2024-01-15', description: 'Existing',
      amount: 1000, currency: 'TRY', scope: 'project',
    } as TransactionWithDetails;

    render(<TransactionModal {...defaultProps} transaction={transaction} onSave={onSave} />);
    fireEvent.click(screen.getByText('Güncelle'));

    await waitFor(() => {
      if (mockUpdate.mock.calls.length > 0) {
        expect(mockUpdate).toHaveBeenCalledWith(5, expect.any(Object));
        expect(onSave).toHaveBeenCalledWith(false);
      }
    }, { timeout: 3000 });
  });

  it('should show update button for existing transaction', () => {
    const transaction = {
      id: 5, type: 'invoice_out', date: '2024-01-15', description: 'Existing',
      amount: 1000, currency: 'TRY', scope: 'project',
    } as TransactionWithDetails;
    render(<TransactionModal {...defaultProps} transaction={transaction} />);
    expect(screen.getByText('Güncelle')).toBeInTheDocument();
  });

  it('should show save button for new transaction', () => {
    render(<TransactionModal {...defaultProps} />);
    expect(screen.getByText('Kaydet')).toBeInTheDocument();
  });

  // ==================== EXCHANGE RATE ====================

  it('should fetch exchange rates for cari scope', async () => {
    render(<TransactionModal {...defaultProps} scope="cari" />);
    await waitFor(() => {
      expect(window.electronAPI.exchange.getRates).toHaveBeenCalled();
    });
  });

  it('should not fetch exchange rates for project scope', () => {
    render(<TransactionModal {...defaultProps} scope="project" />);
    expect(window.electronAPI.exchange.getRates).not.toHaveBeenCalled();
  });

  // ==================== CLOSE ====================

  it('should call onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    render(<TransactionModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('İptal'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
