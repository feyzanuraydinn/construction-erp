import type { TFunction } from 'i18next';
import type { TransactionType, BadgeVariant, TransactionWithDetails } from '../types';
import { formatCurrency } from './formatters';
import { MONEY_TOLERANCE } from './money';
import { isPaymentType } from './transactionKinds';

export const isPositiveTransaction = (type: TransactionType): boolean =>
  type === 'invoice_out' || type === 'payment_in';

export function transactionSign(type: TransactionType): '+' | '-' | '' {
  if (isPositiveTransaction(type)) return '+';
  if (type === 'invoice_in' || type === 'payment_out') return '-';
  return '';
}

export function getTransactionColor(type: TransactionType): string {
  switch (type) {
    case 'invoice_out':
      return 'bg-green-500';
    case 'payment_in':
      return 'bg-blue-500';
    case 'invoice_in':
      return 'bg-red-500';
    case 'payment_out':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
}

export function getTransactionTextColor(type: TransactionType): string {
  switch (type) {
    case 'invoice_out':
      return 'text-green-600 dark:text-green-400';
    case 'payment_in':
      return 'text-blue-600 dark:text-blue-400';
    case 'invoice_in':
      return 'text-red-600 dark:text-red-400';
    case 'payment_out':
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

export function getPrintTransactionTextColor(type: TransactionType): string {
  switch (type) {
    case 'invoice_out':
      return 'text-green-700';
    case 'payment_in':
      return 'text-blue-700';
    case 'invoice_in':
      return 'text-red-700';
    case 'payment_out':
      return 'text-orange-700';
    default:
      return 'text-gray-700';
  }
}

export function getSimpleTransactionTextColor(type: TransactionType): string {
  switch (type) {
    case 'invoice_out':
    case 'payment_in':
      return 'text-green-600 dark:text-green-400';
    case 'invoice_in':
    case 'payment_out':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

export function getSimpleTransactionBadgeVariant(type: TransactionType): BadgeVariant {
  switch (type) {
    case 'invoice_out':
    case 'payment_in':
      return 'success';
    case 'invoice_in':
    case 'payment_out':
      return 'danger';
    default:
      return 'info';
  }
}

export function deleteTransactionMessage(
  t: TFunction,
  tx: Pick<TransactionWithDetails, 'type' | 'allocated_amount' | 'settled_amount'> | null,
  baseKey: string
): string {
  const base = t(baseKey);
  if (!tx) return base;
  const isPayment = isPaymentType(tx.type);
  const matched = (isPayment ? tx.allocated_amount : tx.settled_amount) ?? 0;
  if (matched <= MONEY_TOLERANCE) return base;
  const note = t(
    isPayment
      ? 'shared.deleteTransaction.matchedPayment'
      : 'shared.deleteTransaction.matchedInvoice',
    {
      amount: formatCurrency(matched),
    }
  );
  return `${base} ${note}`;
}
