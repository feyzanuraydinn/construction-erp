import type { Transaction, TransactionWithDetails, OwnershipType } from '../types';
import { MONEY_TOLERANCE, amountInTry } from './money';
import { budgetUsedPercent } from './budget';

type AnyTransaction = Transaction | TransactionWithDetails;

export interface MoneyRecord {
  type?: string;
  amount?: number | null;
  amount_try?: number | null;
  company_id?: number | null;
}

function sumByType(transactions: MoneyRecord[], type: string): number {
  return transactions.filter((t) => t.type === type).reduce((sum, t) => sum + amountInTry(t), 0);
}

function openOnInvoice(t: AnyTransaction): number {
  const settled = ('settled_amount' in t && t.settled_amount) || 0;
  return Math.max(0, amountInTry(t) - settled);
}

function unmatchedOnPayment(t: AnyTransaction): number {
  const allocated = ('allocated_amount' in t && t.allocated_amount) || 0;
  return Math.max(0, amountInTry(t) - allocated);
}

interface OpenBalances {
  receivable: number;
  debt: number;
  advanceReceived: number;
  advanceGiven: number;
}

function calculateOpenBalances(transactions: AnyTransaction[]): OpenBalances {
  const groups = new Map<
    number,
    { openOut: number; openIn: number; unmatchedIn: number; unmatchedOut: number }
  >();
  for (const t of transactions) {
    if (t.company_id == null) continue;
    const key = t.company_id;
    const group = groups.get(key) ?? { openOut: 0, openIn: 0, unmatchedIn: 0, unmatchedOut: 0 };
    if (t.type === 'invoice_out') group.openOut += openOnInvoice(t);
    else if (t.type === 'invoice_in') group.openIn += openOnInvoice(t);
    else if (t.type === 'payment_in') group.unmatchedIn += unmatchedOnPayment(t);
    else if (t.type === 'payment_out') group.unmatchedOut += unmatchedOnPayment(t);
    groups.set(key, group);
  }
  const result: OpenBalances = { receivable: 0, debt: 0, advanceReceived: 0, advanceGiven: 0 };
  for (const group of groups.values()) {
    result.receivable += Math.max(0, group.openOut - group.unmatchedIn);
    result.advanceReceived += Math.max(0, group.unmatchedIn - group.openOut);
    result.debt += Math.max(0, group.openIn - group.unmatchedOut);
    result.advanceGiven += Math.max(0, group.unmatchedOut - group.openIn);
  }
  return result;
}

export interface ProjectFinancials {
  totalInvoiceOut: number;
  totalInvoiceIn: number;
  totalPaymentIn: number;
  totalPaymentOut: number;
  totalIncome: number;
  totalExpense: number;
  projectProfit: number;
  estimatedProfit: number | null;
  budgetUsed: number;
  ownershipType: OwnershipType;
  clientReceivable: number;
  projectDebt: number;
  advanceReceived: number;
  advanceGiven: number;
  unmatchedPaymentIn: number;
  unmatchedPaymentOut: number;
}

export interface CompanyFinancials {
  totalInvoiceOut: number;
  totalPaymentIn: number;
  totalInvoiceIn: number;
  totalPaymentOut: number;
  receivable: number;
  payable: number;
  balance: number;
  receivableFromOverpayment: boolean;
  payableFromOverpayment: boolean;
}

export interface DashboardFinancials {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  totalCollected: number;
  totalPaid: number;
}

export interface TransactionTotals {
  totalInvoiceOut: number;
  totalPaymentIn: number;
  totalInvoiceIn: number;
  totalPaymentOut: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  netCashFlow: number;
  netBalance: number;
  openBalance: number;
}

