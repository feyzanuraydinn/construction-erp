import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrendingUp, FiTrendingDown, FiZap } from 'react-icons/fi';
import {
  Modal,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  Textarea,
} from '../ui';
import { formatCurrency, formatDate, formatDateForInput } from '../../utils/formatters';
import { CURRENCIES } from '../../utils/constants';
import type {
  TransactionWithDetails,
  TransactionFormData,
  Company,
  Project,
  Category,
  TransactionType,
  TransactionScope,
  Currency,
  InvoiceWithBalance,
} from '../../types';

// ==================== TYPES ====================

interface TransactionModalFormState {
  type: TransactionType;
  date: string;
  description: string;
  amount: string;
  currency: Currency;
  category_id: string;
  company_id: string;
  project_id: string;
  document_no: string;
  notes: string;
  linked_invoice_id: string;
}

interface AllocationEntry {
  invoiceId: number;
  amount: number;
  invoiceDescription: string;
  invoiceTotal: number;
  invoiceRemaining: number;
  invoiceDate: string;
  invoiceDocNo: string | null;
}

interface TransactionModalConfig {
  /** 4 tip (project/cari) veya 2 tip (company) */
  transactionTypes: Array<{
    value: TransactionType;
    label: string;
    color: string;
    icon?: React.ReactNode;
  }>;
  /** Döviz desteği */
  enableCurrency: boolean;
  /** Bağlı fatura desteği */
  enableLinkedInvoice: boolean;
  /** Yeni işlem başlığı */
  newTitle: string;
}

export interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionWithDetails | null;
  categories: Category[];
  onSave: (isNew: boolean) => void;
  /** İşlem scope'u */
  scope: TransactionScope;
  /** Proje veya cari ID'si */
  entityId?: number;
  /** Cari listesi (ProjectDetail'de gösterilir) */
  companies?: Company[];
  /** Proje listesi (CompanyDetail'de gösterilir) */
  projects?: Project[];
  /** Sadece belirli tipleri göster */
  mode?: 'full' | 'simple';
}

// ==================== CONSTANTS ====================

const COLOR_MAP: Record<string, string> = {
  green: 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  blue: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  red: 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  orange: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
};

// ==================== HELPERS ====================

function getDefaultFormData(): TransactionModalFormState {
  return {
    type: 'invoice_out',
    date: formatDateForInput(new Date().toISOString()),
    description: '',
    amount: '',
    currency: 'TRY',
    category_id: '',
    company_id: '',
    project_id: '',
    document_no: '',
    notes: '',
    linked_invoice_id: '',
  };
}

function getFilteredCategories(categories: Category[], type: TransactionType): Category[] {
  if (type === 'invoice_out') return categories.filter((c) => c.type === 'invoice_out');
  if (type === 'invoice_in') return categories.filter((c) => c.type === 'invoice_in');
  // payment_in or payment_out
  return categories.filter((c) => c.type === 'payment');
}

function isPaymentType(type: TransactionType): boolean {
  return type === 'payment_in' || type === 'payment_out';
}

/** FIFO otomatik dağıtım: En eski faturadan başlayarak ödeme tutarını dağıtır */
function autoAllocateFIFO(
  invoices: InvoiceWithBalance[],
  paymentAmount: number
): AllocationEntry[] {
  let remaining = paymentAmount;
  const allocations: AllocationEntry[] = [];
  for (const inv of invoices) {
    if (remaining <= 0) break;
    const allocAmount = Math.min(remaining, inv.remaining);
    if (allocAmount > 0) {
      allocations.push({
        invoiceId: inv.id,
        amount: Math.round(allocAmount * 100) / 100,
        invoiceDescription: inv.description,
        invoiceTotal: inv.amount_try,
        invoiceRemaining: inv.remaining,
        invoiceDate: inv.date,
        invoiceDocNo: inv.document_no,
      });
      remaining -= allocAmount;
    }
  }
  return allocations;
}

// ==================== COMPONENT ====================

