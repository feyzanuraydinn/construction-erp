import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '../../i18n';
import { TransactionModal } from '../../components/modals/TransactionModal';
import type { TransactionWithDetails, Category, MatchCandidate } from '../../types';

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
    window.electronAPI.transaction.getMatchCandidates = vi.fn().mockResolvedValue([]);
    window.electronAPI.transaction.getAllocationsForPayment = vi.fn().mockResolvedValue([]);
    window.electronAPI.transaction.getAllocationsForInvoice = vi.fn().mockResolvedValue([]);
    window.electronAPI.transaction.save = vi
      .fn()
      .mockResolvedValue({ transaction: { id: 1 }, documentId: null });
  });

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
      id: 1,
      type: 'invoice_out',
      date: '2024-01-15',
      description: 'Test',
      amount: 1000,
      currency: 'TRY',
      scope: 'project',
    } as TransactionWithDetails;
    render(<TransactionModal {...defaultProps} transaction={transaction} />);
    expect(screen.getByText('İşlem Düzenle')).toBeInTheDocument();
  });

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
    const companies = [{ id: 1, name: 'Test Co', type: 'company', account_type: 'customer' }];
    render(<TransactionModal {...defaultProps} companies={companies as any} />);
    expect(screen.getByText('Cari (Opsiyonel)')).toBeInTheDocument();
  });

  it('should show project selector for cari scope with projects', () => {
    const projects = [{ id: 1, code: 'P-001', name: 'Test Proje' }];
    render(<TransactionModal {...defaultProps} scope="cari" projects={projects as any} />);
    expect(screen.getByText('Proje (Opsiyonel)')).toBeInTheDocument();
  });

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

  it('should save a new transaction with its matches in one call', async () => {
    const onSave = vi.fn();
    const mockCreate = vi.fn().mockResolvedValue({ transaction: { id: 1 }, documentId: null });
    window.electronAPI.transaction.save = mockCreate;

    render(<TransactionModal {...defaultProps} onSave={onSave} />);

    const descInputs = document.querySelectorAll('input[type="text"], input:not([type])');
    const descInput = Array.from(descInputs).find((el) => {
      const label = el.closest('div')?.querySelector('label');
      return label?.textContent?.includes('Açıklama');
    }) as HTMLInputElement;
    if (descInput) fireEvent.change(descInput, { target: { value: 'Test desc' } });

    fireEvent.change(screen.getByLabelText('Tutar *'), { target: { value: '1000' } });

    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(
      () => {
        if (mockCreate.mock.calls.length > 0) {
          expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({ scope: 'project', project_id: 1 }),
            })
          );
          expect(onSave).toHaveBeenCalledWith(true);
        }
      },
      { timeout: 3000 }
    );
  });

  it('should save an existing transaction by its id', async () => {
    const onSave = vi.fn();
    const mockUpdate = vi.fn().mockResolvedValue({ transaction: { id: 5 }, documentId: null });
    window.electronAPI.transaction.save = mockUpdate;

    const transaction = {
      id: 5,
      type: 'invoice_out',
      date: '2024-01-15',
      description: 'Existing',
      amount: 1000,
      currency: 'TRY',
      scope: 'project',
    } as TransactionWithDetails;

    render(<TransactionModal {...defaultProps} transaction={transaction} onSave={onSave} />);
    fireEvent.click(screen.getByText('Güncelle'));

    await waitFor(
      () => {
        if (mockUpdate.mock.calls.length > 0) {
          expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ id: 5, data: expect.any(Object) })
          );
          expect(onSave).toHaveBeenCalledWith(false);
        }
      },
      { timeout: 3000 }
    );
  });

  it('should show update button for existing transaction', () => {
    const transaction = {
      id: 5,
      type: 'invoice_out',
      date: '2024-01-15',
      description: 'Existing',
      amount: 1000,
      currency: 'TRY',
      scope: 'project',
    } as TransactionWithDetails;
    render(<TransactionModal {...defaultProps} transaction={transaction} />);
    expect(screen.getByText('Güncelle')).toBeInTheDocument();
  });

  it('should show save button for new transaction', () => {
    render(<TransactionModal {...defaultProps} />);
    expect(screen.getByText('Kaydet')).toBeInTheDocument();
  });

  it('should fetch exchange rates for cari scope', async () => {
    render(<TransactionModal {...defaultProps} scope="cari" />);
    await waitFor(() => {
      expect(window.electronAPI.exchange.getRates).toHaveBeenCalled();
    });
  });

  it('should fetch exchange rates for project scope too (foreign currency is allowed there)', async () => {
    render(<TransactionModal {...defaultProps} scope="project" />);
    await waitFor(() => {
      expect(window.electronAPI.exchange.getRates).toHaveBeenCalled();
    });
  });

  it('should not fetch exchange rates in simple (TRY only) mode', () => {
    render(<TransactionModal {...defaultProps} scope="company" mode="simple" />);
    expect(window.electronAPI.exchange.getRates).not.toHaveBeenCalled();
  });

  const currencySelect = (): HTMLSelectElement => {
    const select = Array.from(document.querySelectorAll('select')).find((el) =>
      Array.from(el.options).some((o) => o.value === 'USD')
    );
    if (!select) throw new Error('currency select not found');
    return select;
  };
  const rateInput = () => screen.queryByLabelText<HTMLInputElement>(/^Kur \(1 /);
  const submitForm = () => {
    const form = document.querySelector('form');
    if (!form) throw new Error('form not found');
    fireEvent.submit(form);
  };
  const fillNewTransaction = () => {
    fireEvent.change(screen.getByLabelText('Tutar *'), { target: { value: '100' } });
  };

  it('saves a new project-scope USD transaction at the current rate, not 1', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ transaction: { id: 1 }, documentId: null });
    window.electronAPI.transaction.save = mockCreate;
    render(<TransactionModal {...defaultProps} />);

    fireEvent.change(currencySelect(), { target: { value: 'USD' } });
    await waitFor(() => expect(rateInput()?.value).toBe('30'));
    fillNewTransaction();
    submitForm();

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scope: 'project', currency: 'USD', exchange_rate: 30 }),
        })
      );
    });
  });

  it("keeps a foreign transaction's own rate and scope when edited from another page", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ transaction: { id: 5 }, documentId: null });
    window.electronAPI.transaction.save = mockUpdate;
    const transaction = {
      id: 5,
      type: 'invoice_out',
      date: '2024-01-15',
      description: 'USD sale',
      amount: 1000,
      currency: 'USD',
      exchange_rate: 25,
      scope: 'cari',
      company_id: 7,
      project_id: 1,
    } as TransactionWithDetails;

    render(<TransactionModal {...defaultProps} transaction={transaction} />);
    await waitFor(() => expect(window.electronAPI.exchange.getRates).toHaveBeenCalled());
    expect(rateInput()?.value).toBe('25');
    submitForm();

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 5,
          data: expect.objectContaining({ scope: 'cari', currency: 'USD', exchange_rate: 25 }),
        })
      );
    });
  });

  it('blocks saving a foreign-currency transaction without a rate', async () => {
    window.electronAPI.exchange.getRates = vi.fn().mockRejectedValue(new Error('offline'));
    const mockCreate = vi.fn();
    window.electronAPI.transaction.save = mockCreate;
    render(<TransactionModal {...defaultProps} />);

    fireEvent.change(currencySelect(), { target: { value: 'EUR' } });
    fillNewTransaction();
    submitForm();

    expect(
      await screen.findByText('Dövizli işlemler için sıfırdan büyük bir kur giriniz')
    ).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  describe('matching', () => {
    const candidate = (id: number, overrides: Partial<MatchCandidate> = {}): MatchCandidate => ({
      id,
      type: 'invoice_in',
      description: `Fatura ${id}`,
      amount: 2000,
      currency: 'TRY',
      amount_try: 2000,
      date: `2026-01-0${id % 10}`,
      document_no: `F-${id}`,
      company_id: 7,
      company_name: 'Tedarikçi',
      project_id: 1,
      project_name: 'Proje',
      remaining: 2000,
      allocated_here: 0,
      ...overrides,
    });

    const amountInput = () => {
      return screen.getByLabelText('Tutar *');
    };

    const startUsdPayment = async () => {
      window.electronAPI.transaction.getMatchCandidates = vi
        .fn()
        .mockResolvedValue([candidate(21), candidate(22)]);
      render(<TransactionModal {...defaultProps} scope="cari" entityId={7} />);
      fireEvent.click(screen.getByText('Ödeme'));
      fireEvent.change(currencySelect(), { target: { value: 'USD' } });
      await waitFor(() => expect(rateInput()?.value).toBe('30'));
      fireEvent.change(amountInput(), { target: { value: '100' } });
      await screen.findByText('F-21');
    };

    it('asks for invoices of the same company', async () => {
      await startUsdPayment();
      expect(window.electronAPI.transaction.getMatchCandidates).toHaveBeenCalledWith({
        type: 'payment_out',
        companyId: 7,
        projectId: null,
        selfId: null,
      });
    });

    it('auto-matches a USD payment by its TRY value (100 USD × 30 = 3000 TL)', async () => {
      await startUsdPayment();
      fireEvent.click(screen.getByText('Otomatik Dağıt'));
      submitForm();

      await waitFor(() => {
        expect(window.electronAPI.transaction.save).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentAllocations: [
              { invoiceId: 21, amount: 2000 },
              { invoiceId: 22, amount: 1000 },
            ],
          })
        );
      });
      const request = vi.mocked(window.electronAPI.transaction.save).mock.calls[0][0];
      expect(request.remainderDocument).toBeUndefined();
    });

    it('blocks saving when matches exceed the payment after the amount was lowered', async () => {
      await startUsdPayment();
      fireEvent.click(screen.getByText('Otomatik Dağıt'));
      fireEvent.change(amountInput(), { target: { value: '10' } });
      submitForm();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('ödeme tutarını'));
      });
      expect(window.electronAPI.transaction.save).not.toHaveBeenCalled();
    });

    const editMatchedPayment = async () => {
      const payment = {
        id: 40,
        type: 'payment_out',
        date: '2026-02-01',
        description: 'Ödeme',
        amount: 2000,
        amount_try: 2000,
        currency: 'TRY',
        exchange_rate: 1,
        scope: 'cari',
        company_id: 7,
        allocated_amount: 2000,
      } as TransactionWithDetails;
      window.electronAPI.transaction.getMatchCandidates = vi
        .fn()
        .mockResolvedValue([candidate(21, { allocated_here: 2000 }), candidate(22)]);
      render(
        <TransactionModal {...defaultProps} scope="cari" entityId={7} transaction={payment} />
      );
      await screen.findByText('F-21');
      await waitFor(() =>
        expect(screen.getByLabelText('F-21 için eşleşen tutar')).toHaveValue('2.000')
      );
    };

    it('lists the invoice an edited payment fully paid, and removes the match', async () => {
      await editMatchedPayment();
      fireEvent.click(screen.getAllByLabelText('Eşleşmeyi kaldır')[0]);
      expect(screen.getByLabelText(/Avans olarak kalsın/)).toBeChecked();
      submitForm();

      await waitFor(() => {
        expect(window.electronAPI.transaction.save).toHaveBeenCalledWith(
          expect.objectContaining({ id: 40, paymentAllocations: [] })
        );
      });
    });

    it("moves an edited payment's match to another invoice", async () => {
      await editMatchedPayment();
      fireEvent.click(screen.getAllByLabelText('Eşleşmeyi kaldır')[0]);
      fireEvent.change(screen.getByLabelText('F-22 için eşleşen tutar'), {
        target: { value: '2000' },
      });
      submitForm();

      await waitFor(() => {
        expect(window.electronAPI.transaction.save).toHaveBeenCalledWith(
          expect.objectContaining({ id: 40, paymentAllocations: [{ invoiceId: 22, amount: 2000 }] })
        );
      });
    });

    it('requires a choice for what no invoice covers, and books it as an expense when chosen', async () => {
      render(<TransactionModal {...defaultProps} scope="cari" entityId={7} />);
      fireEvent.click(screen.getByText('Ödeme'));
      fireEvent.change(amountInput(), { target: { value: '500' } });
      await waitFor(() =>
        expect(window.electronAPI.transaction.getMatchCandidates).toHaveBeenCalled()
      );
      submitForm();
      expect(
        await screen.findByText(
          'Faturayla eşleşmeyen tutar için seçim yapın: avans mı, gider/gelir mi?'
        )
      ).toBeInTheDocument();
      expect(window.electronAPI.transaction.save).not.toHaveBeenCalled();

      fireEvent.click(screen.getByLabelText(/Gider olarak işle/));
      submitForm();
      await waitFor(() => {
        expect(window.electronAPI.transaction.save).toHaveBeenCalledWith(
          expect.objectContaining({ paymentAllocations: [], remainderDocument: { categoryId: 2 } })
        );
      });
    });

    it('does not offer an advance for a project payment without a company', async () => {
      render(<TransactionModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Ödeme'));
      fireEvent.change(amountInput(), { target: { value: '500' } });
      await waitFor(() => expect(screen.getByLabelText(/Avans olarak kalsın/)).toBeDisabled());
      expect(window.electronAPI.transaction.getMatchCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: null, projectId: 1 })
      );
    });

    it('shows and unmatches the payments of an edited invoice', async () => {
      const invoice = {
        id: 50,
        type: 'invoice_in',
        date: '2026-01-05',
        description: 'Fatura',
        amount: 2000,
        amount_try: 2000,
        currency: 'TRY',
        exchange_rate: 1,
        scope: 'cari',
        company_id: 7,
        settled_amount: 1500,
      } as TransactionWithDetails;
      window.electronAPI.transaction.getMatchCandidates = vi.fn().mockResolvedValue([
        candidate(60, {
          type: 'payment_out',
          document_no: 'Ö-60',
          remaining: 1500,
          allocated_here: 1500,
        }),
      ]);
      render(
        <TransactionModal {...defaultProps} scope="cari" entityId={7} transaction={invoice} />
      );
      expect(await screen.findByText('Bu faturayı kapatan ödemeler')).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByLabelText('Ö-60 için eşleşen tutar')).toHaveValue('1.500')
      );
      fireEvent.click(screen.getByLabelText('Eşleşmeyi kaldır'));
      submitForm();
      fireEvent.click(await screen.findByText('Eşleştirmeden kaydet'));

      await waitFor(() => {
        expect(window.electronAPI.transaction.save).toHaveBeenCalledWith(
          expect.objectContaining({ id: 50, invoiceAllocations: [] })
        );
      });
    });

    describe('saving an invoice while advances are still open', () => {
      const advances = () => [
        candidate(61, {
          type: 'payment_out',
          document_no: 'Ö-61',
          date: '2026-01-01',
          remaining: 1000,
        }),
        candidate(62, {
          type: 'payment_out',
          document_no: 'Ö-62',
          date: '2026-01-02',
          remaining: 3000,
        }),
      ];

      const startPurchaseInvoice = async (amount: string) => {
        window.electronAPI.transaction.getMatchCandidates = vi.fn().mockResolvedValue(advances());
        render(<TransactionModal {...defaultProps} scope="cari" entityId={7} />);
        fireEvent.click(screen.getByText('Alış Faturası').closest('label')!);
        fireEvent.change(amountInput(), { target: { value: amount } });
        await screen.findByText('Ö-61');
      };

      it('asks before saving it unmatched, and going back saves nothing', async () => {
        await startPurchaseInvoice('2500');
        submitForm();

        expect(await screen.findByText('Eşleşmemiş avans var')).toBeInTheDocument();
        expect(
          screen.getByText(/4\.000,00 eşleşmemiş ödeme var.*2\.500,00 kısmı açık kalır/)
        ).toBeInTheDocument();
        fireEvent.click(screen.getByText('Geri dön'));

        await waitFor(() =>
          expect(screen.queryByText('Eşleşmemiş avans var')).not.toBeInTheDocument()
        );
        expect(window.electronAPI.transaction.save).not.toHaveBeenCalled();
      });

      it('settles the invoice from the oldest advance first when asked to', async () => {
        await startPurchaseInvoice('2500');
        submitForm();
        fireEvent.click(await screen.findByText('Otomatik dağıt ve kaydet'));

        await waitFor(() =>
          expect(window.electronAPI.transaction.save).toHaveBeenCalledWith(
            expect.objectContaining({
              invoiceAllocations: [
                { paymentId: 61, amount: 1000 },
                { paymentId: 62, amount: 1500 },
              ],
            })
          )
        );
      });

      it('keeps a match entered by hand and fills only what is left', async () => {
        await startPurchaseInvoice('2500');
        fireEvent.change(screen.getByLabelText('Ö-62 için eşleşen tutar'), {
          target: { value: '500' },
        });
        submitForm();
        fireEvent.click(await screen.findByText('Otomatik dağıt ve kaydet'));

        await waitFor(() =>
          expect(window.electronAPI.transaction.save).toHaveBeenCalledWith(
            expect.objectContaining({
              invoiceAllocations: [
                { paymentId: 61, amount: 1000 },
                { paymentId: 62, amount: 1500 },
              ],
            })
          )
        );
      });

      it('saves it unmatched when told to', async () => {
        await startPurchaseInvoice('2500');
        submitForm();
        fireEvent.click(await screen.findByText('Eşleştirmeden kaydet'));

        await waitFor(() =>
          expect(window.electronAPI.transaction.save).toHaveBeenCalledWith(
            expect.objectContaining({ invoiceAllocations: [] })
          )
        );
      });

      it('does not ask when the invoice is fully matched', async () => {
        await startPurchaseInvoice('800');
        fireEvent.change(screen.getByLabelText('Ö-61 için eşleşen tutar'), {
          target: { value: '800' },
        });
        submitForm();

        await waitFor(() =>
          expect(window.electronAPI.transaction.save).toHaveBeenCalledWith(
            expect.objectContaining({ invoiceAllocations: [{ paymentId: 61, amount: 800 }] })
          )
        );
        expect(screen.queryByText('Eşleşmemiş avans var')).not.toBeInTheDocument();
      });

      it('speaks of collections on a sales invoice', async () => {
        window.electronAPI.transaction.getMatchCandidates = vi
          .fn()
          .mockResolvedValue([
            candidate(71, { type: 'payment_in', document_no: 'T-71', remaining: 1000 }),
          ]);
        render(<TransactionModal {...defaultProps} scope="cari" entityId={7} />);
        fireEvent.click(screen.getByText('Satış Faturası').closest('label')!);
        fireEvent.change(amountInput(), { target: { value: '2500' } });
        await screen.findByText('T-71');
        submitForm();

        expect(await screen.findByText(/1\.000,00 eşleşmemiş tahsilat var/)).toBeInTheDocument();
      });
    });

    it('keeps the form open when the save is refused (nothing is written)', async () => {
      const onSave = vi.fn();
      window.electronAPI.transaction.save = vi
        .fn()
        .mockRejectedValue(new Error('Eşleştirme toplamı ödeme tutarını aşamaz.'));
      render(<TransactionModal {...defaultProps} scope="cari" entityId={7} onSave={onSave} />);
      fireEvent.click(screen.getByText('Ödeme'));
      fireEvent.change(amountInput(), { target: { value: '500' } });
      fireEvent.click(await screen.findByLabelText(/Avans olarak kalsın/));
      submitForm();

      await waitFor(() =>
        expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('aşamaz'))
      );
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  it('shows an error toast when saving fails', async () => {
    window.electronAPI.transaction.save = vi
      .fn()
      .mockRejectedValue(
        new Error("Error invoking remote method 'transaction:save': Error: disk full")
      );
    render(<TransactionModal {...defaultProps} />);

    fillNewTransaction();
    submitForm();

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('İşlem kaydedilemedi: disk full');
    });
  });

  it('should call onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    render(<TransactionModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('İptal'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
