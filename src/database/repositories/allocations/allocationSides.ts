import type { TransactionType } from '../../../types';
import { isPaymentType, invoiceTypeFor, paymentTypeFor } from '../../../utils/transactionKinds';

export interface MatchRow {
  id: number;
  type: TransactionType;
  company_id: number | null;
  project_id: number | null;
  amount_try: number;
}

export type AllocationColumn = 'payment_id' | 'invoice_id';

type ExceedsProblem = 'exceeds_payment' | 'exceeds_invoice';

export interface AllocationSide {
  own: AllocationColumn;
  other: AllocationColumn;
  counterpartPrefix: 'invoice' | 'payment';
  counterpartType: (type: string) => TransactionType | null;
  exceedsOwn: ExceedsProblem;
  exceedsCounterpart: ExceedsProblem;
}

export const PAYMENT_SIDE: AllocationSide = {
  own: 'payment_id',
  other: 'invoice_id',
  counterpartPrefix: 'invoice',
  counterpartType: invoiceTypeFor,
  exceedsOwn: 'exceeds_payment',
  exceedsCounterpart: 'exceeds_invoice',
};

export const INVOICE_SIDE: AllocationSide = {
  own: 'invoice_id',
  other: 'payment_id',
  counterpartPrefix: 'payment',
  counterpartType: paymentTypeFor,
  exceedsOwn: 'exceeds_invoice',
  exceedsCounterpart: 'exceeds_payment',
};

export function sideOf(type: string): AllocationSide {
  return isPaymentType(type) ? PAYMENT_SIDE : INVOICE_SIDE;
}

export interface SideAllocation {
  counterpartId: number;
  amount: number;
}
