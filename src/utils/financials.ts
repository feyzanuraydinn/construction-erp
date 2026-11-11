import type { Transaction, TransactionWithDetails, OwnershipType } from '../types';

// ==================== ORTAK YARDIMCI ====================

/** Hem Transaction hem TransactionWithDetails kabul eden tip */
type AnyTransaction = Transaction | TransactionWithDetails;

/** Transaction listesinden tip bazlı TRY toplamı hesaplar */
function sumByType(transactions: AnyTransaction[], type: string): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + (t.amount_try || t.amount), 0);
}

function amountTry(t: AnyTransaction): number {
  return t.amount_try || t.amount;
}

function openOnInvoice(t: AnyTransaction): number {
  const settled = ('settled_amount' in t && t.settled_amount) || 0;
  return Math.max(0, amountTry(t) - settled);
}

function unmatchedOnPayment(t: AnyTransaction): number {
  const allocated = ('allocated_amount' in t && t.allocated_amount) || 0;
  return Math.max(0, amountTry(t) - allocated);
}

interface OpenBalances {
  receivable: number;
  debt: number;
  advanceReceived: number;
  advanceGiven: number;
}

function calculateOpenBalances(transactions: AnyTransaction[]): OpenBalances {
  const groups = new Map<number, { openOut: number; openIn: number; unmatchedIn: number; unmatchedOut: number }>();
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

// ==================== TYPES ====================

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

// ==================== PURE FUNCTIONS ====================

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
  const budgetUsed = estimatedBudget ? (totalExpense / estimatedBudget) * 100 : 0;

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

/**
 * Cari hesap finansal hesaplamalarını yapar.
 * Cari hesapta TÜM ödemeler borç/alacağı azaltır (eşleştirme bağımsız).
 *
 * Alacak = Satış faturaları - Tüm tahsilatlar (müşteri bize borçlu)
 * Borç   = Alış faturaları - Tüm ödemeler (biz borçluyuz)
 * Bakiye = Alacak - Borç
 */
export function calculateCompanyFinancials(transactions: AnyTransaction[]): CompanyFinancials {
  const totalInvoiceOut = sumByType(transactions, 'invoice_out');
  const totalPaymentIn = sumByType(transactions, 'payment_in');
  const totalInvoiceIn = sumByType(transactions, 'invoice_in');
  const totalPaymentOut = sumByType(transactions, 'payment_out');

  const receivable = totalInvoiceOut - totalPaymentIn;
  const payable = totalInvoiceIn - totalPaymentOut;
  const balance = receivable - payable;

  return {
    totalInvoiceOut,
    totalPaymentIn,
    totalInvoiceIn,
    totalPaymentOut,
    receivable,
    payable,
    balance,
  };
}

/**
 * Dashboard genel finansal hesaplamalarını yapar.
 * Gelir/Gider sadece faturalar üzerinden hesaplanır.
 * Tahsilat/Ödeme ayrı gösterilir.
 *
 * Gelir = Satış faturaları toplamı
 * Gider = Alış faturaları toplamı
 */
export function calculateDashboardFinancials(transactions: AnyTransaction[]): DashboardFinancials {
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

/**
 * İşlem toplamlarını hesaplar.
 * Transactions listesi, CompanyAccount ve PrintView'da kullanılır.
 *
 * totalIncome = Satış faturaları (fatura bazlı gelir)
 * totalExpense = Alış faturaları (fatura bazlı gider)
 * netProfit = Satış faturaları - Alış faturaları (fatura bazlı kâr/zarar)
 * netCashFlow = Tahsilatlar - Ödemeler (nakit akışı)
 * netBalance = Alacak - Borç = (invoice_out - payment_in) - (invoice_in - payment_out)
 *
 * Ödemeler fatura borcunu/alacağını azaltır, gider/gelir olarak eklenmez.
 */
export function calculateTransactionTotals(transactions: AnyTransaction[]): TransactionTotals {
  const totalInvoiceOut = sumByType(transactions, 'invoice_out');
  const totalPaymentIn = sumByType(transactions, 'payment_in');
  const totalInvoiceIn = sumByType(transactions, 'invoice_in');
  const totalPaymentOut = sumByType(transactions, 'payment_out');

  const receivable = totalInvoiceOut - totalPaymentIn;
  const payable = totalInvoiceIn - totalPaymentOut;
  const withCompany = transactions.filter((t) => t.company_id != null);
  const openBalance =
    sumByType(withCompany, 'invoice_out') -
    sumByType(withCompany, 'payment_in') -
    (sumByType(withCompany, 'invoice_in') - sumByType(withCompany, 'payment_out'));

  return {
    totalInvoiceOut,
    totalPaymentIn,
    totalInvoiceIn,
    totalPaymentOut,
    totalIncome: totalInvoiceOut,
    totalExpense: totalInvoiceIn,
    netProfit: totalInvoiceOut - totalInvoiceIn,
    netCashFlow: totalPaymentIn - totalPaymentOut,
    netBalance: receivable - payable,
    openBalance,
  };
}
