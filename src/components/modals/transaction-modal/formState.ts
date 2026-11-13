import { formatDateForInput } from '../../../utils/formatters';
import { invoiceTypeFor, type InvoiceType } from '../../../utils/transactionKinds';
import { DEFAULT_DOCUMENT_CATEGORY } from '../../../utils/categories';
import { roundMoney } from '../../../utils/money';
import type { Category, Currency, TransactionType, TransactionWithDetails } from '../../../types';

export interface TransactionModalFormState {
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
}

export type RestChoice = 'advance' | 'document';

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
  };
}

export function ownRateFor(transaction: TransactionWithDetails | null, currency: Currency): string {
  return transaction &&
    currency !== 'TRY' &&
    transaction.currency === currency &&
    transaction.exchange_rate > 0
    ? String(transaction.exchange_rate)
    : '';
}

export function initialFormData(
  transaction: TransactionWithDetails | null,
  isSimple: boolean
): TransactionModalFormState {
  if (!transaction) return getDefaultFormData();
  const currency = transaction.currency || 'TRY';
  return {
    type: isSimple ? (invoiceTypeFor(transaction.type) ?? transaction.type) : transaction.type,
    date: formatDateForInput(transaction.date),
    description: transaction.description,
    amount: String(transaction.amount),
    currency,
    exchange_rate: ownRateFor(transaction, currency),
    category_id: transaction.category_id ? String(transaction.category_id) : '',
    company_id: transaction.company_id ? String(transaction.company_id) : '',
    project_id: transaction.project_id ? String(transaction.project_id) : '',
    document_no: transaction.document_no || '',
    notes: transaction.notes || '',
  };
}

export function getFilteredCategories(categories: Category[], type: TransactionType): Category[] {
  if (type === 'invoice_out') return categories.filter((c) => c.type === 'invoice_out');
  if (type === 'invoice_in') return categories.filter((c) => c.type === 'invoice_in');
  return categories.filter((c) => c.type === 'payment');
}

export function defaultDocumentCategory(ofType: Category[], type: InvoiceType): string {
  const preferred = ofType.find((c) => c.name === DEFAULT_DOCUMENT_CATEGORY[type]);
  const chosen = preferred ?? ofType[0];
  return chosen ? String(chosen.id) : '';
}

export function amountInTry(amount: string, rate: number): number {
  return roundMoney((parseFloat(amount) || 0) * (rate || 0));
}
