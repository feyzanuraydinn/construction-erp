import type { PaymentType } from '../types';

export type InvoiceType = 'invoice_out' | 'invoice_in';

export function isPaymentType(type: string): type is PaymentType {
  return type === 'payment_in' || type === 'payment_out';
}

export function invoiceTypeFor(type: PaymentType): InvoiceType;
export function invoiceTypeFor(type: string): InvoiceType | null;
export function invoiceTypeFor(type: string): InvoiceType | null {
  if (type === 'payment_in') return 'invoice_out';
  if (type === 'payment_out') return 'invoice_in';
  return null;
}

export function paymentTypeFor(type: string): PaymentType | null {
  if (type === 'invoice_out') return 'payment_in';
  if (type === 'invoice_in') return 'payment_out';
  return null;
}