export function calculateProjectFinancials(
  transactions: AnyTransaction[],
  ownershipType: OwnershipType = 'own',
  estimatedBudget?: number | null
): ProjectFinancials {
  const totalInvoiceOut = sumByType(transactions, 'invoice_out');
  const totalInvoiceIn = sumByType(transactions, 'invoice_in');
  const totalPaymentIn = sumByType(transactions, 'payment_in');
  const totalPaymentOut = sumByType(transactions, 'payment_out');

  const totalIncome = totalInvoiceOut;
  const totalExpense = totalInvoiceIn;
  const projectProfit = totalIncome - totalExpense;
  const estimatedProfit = estimatedBudget ? estimatedBudget - totalExpense : null;
  const budgetUsed = budgetUsedPercent(totalExpense, estimatedBudget);

  const open = calculateOpenBalances(transactions);
  const unmatched = (type: string) =>
    transactions.filter((t) => t.type === type).reduce((sum, t) => sum + unmatchedOnPayment(t), 0);

  return {
    totalInvoiceOut,
    totalInvoiceIn,
    totalPaymentIn,
    totalPaymentOut,
    totalIncome,
    totalExpense,
    projectProfit,
    estimatedProfit,
    budgetUsed,
    ownershipType,
    clientReceivable: open.receivable,
    projectDebt: open.debt,
    advanceReceived: open.advanceReceived,
    advanceGiven: open.advanceGiven,
    unmatchedPaymentIn: unmatched('payment_in'),
    unmatchedPaymentOut: unmatched('payment_out'),
  };
}

export function splitNetBalance(balance: number): { receivable: number; payable: number } {
  if (balance > MONEY_TOLERANCE) return { receivable: balance, payable: 0 };
  if (balance < -MONEY_TOLERANCE) return { receivable: 0, payable: -balance };
  return { receivable: 0, payable: 0 };
}

export function balanceEffect(record: MoneyRecord): number {
  if (record.type === 'invoice_out' || record.type === 'payment_out') return amountInTry(record);
  if (record.type === 'invoice_in' || record.type === 'payment_in') return -amountInTry(record);
  return 0;
}

export function netBalanceOf(records: MoneyRecord[]): number {
  return records.reduce((sum, record) => sum + balanceEffect(record), 0);
}

export function sumNetPositions(transactions: MoneyRecord[]): {
  receivable: number;
  payable: number;
} {
  const nets = new Map<number | null, number>();
  for (const t of transactions) {
    const key = t.company_id ?? null;
    nets.set(key, (nets.get(key) ?? 0) + balanceEffect(t));
  }
  let receivable = 0;
  let payable = 0;
  for (const net of nets.values()) {
    const split = splitNetBalance(net);
    receivable += split.receivable;
    payable += split.payable;
  }
  return { receivable, payable };
}

export function calculateCompanyFinancials(transactions: MoneyRecord[]): CompanyFinancials {
  const totalInvoiceOut = sumByType(transactions, 'invoice_out');
  const totalPaymentIn = sumByType(transactions, 'payment_in');
  const totalInvoiceIn = sumByType(transactions, 'invoice_in');
  const totalPaymentOut = sumByType(transactions, 'payment_out');

  const salesSide = totalInvoiceOut - totalPaymentIn;
  const purchaseSide = totalInvoiceIn - totalPaymentOut;
  const balance = netBalanceOf(transactions);
  const { receivable, payable } = splitNetBalance(balance);

  return {
    totalInvoiceOut,
    totalPaymentIn,
    totalInvoiceIn,
    totalPaymentOut,
    receivable,
    payable,
    balance,
    receivableFromOverpayment: receivable > 0 && salesSide <= MONEY_TOLERANCE,
    payableFromOverpayment: payable > 0 && purchaseSide <= MONEY_TOLERANCE,
  };
}

export function calculateDashboardFinancials(transactions: MoneyRecord[]): DashboardFinancials {
  const totalIncome = sumByType(transactions, 'invoice_out');
  const totalExpense = sumByType(transactions, 'invoice_in');
  const totalCollected = sumByType(transactions, 'payment_in');
  const totalPaid = sumByType(transactions, 'payment_out');

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    totalCollected,
    totalPaid,
  };
}

export function calculateTransactionTotals(transactions: MoneyRecord[]): TransactionTotals {
  const totalInvoiceOut = sumByType(transactions, 'invoice_out');
  const totalPaymentIn = sumByType(transactions, 'payment_in');
  const totalInvoiceIn = sumByType(transactions, 'invoice_in');
  const totalPaymentOut = sumByType(transactions, 'payment_out');

  return {
    totalInvoiceOut,
    totalPaymentIn,
    totalInvoiceIn,
    totalPaymentOut,
    totalIncome: totalInvoiceOut,
    totalExpense: totalInvoiceIn,
    netProfit: totalInvoiceOut - totalInvoiceIn,
    netCashFlow: totalPaymentIn - totalPaymentOut,
    netBalance: netBalanceOf(transactions),
    openBalance: netBalanceOf(transactions.filter((t) => t.company_id != null)),
  };
}
