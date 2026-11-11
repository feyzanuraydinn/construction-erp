import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrendingUp, FiTrendingDown, FiZap, FiX, FiAlertTriangle } from 'react-icons/fi';
import {
  Modal,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  Textarea,
  ConfirmDialog,
} from '../ui';
import { formatCurrency, formatDate, formatDateForInput } from '../../utils/formatters';
import { CURRENCIES } from '../../utils/constants';
import { ipcErrorMessage } from '../../utils/ipcError';
import { useToast } from '../../contexts/ToastContext';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import type {
  TransactionWithDetails,
  TransactionFormData,
  Company,
  Project,
  Category,
  TransactionType,
  TransactionScope,
  Currency,
  MatchCandidate,
  PaymentAllocationWithDetails,
  SaveTransactionRequest,
} from '../../types';

// ==================== TYPES ====================

interface TransactionModalFormState {
  type: TransactionType;
  date: string;
  description: string;
  amount: string;
  currency: Currency;
  exchange_rate: string;
  category_id: string;
  company_id: string;
  project_id: string;
  document_no: string;
  notes: string;
  linked_invoice_id: string;
}

type MatchAmounts = Record<number, number>;

type RestChoice = 'advance' | 'document';

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
    exchange_rate: '',
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

function formAmountInTry(form: TransactionModalFormState, isSimple: boolean): number {
  const amount = parseFloat(form.amount) || 0;
  const rate = isSimple || form.currency === 'TRY' ? 1 : parseFloat(form.exchange_rate) || 0;
  return Math.round(amount * rate * 100) / 100;
}

const MONEY_TOLERANCE = 0.005;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function autoMatch(candidates: MatchCandidate[], target: number): MatchAmounts {
  let left = target;
  const result: MatchAmounts = {};
  for (const candidate of candidates) {
    if (left <= MONEY_TOLERANCE) break;
    const amount = roundMoney(Math.min(left, candidate.remaining));
    if (amount > 0) {
      result[candidate.id] = amount;
      left = roundMoney(left - amount);
    }
  }
  return result;
}

function sumMatches(matches: MatchAmounts): number {
  return roundMoney(Object.values(matches).reduce((sum, amount) => sum + amount, 0));
}

