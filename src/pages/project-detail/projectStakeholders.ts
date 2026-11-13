import { balanceEffect } from '../../utils/financials';
import { amountInTry } from '../../utils/money';
import { isPaymentType } from '../../utils/transactionKinds';
import type { AccountType, Company, TransactionWithDetails } from '../../types';

export interface Stakeholder {
  company_id: number;
  company_name: string;
  account_type: AccountType;
  phone: string;
  email: string;
  transaction_count: number;
  total_invoice: number;
  total_payment: number;
  balance: number;
}

export type StakeholderRef = Pick<Stakeholder, 'company_id' | 'company_name'>;

export function collectStakeholders(
  transactions: TransactionWithDetails[],
  companies: Company[]
): Stakeholder[] {
  return transactions.reduce<Stakeholder[]>((acc, tx) => {
    if (tx.company_id && tx.company_name) {
      const amount = amountInTry(tx);
      const isInvoice = tx.type === 'invoice_in' || tx.type === 'invoice_out';
      const isPayment = isPaymentType(tx.type);
      const signed = balanceEffect(tx);
      const existing = acc.find((s) => s.company_id === tx.company_id);
      if (existing) {
        existing.transaction_count += 1;
        if (isInvoice) existing.total_invoice += amount;
        if (isPayment) existing.total_payment += amount;
        existing.balance += signed;
      } else {
        const company = companies.find((c) => c.id === tx.company_id);
        acc.push({
          company_id: tx.company_id,
          company_name: tx.company_name,
          account_type: company?.account_type || 'customer',
          phone: company?.phone || '',
          email: company?.email || '',
          transaction_count: 1,
          total_invoice: isInvoice ? amount : 0,
          total_payment: isPayment ? amount : 0,
          balance: signed,
        });
      }
    }
    return acc;
  }, []);
}
