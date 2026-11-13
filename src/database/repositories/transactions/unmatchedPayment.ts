import type { TransactionWithDetails } from '../../../types';
import type { TransactionInput } from '../../../utils/schemas';
import { MONEY_TOLERANCE, amountInTry, roundMoney } from '../../../utils/money';
import { isPaymentType, type InvoiceType } from '../../../utils/transactionKinds';

export function needsCounterparty(tx: TransactionWithDetails | undefined): boolean {
  return (
    !!tx &&
    isPaymentType(tx.type) &&
    tx.scope === 'project' &&
    !tx.company_id &&
    amountInTry(tx) - (tx.allocated_amount ?? 0) > MONEY_TOLERANCE
  );
}

export function planRemainderDocument(
  payment: TransactionWithDetails,
  documentType: InvoiceType,
  categoryId: number,
  note: string | null
): { input: TransactionInput; rest: number } | null {
  const paymentTry = amountInTry(payment);
  const rest = roundMoney(paymentTry - (payment.allocated_amount ?? 0));
  if (rest <= MONEY_TOLERANCE) return null;
  const whole = Math.abs(rest - paymentTry) <= MONEY_TOLERANCE;
  return {
    rest,
    input: {
      scope: payment.scope,
      company_id: payment.company_id ?? null,
      project_id: payment.project_id ?? null,
      type: documentType,
      category_id: categoryId,
      date: payment.date,
      description: payment.description,
      amount: whole ? payment.amount : rest,
      currency: whole ? payment.currency : 'TRY',
      exchange_rate: whole ? payment.exchange_rate : 1,
      document_no: null,
      linked_invoice_id: null,
      notes: note,
    },
  };
}
