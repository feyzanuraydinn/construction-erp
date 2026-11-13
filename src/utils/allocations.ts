import { isPaymentType } from './transactionKinds';
import type { PaymentAllocationWithDetails, TransactionType } from '../types';

export interface AllocationCounterpart {
  description: string;
  documentNo: string | null;
  date: string | null;
}

export function loadAllocations(tx: {
  id: number;
  type: TransactionType;
}): Promise<PaymentAllocationWithDetails[]> {
  return isPaymentType(tx.type)
    ? window.electronAPI.transaction.getAllocationsForPayment(tx.id)
    : window.electronAPI.transaction.getAllocationsForInvoice(tx.id);
}

export function allocationCounterpart(
  alloc: PaymentAllocationWithDetails,
  viewingPayment: boolean
): AllocationCounterpart {
  return viewingPayment
    ? {
        description: alloc.invoice_description ?? '',
        documentNo: alloc.invoice_document_no ?? null,
        date: alloc.invoice_date ?? null,
      }
    : {
        description: alloc.payment_description ?? '',
        documentNo: alloc.payment_document_no ?? null,
        date: alloc.payment_date ?? null,
      };
}

export function counterpartIdOf(
  alloc: PaymentAllocationWithDetails,
  viewingPayment: boolean
): number {
  return viewingPayment ? alloc.invoice_id : alloc.payment_id;
}
