import type {
  Currency,
  SaveTransactionRequest,
  TransactionScope,
  TransactionWithDetails,
} from '../../../types';
import type { TransactionFormInput } from '../../../utils/schemas';
import type { TransactionModalFormState } from './formState';
import type { MatchAmounts } from './matchAmounts';

interface TransactionInputParams {
  form: TransactionModalFormState;
  transaction: TransactionWithDetails | null;
  scope: TransactionScope;
  entityId?: number;
  isSimple: boolean;
  exchangeRate: number;
}

export interface SaveTransactionParams {
  transaction: TransactionWithDetails | null;
  data: TransactionFormInput;
  withMatching: boolean;
  matches: MatchAmounts | null;
  isPayment: boolean;
  remainderCategoryId: number | null;
}

export function buildTransactionInput({
  form,
  transaction,
  scope,
  entityId,
  isSimple,
  exchangeRate,
}: TransactionInputParams): TransactionFormInput {
  const currency: Currency = isSimple ? 'TRY' : form.currency;
  const data: TransactionFormInput = {
    scope: transaction ? transaction.scope : scope,
    type: form.type,
    date: form.date,
    description: form.description,
    amount: parseFloat(form.amount),
    currency,
    exchange_rate: exchangeRate,
    category_id: form.category_id || undefined,
    document_no: form.document_no || undefined,
    notes: form.notes || undefined,
    company_id: undefined,
    project_id: undefined,
    linked_invoice_id: undefined,
  };

  if (scope === 'project') {
    data.project_id = entityId;
    data.company_id = form.company_id || undefined;
  } else if (scope === 'cari') {
    data.company_id = entityId;
    data.project_id = form.project_id || undefined;
  }
  return data;
}

export function saveTransaction({
  transaction,
  data,
  withMatching,
  matches,
  isPayment,
  remainderCategoryId,
}: SaveTransactionParams): Promise<unknown> {
  if (!withMatching) {
    return transaction
      ? window.electronAPI.transaction.update(transaction.id, data)
      : window.electronAPI.transaction.create(data);
  }
  const request: SaveTransactionRequest = { id: transaction?.id, data };
  if (matches) {
    const entries = Object.entries(matches)
      .map(([id, amount]) => ({ id: Number(id), amount }))
      .filter((entry) => entry.amount > 0);
    if (isPayment)
      request.paymentAllocations = entries.map((e) => ({ invoiceId: e.id, amount: e.amount }));
    else request.invoiceAllocations = entries.map((e) => ({ paymentId: e.id, amount: e.amount }));
  }
  if (remainderCategoryId !== null) request.remainderDocument = { categoryId: remainderCategoryId };
  return window.electronAPI.transaction.save(request);
}