function defaultDocumentCategory(categories: Category[], type: 'invoice_in' | 'invoice_out'): string {
  const ofType = categories.filter((c) => c.type === type);
  const preferred = ofType.find((c) => c.name === (type === 'invoice_in' ? 'Diğer Gider' : 'Diğer Gelir'));
  const chosen = preferred ?? ofType[0];
  return chosen ? String(chosen.id) : '';
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
  const toast = useToast();
  const [formData, setFormData] = useState<TransactionModalFormState>(getDefaultFormData);
  const [loading, setLoading] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [matches, setMatches] = useState<MatchAmounts>({});
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidatesReady, setCandidatesReady] = useState(false);
  const [outsideMatches, setOutsideMatches] = useState<PaymentAllocationWithDetails[]>([]);
  const [restChoice, setRestChoice] = useState<RestChoice | null>(null);
  const [restCategoryId, setRestCategoryId] = useState('');
  const [restError, setRestError] = useState<string | null>(null);

  // Tür değişikliği uyarı state'leri
  const [typeChangeWarning, setTypeChangeWarning] = useState<{
    show: boolean;
    pendingType: TransactionType | null;
    allocationCount: number;
    allocationTotal: number;
  }>({ show: false, pendingType: null, allocationCount: 0, allocationTotal: 0 });

  const isSimple = mode === 'simple';
  const enableCurrency = !isSimple;
  const enableMatching = !isSimple;

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

  const currentRates = useExchangeRates(isOpen && enableCurrency);

  useEffect(() => {
    if (!currentRates || formData.currency === 'TRY' || formData.exchange_rate !== '') return;
    const rate = currentRates[formData.currency];
    setFormData((prev) => ({ ...prev, exchange_rate: String(rate) }));
  }, [currentRates, formData.currency, formData.exchange_rate]);

  const poolCompanyId =
    scope === 'cari' ? entityId ?? null : formData.company_id ? Number(formData.company_id) : null;
  const poolProjectId = scope === 'project' ? entityId ?? null : null;
  const isPayment = isPaymentType(formData.type);
  const transactionId = transaction?.id ?? null;
  const transactionType = transaction?.type ?? null;

  useEffect(() => {
    setCandidatesReady(false);
    setOutsideMatches([]);
    if (!enableMatching || !isOpen || (poolCompanyId === null && poolProjectId === null)) {
      setCandidates([]);
      setMatches({});
      setCandidatesReady(enableMatching && isOpen);
      return;
    }
    let cancelled = false;
    setLoadingCandidates(true);
    (async () => {
      try {
        const data = await window.electronAPI.transaction.getMatchCandidates({
          type: formData.type,
          companyId: poolCompanyId,
          projectId: poolProjectId,
          selfId: transactionId,
        });
        if (cancelled) return;
        const list = data || [];
        setCandidates(list);
        const current: MatchAmounts = {};
        for (const candidate of list) {
          if (candidate.allocated_here > 0) current[candidate.id] = candidate.allocated_here;
        }
        setMatches(current);

        if (transactionId !== null && transactionType === formData.type) {
          const saved = isPaymentType(formData.type)
            ? await window.electronAPI.transaction.getAllocationsForPayment(transactionId)
            : await window.electronAPI.transaction.getAllocationsForInvoice(transactionId);
          if (cancelled) return;
          const listed = new Set(list.map((c) => c.id));
          setOutsideMatches(
            (saved || []).filter((a) => !listed.has(isPaymentType(formData.type) ? a.invoice_id : a.payment_id))
          );
        }
        setCandidatesReady(true);
      } catch (error) {
        console.error('Eşleştirme adayları yüklenemedi:', error);
        if (!cancelled) {
          setCandidates([]);
          setMatches({});
        }
      } finally {
        if (!cancelled) setLoadingCandidates(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enableMatching, isOpen, formData.type, poolCompanyId, poolProjectId, transactionId, transactionType]);

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
        exchange_rate:
          transaction.currency && transaction.currency !== 'TRY' && transaction.exchange_rate > 0
            ? String(transaction.exchange_rate)
            : '',
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
    }
    setRestChoice(transaction ? 'advance' : null);
    setRestCategoryId('');
    setRestError(null);
    setRateError(null);
  }, [transaction, isOpen, isSimple]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const currency: Currency = isSimple ? 'TRY' : formData.currency;
    const exchangeRate = currency === 'TRY' ? 1 : parseFloat(formData.exchange_rate);
    if (!(exchangeRate > 0)) {
      setRateError(t('validation.exchangeRateRequired'));
      return;
    }
    setRateError(null);

    if (enableMatching && matchedTotal > targetAmount + MONEY_TOLERANCE) {
      toast.error(
        t('transactionModal.allocationExceedsPayment', {
          allocated: formatCurrency(matchedTotal),
          payment: formatCurrency(targetAmount),
        })
      );
      return;
    }
    if (needsRestChoice) {
      if (restChoice === null || (restChoice === 'advance' && !advanceAllowed)) {
        setRestError(t('transactionModal.restChoiceRequired'));
        return;
      }
      if (restChoice === 'document' && !restCategoryId) {
        setRestError(t('transactionModal.restCategoryRequired'));
        return;
      }
    }
    setRestError(null);

    setLoading(true);
    try {
      const baseData: TransactionFormData = {
        scope: transaction ? transaction.scope : scope,
        type: formData.type,
        date: formData.date,
        description: formData.description,
        amount: parseFloat(formData.amount),
        currency,
        exchange_rate: exchangeRate,
        category_id: formData.category_id || undefined,
        document_no: formData.document_no || undefined,
        notes: formData.notes || undefined,
        company_id: undefined,
        project_id: undefined,
        linked_invoice_id: undefined,
      };

      if (scope === 'project') {
        baseData.project_id = entityId;
        baseData.company_id = formData.company_id || undefined;
      } else if (scope === 'cari') {
        baseData.company_id = entityId;
        baseData.project_id = formData.project_id || undefined;
      }

      if (!enableMatching) {
        if (transaction) await window.electronAPI.transaction.update(transaction.id, baseData);
        else await window.electronAPI.transaction.create(baseData);
      } else {
        const request: SaveTransactionRequest = { id: transaction?.id, data: baseData };
        const entries = Object.entries(matches)
          .map(([id, amount]) => ({ id: Number(id), amount }))
          .filter((entry) => entry.amount > 0);
        if (candidatesReady) {
          if (isPayment) request.paymentAllocations = entries.map((e) => ({ invoiceId: e.id, amount: e.amount }));
          else request.invoiceAllocations = entries.map((e) => ({ paymentId: e.id, amount: e.amount }));
        }
        if (needsRestChoice && restChoice === 'document') {
          request.remainderDocument = { categoryId: Number(restCategoryId) };
        }
        await window.electronAPI.transaction.save(request);
      }

      onSave(!transaction);
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t('transactionModal.saveError', { error: ipcErrorMessage(error) }));
    } finally {
      setLoading(false);
    }
  };

  const applyTypeChange = (value: TransactionType) => {
    setFormData({
      ...formData,
      type: value,
      category_id: '',
      linked_invoice_id: '',
    });
    setMatches({});
    setRestChoice(null);
    setRestCategoryId('');
    setRestError(null);
  };

  const handleTypeChange = async (value: TransactionType) => {
    if (!transaction) {
      applyTypeChange(value);
      return;
    }

    // Düzenleme modunda: bağlı eşleştirmeleri kontrol et
    try {
      const isPayment = transaction.type === 'payment_in' || transaction.type === 'payment_out';
      const isInvoice = transaction.type === 'invoice_out' || transaction.type === 'invoice_in';

      let linkedAllocations: { amount: number }[] = [];
      if (isPayment) {
        linkedAllocations = await window.electronAPI.transaction.getAllocationsForPayment(transaction.id);
      } else if (isInvoice) {
        linkedAllocations = await window.electronAPI.transaction.getAllocationsForInvoice(transaction.id);
      }

      if (linkedAllocations.length > 0) {
        const total = linkedAllocations.reduce((sum, a) => sum + a.amount, 0);
        setTypeChangeWarning({
          show: true,
          pendingType: value,
          allocationCount: linkedAllocations.length,
          allocationTotal: total,
        });
        return;
      }
    } catch {
      // Sorgu başarısız olursa direkt devam et
    }

    applyTypeChange(value);
  };

  const confirmTypeChange = () => {
    if (typeChangeWarning.pendingType) {
      applyTypeChange(typeChangeWarning.pendingType);
    }
    setTypeChangeWarning({ show: false, pendingType: null, allocationCount: 0, allocationTotal: 0 });
  };

  const cancelTypeChange = () => {
    setTypeChangeWarning({ show: false, pendingType: null, allocationCount: 0, allocationTotal: 0 });
  };

  const updateField = <K extends keyof TransactionModalFormState>(
    field: K,
    value: TransactionModalFormState[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCurrencyChange = (currency: Currency) => {
    let exchangeRate = '';
    if (currency !== 'TRY') {
      if (transaction && transaction.currency === currency && transaction.exchange_rate > 0) {
        exchangeRate = String(transaction.exchange_rate);
      } else if (currentRates) {
        exchangeRate = String(currentRates[currency]);
      }
    }
    setRateError(null);
    setFormData((prev) => ({ ...prev, currency, exchange_rate: exchangeRate }));
  };

  const applyCurrentRate = () => {
    if (!currentRates || formData.currency === 'TRY') return;
    updateField('exchange_rate', String(currentRates[formData.currency]));
  };

  const targetAmount = formAmountInTry(formData, isSimple);
  const matchedTotal = sumMatches(matches);
  const unmatched = Math.max(0, roundMoney(targetAmount - matchedTotal));
  const advanceAllowed = poolCompanyId !== null;
  const needsRestChoice = enableMatching && isPayment && targetAmount > 0 && unmatched > MONEY_TOLERANCE;
  const documentType = formData.type === 'payment_in' ? 'invoice_out' : 'invoice_in';
  const documentCategories = categories.filter((c) => c.type === documentType);

  useEffect(() => {
    if (!advanceAllowed && restChoice === 'advance') setRestChoice(null);
  }, [advanceAllowed, restChoice]);

  const chooseRest = (choice: RestChoice) => {
    setRestChoice(choice);
    setRestError(null);
    if (choice === 'document' && !restCategoryId) {
      setRestCategoryId(defaultDocumentCategory(categories, documentType));
    }
  };

  const setMatchAmount = (candidate: MatchCandidate, value: number) => {
    setMatches((prev) => {
      const others = sumMatches(prev) - (prev[candidate.id] ?? 0);
      const capped = roundMoney(Math.max(0, Math.min(value, candidate.remaining, targetAmount - others)));
      const next = { ...prev };
      if (capped > 0) next[candidate.id] = capped;
      else delete next[candidate.id];
      return next;
    });
  };

  const removeMatch = (candidateId: number) => {
    setMatches((prev) => {
      const next = { ...prev };
      delete next[candidateId];
      return next;
    });
  };

  const handleAutoMatch = () => {
    if (targetAmount <= 0 || candidates.length === 0) return;
    setMatches(autoMatch(candidates, targetAmount));
  };

  const filteredCategories = getFilteredCategories(categories, formData.type);
  const showMatchPanel = enableMatching && (isPayment || candidates.length > 0 || matchedTotal > 0 || outsideMatches.length > 0);
  const showExchangeRate = enableCurrency && formData.currency !== 'TRY';
  const rateValue = parseFloat(formData.exchange_rate);
  const amountValue = parseFloat(formData.amount);
  const currentRate = currentRates && formData.currency !== 'TRY' ? currentRates[formData.currency] : null;

  const getTitle = () => {
    if (transaction) return t('transactionModal.editTitle');
    if (scope === 'project') return t('transactionModal.newProjectTransaction');
    if (scope === 'company') return t('transactionModal.companyIncomeExpense');
    return t('transactionModal.newTransaction');
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size={showMatchPanel ? 'lg' : 'md'}>
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
                  className="sr-only peer"
                />
                <div
                  className={`peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-gray-800 ${isSimple ? 'p-4' : 'p-2.5'} border-2 rounded-lg cursor-pointer text-center transition-all ${
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
                  handleCurrencyChange(e.target.value as Currency)
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

          {showExchangeRate && (
            <div className="p-3 space-y-2 text-sm border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Input
                label={`${t('transactionModal.exchangeRate', { currency: formData.currency })} *`}
                type="number"
                step="0.0001"
                min="0"
                value={formData.exchange_rate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setRateError(null);
                  updateField('exchange_rate', e.target.value);
                }}
                error={rateError ?? undefined}
              />
              {currentRate !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-blue-700 dark:text-blue-400">
                    {t('transactionModal.currentRate')}: 1 {formData.currency} = {currentRate.toFixed(4)} TL
                  </span>
                  {rateValue !== currentRate && (
                    <button
                      type="button"
                      onClick={applyCurrentRate}
                      className="font-medium text-blue-700 underline dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                    >
                      {t('transactionModal.useCurrentRate')}
                    </button>
                  )}
                </div>
              )}
              {rateValue > 0 && amountValue > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-blue-700 dark:text-blue-400">{t('transactionModal.tryEquivalent')}:</span>
                  <span className="font-medium text-blue-900 dark:text-blue-300">
                    {formatCurrency(Math.round(amountValue * rateValue * 100) / 100)}
                  </span>
                </div>
              )}
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

          {showMatchPanel && (
            <div className="p-3 space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isPayment
                    ? t('shared.allocations.title')
                    : formData.type === 'invoice_out'
                      ? t('transactionModal.invoiceMatchesTitleSale')
                      : t('transactionModal.invoiceMatchesTitle')}
                </span>
                <div className="flex items-center gap-1">
                  {matchedTotal > 0 && (
                    <Button type="button" variant="ghost" size="xs" icon={FiX} onClick={() => setMatches({})}>
                      {t('transactionModal.clearMatches')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    icon={FiZap}
                    onClick={handleAutoMatch}
                    disabled={targetAmount <= 0 || candidates.length === 0}
                    className="!text-indigo-700 dark:!text-indigo-400 !bg-indigo-100 dark:!bg-indigo-900/30 hover:!bg-indigo-200 dark:hover:!bg-indigo-900/50"
                  >
                    {t('transactionModal.autoAllocate')}
                  </Button>
                </div>
              </div>

              {scope === 'project' && poolCompanyId === null && isPayment && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('transactionModal.noCompanyHint')}</p>
              )}

              {outsideMatches.map((a) => (
                <div
                  key={a.id}
                  role="alert"
                  className="flex items-start gap-2 p-2 text-xs text-amber-800 border border-amber-200 rounded bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
                >
                  <FiAlertTriangle className="mt-0.5 flex-shrink-0" />
                  <span>
                    {t('transactionModal.outsideMatch', {
                      description: (isPayment ? a.invoice_description : a.payment_description) || '-',
                      amount: formatCurrency(a.amount),
                    })}
                  </span>
                </div>
              ))}

              {loadingCandidates ? (
                <div className="py-3 text-xs text-center text-gray-500 dark:text-gray-400">{t('transactionModal.loadingInvoices')}</div>
              ) : candidates.length === 0 ? (
                <div className="py-3 text-xs text-center text-gray-500 dark:text-gray-400">
                  {isPayment ? t('transactionModal.noOpenInvoices') : t('transactionModal.noOpenPayments')}
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-56">
                  {candidates.map((candidate) => {
                    const amount = matches[candidate.id] ?? 0;
                    const otherProject =
                      candidate.project_name && candidate.project_id !== poolProjectId ? candidate.project_name : null;
                    const name = candidate.document_no || candidate.description;
                    return (
                      <div
                        key={candidate.id}
                        className={`flex items-center gap-2 p-2 bg-white border rounded dark:bg-gray-800 ${
                          amount > 0 ? 'border-indigo-300 dark:border-indigo-700' : 'border-gray-100 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate dark:text-gray-100">{name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(candidate.date)} — {formatCurrency(candidate.amount_try)}
                            {' · '}
                            {isPayment ? t('transactionModal.remaining') : t('transactionModal.unmatchedOnPayment')}:{' '}
                            {formatCurrency(Math.max(0, roundMoney(candidate.remaining - amount)))}
                            {otherProject && <> · {t('transactionModal.otherProject', { name: otherProject })}</>}
                          </div>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={candidate.remaining}
                          value={amount || ''}
                          onChange={(e) => setMatchAmount(candidate, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          aria-label={t('transactionModal.matchAmountFor', { name })}
                          className="w-24 px-2 py-1 text-xs text-right bg-white border border-gray-200 rounded dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeMatch(candidate.id)}
                          disabled={amount <= 0}
                          title={t('transactionModal.removeMatch')}
                          aria-label={t('transactionModal.removeMatch')}
                          className="p-1 text-gray-400 rounded hover:text-red-600 disabled:invisible dark:hover:text-red-400"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Toplam göstergesi */}
              {targetAmount > 0 && (
                <div className="flex items-center justify-between pt-2 text-xs border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('transactionModal.allocation')}: {formatCurrency(matchedTotal)} / {formatCurrency(targetAmount)}
                  </span>
                  {unmatched > MONEY_TOLERANCE ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      {isPayment ? t('transactionModal.unallocated') : t('transactionModal.invoiceOpen')}: {formatCurrency(unmatched)}
                    </span>
                  ) : (
                    matchedTotal > 0 && <span className="text-green-600 dark:text-green-400">{t('transactionModal.fullMatch')}</span>
                  )}
                </div>
              )}

              {needsRestChoice && (
                <fieldset className="pt-2 space-y-2 border-t border-gray-200 dark:border-gray-700">
                  <legend className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('transactionModal.restTitle', { amount: formatCurrency(unmatched) })}
                  </legend>
                  <label className={`flex items-start gap-2 text-xs ${advanceAllowed ? 'cursor-pointer' : 'opacity-60'}`}>
                    <input
                      type="radio"
                      name="restChoice"
                      checked={restChoice === 'advance'}
                      disabled={!advanceAllowed}
                      onChange={() => chooseRest('advance')}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{t('transactionModal.restAdvance')}</span>
                      <span className="block text-gray-500 dark:text-gray-400">
                        {advanceAllowed ? t('transactionModal.restAdvanceHint') : t('transactionModal.restAdvanceNoCompany')}
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="restChoice"
                      checked={restChoice === 'document'}
                      onChange={() => chooseRest('document')}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formData.type === 'payment_in' ? t('transactionModal.restIncome') : t('transactionModal.restExpense')}
                      </span>
                      <span className="block text-gray-500 dark:text-gray-400">
                        {formData.type === 'payment_in' ? t('transactionModal.restIncomeHint') : t('transactionModal.restExpenseHint')}
                      </span>
                    </span>
                  </label>
                  {restChoice === 'document' && (
                    <Select
                      label={t('transactionModal.restCategory')}
                      options={documentCategories.map((c) => ({ value: c.id, label: t(`categories.${c.name}`, c.name) }))}
                      value={restCategoryId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        setRestCategoryId(e.target.value);
                        setRestError(null);
                      }}
                    />
                  )}
                  {restError && (
                    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                      {restError}
                    </p>
                  )}
                </fieldset>
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
          <Button type="submit" loading={loading} disabled={loadingCandidates}>
            {transaction ? t('common.update') : t('common.save')}
          </Button>
        </ModalFooter>
      </form>
    </Modal>

    <ConfirmDialog
      isOpen={typeChangeWarning.show}
      onClose={cancelTypeChange}
      onConfirm={confirmTypeChange}
      title={t('transactionModal.typeChangeWarningTitle')}
      message={t('transactionModal.typeChangeWarningMessage', {
        count: typeChangeWarning.allocationCount,
        total: formatCurrency(typeChangeWarning.allocationTotal),
      })}
      type="warning"
      confirmText={t('transactionModal.removeAllocations')}
      cancelText={t('common.cancel')}
    />
    </>
  );
}