export function TransactionModal({
  isOpen,
  onClose,
  transaction,
  categories,
  onSave,
  scope,
  entityId,
  companies = [],
  projects = [],
  mode = 'full',
}: TransactionModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<TransactionModalFormState>(getDefaultFormData);
  const [loading, setLoading] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<{ USD: number; EUR: number }>({
    USD: 1,
    EUR: 1,
  });

  // Fatura eşleştirme state'leri
  const [availableInvoices, setAvailableInvoices] = useState<InvoiceWithBalance[]>([]);
  const [allocations, setAllocations] = useState<AllocationEntry[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const isSimple = mode === 'simple';
  const enableCurrency = !isSimple;
  const enableLinkedInvoice = !isSimple;

  // Transaction type options computed with t()
  const FULL_TYPES: TransactionModalConfig['transactionTypes'] = useMemo(() => [
    { value: 'invoice_out' as TransactionType, label: t('enums.transactionType.invoice_out'), color: 'green' },
    { value: 'payment_in' as TransactionType, label: t('enums.transactionType.payment_in'), color: 'blue' },
    { value: 'invoice_in' as TransactionType, label: t('enums.transactionType.invoice_in'), color: 'red' },
    { value: 'payment_out' as TransactionType, label: t('enums.transactionType.payment_out'), color: 'orange' },
  ], [t]);

  const SIMPLE_TYPES: TransactionModalConfig['transactionTypes'] = useMemo(() => [
    {
      value: 'invoice_out' as TransactionType,
      label: t('companyAccount.types.income'),
      color: 'green',
      icon: <FiTrendingUp className="mx-auto mb-2" size={24} />,
    },
    {
      value: 'invoice_in' as TransactionType,
      label: t('companyAccount.types.expense'),
      color: 'red',
      icon: <FiTrendingDown className="mx-auto mb-2" size={24} />,
    },
  ], [t]);

  const typeOptions = isSimple ? SIMPLE_TYPES : FULL_TYPES;

  // Döviz kurlarını al (sadece cari scope'ta)
  useEffect(() => {
    if (!enableCurrency || scope !== 'cari') return;
    const fetchRates = async () => {
      try {
        const rates = await window.electronAPI.exchange.getRates();
        if (rates) setExchangeRates(rates);
      } catch (error) {
        console.error('Kur bilgisi alınamadı:', error);
      }
    };
    fetchRates();
  }, [enableCurrency, scope]);

  // Bakiyesi kalan faturaları yükle
  const loadInvoicesWithBalance = useCallback(async () => {
    if (!enableLinkedInvoice || !isOpen || !entityId) return;
    if (!isPaymentType(formData.type)) return;

    setLoadingInvoices(true);
    try {
      const invoiceType = formData.type === 'payment_in' ? 'invoice_out' : 'invoice_in';
      const entityType = scope === 'project' ? 'project' : 'company';
      const data = await window.electronAPI.transaction.getInvoicesWithBalance(
        entityId,
        entityType,
        invoiceType
      );
      setAvailableInvoices(data || []);
    } catch (error) {
      console.error('Fatura yükleme hatası:', error);
      setAvailableInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  }, [enableLinkedInvoice, isOpen, entityId, scope, formData.type]);

  useEffect(() => {
    loadInvoicesWithBalance();
  }, [loadInvoicesWithBalance]);

  // Düzenleme modunda mevcut eşleştirmeleri yükle
  useEffect(() => {
    if (!transaction || !isOpen || !isPaymentType(transaction.type)) {
      setAllocations([]);
      return;
    }
    const loadExistingAllocations = async () => {
      try {
        const data = await window.electronAPI.transaction.getAllocationsForPayment(transaction.id);
        if (data && data.length > 0) {
          setAllocations(
            data.map((a) => ({
              invoiceId: a.invoice_id,
              amount: a.amount,
              invoiceDescription: a.invoice_description || '',
              invoiceTotal: a.invoice_amount_try || a.invoice_amount || 0,
              invoiceRemaining: a.amount, // mevcut allocation tutarı
              invoiceDate: a.invoice_date || '',
              invoiceDocNo: a.invoice_document_no || null,
            }))
          );
        }
      } catch (error) {
        console.error('Eşleştirme yükleme hatası:', error);
      }
    };
    loadExistingAllocations();
  }, [transaction, isOpen]);

  // Form verilerini başlat
  useEffect(() => {
    if (transaction) {
      let mappedType = transaction.type;
      if (isSimple) {
        if (transaction.type === 'payment_in') mappedType = 'invoice_out';
        if (transaction.type === 'payment_out') mappedType = 'invoice_in';
      }

      setFormData({
        type: mappedType,
        date: formatDateForInput(transaction.date),
        description: transaction.description,
        amount: String(transaction.amount),
        currency: transaction.currency || 'TRY',
        category_id: transaction.category_id ? String(transaction.category_id) : '',
        company_id: transaction.company_id ? String(transaction.company_id) : '',
        project_id: transaction.project_id ? String(transaction.project_id) : '',
        document_no: transaction.document_no || '',
        notes: transaction.notes || '',
        linked_invoice_id: transaction.linked_invoice_id
          ? String(transaction.linked_invoice_id)
          : '',
      });
    } else {
      setFormData(getDefaultFormData());
      setAllocations([]);
    }
  }, [transaction, isOpen, isSimple]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Kur hesaplama
      let exchangeRate = 1;
      if (enableCurrency && scope === 'cari') {
        if (formData.currency === 'USD') exchangeRate = exchangeRates.USD;
        else if (formData.currency === 'EUR') exchangeRate = exchangeRates.EUR;
      }

      const baseData: TransactionFormData = {
        scope,
        type: formData.type,
        date: formData.date,
        description: formData.description,
        amount: parseFloat(formData.amount),
        currency: isSimple ? 'TRY' : formData.currency,
        category_id: formData.category_id || undefined,
        document_no: formData.document_no || undefined,
        notes: formData.notes || undefined,
        company_id: undefined,
        project_id: undefined,
        exchange_rate: undefined,
        linked_invoice_id: undefined,
      };

      // Scope'a göre entity alanlarını ayarla
      if (scope === 'project') {
        baseData.project_id = entityId;
        baseData.company_id = formData.company_id || undefined;
      } else if (scope === 'cari') {
        baseData.company_id = entityId;
        baseData.project_id = formData.project_id || undefined;
        baseData.exchange_rate = exchangeRate;
      }

      let savedId: number;
      if (transaction) {
        const result = await window.electronAPI.transaction.update(transaction.id, baseData);
        savedId = result.id;
      } else {
        const result = await window.electronAPI.transaction.create(baseData);
        savedId = result.id;
      }

      // Fatura eşleştirmelerini kaydet
      if (enableLinkedInvoice && isPaymentType(formData.type) && allocations.length > 0) {
        await window.electronAPI.transaction.setAllocations(
          savedId,
          allocations.map((a) => ({ invoiceId: a.invoiceId, amount: a.amount }))
        );
      } else if (enableLinkedInvoice && isPaymentType(formData.type) && allocations.length === 0 && transaction) {
        // Düzenleme modunda eşleştirmeler temizlendiyse
        await window.electronAPI.transaction.setAllocations(savedId, []);
      }

      onSave(!transaction);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (value: TransactionType) => {
    setFormData({
      ...formData,
      type: value,
      category_id: '',
      linked_invoice_id: '',
    });
    setAllocations([]);
  };

  const updateField = <K extends keyof TransactionModalFormState>(
    field: K,
    value: TransactionModalFormState[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Allocation helpers
  const updateAllocationAmount = (invoiceId: number, amount: number) => {
    setAllocations((prev) => {
      const existing = prev.find((a) => a.invoiceId === invoiceId);
      if (existing) {
        if (amount <= 0) return prev.filter((a) => a.invoiceId !== invoiceId);
        return prev.map((a) => (a.invoiceId === invoiceId ? { ...a, amount } : a));
      }
      const invoice = availableInvoices.find((inv) => inv.id === invoiceId);
      if (!invoice || amount <= 0) return prev;
      return [
        ...prev,
        {
          invoiceId,
          amount,
          invoiceDescription: invoice.description,
          invoiceTotal: invoice.amount_try,
          invoiceRemaining: invoice.remaining,
          invoiceDate: invoice.date,
          invoiceDocNo: invoice.document_no,
        },
      ];
    });
  };

  const handleAutoAllocate = () => {
    const paymentAmount = parseFloat(formData.amount) || 0;
    if (paymentAmount <= 0 || availableInvoices.length === 0) return;
    setAllocations(autoAllocateFIFO(availableInvoices, paymentAmount));
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const paymentAmount = parseFloat(formData.amount) || 0;
  const unallocated = Math.max(0, paymentAmount - totalAllocated);

  const filteredCategories = getFilteredCategories(categories, formData.type);
  const showAllocationPanel = enableLinkedInvoice && isPaymentType(formData.type);
  const showExchangeRate = enableCurrency && scope === 'cari';

  const getTitle = () => {
    if (transaction) return t('transactionModal.editTitle');
    if (scope === 'project') return t('transactionModal.newProjectTransaction');
    if (scope === 'company') return t('transactionModal.companyIncomeExpense');
    return t('transactionModal.newTransaction');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size={showAllocationPanel ? 'lg' : 'md'}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <ModalBody className="space-y-4">
          {/* İşlem Türü Seçimi */}
          <div className={`grid grid-cols-${isSimple ? '2 gap-4' : '2 gap-2'}`}>
            {typeOptions.map((opt) => (
              <label key={opt.value}>
                <input
                  type="radio"
                  name="type"
                  value={opt.value}
                  checked={formData.type === opt.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleTypeChange(e.target.value as TransactionType)
                  }
                  className="sr-only"
                />
                <div
                  className={`${isSimple ? 'p-4' : 'p-2.5'} border-2 rounded-lg cursor-pointer text-center transition-all ${
                    formData.type === opt.value
                      ? COLOR_MAP[opt.color]
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {opt.icon}
                  <span className={`${isSimple ? 'text-base' : 'text-sm'} font-medium`}>
                    {opt.label}
                  </span>
                </div>
              </label>
            ))}
          </div>

          {/* Tarih + Kategori */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`${t('common.date')} *`}
              type="date"
              value={formData.date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateField('date', e.target.value)
              }
              required
            />
            <Select
              label={`${t('common.category')} *`}
              options={filteredCategories.map((c) => ({ value: c.id, label: t(`categories.${c.name}`, c.name) }))}
              value={formData.category_id}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                updateField('category_id', e.target.value)
              }
              required
            />
          </div>

          {/* Açıklama */}
          <Input
            label={`${t('common.description')} *`}
            value={formData.description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField('description', e.target.value)
            }
            placeholder={isSimple ? t('transactions.form.descriptionPlaceholder') : undefined}
            required
          />

          {/* Tutar + Para Birimi veya Tutar + Belge No (simple) */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={isSimple ? `${t('transactionModal.amountTL')} *` : `${t('common.amount')} *`}
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateField('amount', e.target.value)
              }
              required
            />
            {enableCurrency ? (
              <Select
                label={t('common.currency')}
                options={CURRENCIES}
                value={formData.currency}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  updateField('currency', e.target.value as Currency)
                }
              />
            ) : (
              <Input
                label={t('common.documentNo')}
                value={formData.document_no}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('document_no', e.target.value)
                }
                placeholder={t('transactionModal.invoiceNo')}
              />
            )}
          </div>

          {/* Kur Bilgisi (sadece cari scope + döviz seçiliyse) */}
          {showExchangeRate && formData.currency !== 'TRY' && formData.amount && (
            <div className="p-3 text-sm border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between">
                <span className="text-blue-700 dark:text-blue-400">{t('transactionModal.currentRate')}:</span>
                <span className="font-medium text-blue-900 dark:text-blue-300">
                  1 {formData.currency} ={' '}
                  {(formData.currency === 'USD'
                    ? exchangeRates.USD
                    : exchangeRates.EUR
                  ).toFixed(4)}{' '}
                  TL
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-blue-700 dark:text-blue-400">{t('transactionModal.tryEquivalent')}:</span>
                <span className="font-medium text-blue-900 dark:text-blue-300">
                  {formatCurrency(
                    parseFloat(formData.amount) *
                      (formData.currency === 'USD' ? exchangeRates.USD : exchangeRates.EUR)
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Cari Seçici (ProjectDetail) */}
          {scope === 'project' && companies.length > 0 && (
            <Select
              label={t('transactionModal.companyOptional')}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
              value={formData.company_id}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                updateField('company_id', e.target.value)
              }
              placeholder={t('transactionModal.selectCompany')}
            />
          )}

          {/* Proje Seçici (CompanyDetail) */}
          {scope === 'cari' && projects.length > 0 && (
            <Select
              label={t('transactionModal.projectOptional')}
              options={projects.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
              value={formData.project_id}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                updateField('project_id', e.target.value)
              }
              placeholder={t('transactionModal.selectProject')}
            />
          )}

          {/* Fatura Eşleştirme Paneli */}
          {showAllocationPanel && (
            <div className="p-3 space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('shared.allocations.title')}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  icon={FiZap}
                  onClick={handleAutoAllocate}
                  disabled={paymentAmount <= 0 || availableInvoices.length === 0}
                  className="!text-indigo-700 dark:!text-indigo-400 !bg-indigo-100 dark:!bg-indigo-900/30 hover:!bg-indigo-200 dark:hover:!bg-indigo-900/50"
                >
                  {t('transactionModal.autoAllocate')}
                </Button>
              </div>

              {loadingInvoices ? (
                <div className="py-3 text-xs text-center text-gray-500 dark:text-gray-400">{t('transactionModal.loadingInvoices')}</div>
              ) : availableInvoices.length === 0 ? (
                <div className="py-3 text-xs text-center text-gray-500 dark:text-gray-400">
                  {t('transactionModal.noOpenInvoices')}
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableInvoices.map((inv) => {
                    const alloc = allocations.find((a) => a.invoiceId === inv.id);
                    const allocAmount = alloc?.amount || 0;
                    return (
                      <div
                        key={inv.id}
                        className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                            {inv.document_no || inv.description}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(inv.date)} — {t('transactionModal.remaining')}: {formatCurrency(inv.remaining)}
                          </div>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={inv.remaining}
                          value={allocAmount || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateAllocationAmount(inv.id, Math.min(val, inv.remaining));
                          }}
                          placeholder="0"
                          className="w-24 px-2 py-1 text-xs text-right border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Toplam göstergesi */}
              {paymentAmount > 0 && (
                <div className="flex items-center justify-between pt-2 text-xs border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('transactionModal.allocation')}: {formatCurrency(totalAllocated)} / {formatCurrency(paymentAmount)}
                  </span>
                  {unallocated > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {t('transactionModal.unallocated')}: {formatCurrency(unallocated)}
                    </span>
                  )}
                  {unallocated === 0 && totalAllocated > 0 && (
                    <span className="text-green-600 dark:text-green-400">{t('transactionModal.fullMatch')}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Belge No (sadece enableCurrency modunda — simple'da yukarıda) */}
          {enableCurrency && (
            <Input
              label={t('common.documentNo')}
              value={formData.document_no}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateField('document_no', e.target.value)
              }
              placeholder={t('transactionModal.invoiceWaybillNo')}
            />
          )}

          {/* Not */}
          <Textarea
            label={t('common.notes')}
            value={formData.notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              updateField('notes', e.target.value)
            }
            rows={2}
          />
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose} type="button">
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {transaction ? t('common.update') : t('common.save')}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
