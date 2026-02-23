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

/** Transaction listesinden tip bazlı allocated_amount toplamı hesaplar */
function sumAllocatedByType(transactions: AnyTransaction[], type: string): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + (('allocated_amount' in t && t.allocated_amount) || 0), 0);
}

/** Bağımsız ödeme toplamını hesaplar (toplam - eşleştirilmiş kısım) */
function sumIndependentByType(transactions: AnyTransaction[], type: string): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => {
      const total = t.amount_try || t.amount;
      const allocated = ('allocated_amount' in t && t.allocated_amount) || 0;
      if (allocated > 0) return sum + Math.max(0, total - allocated);
      if (t.linked_invoice_id) return sum; // Eski veri — tam bağlı
      return sum + total;
    }, 0);
}

// ==================== TYPES ====================

export interface ProjectFinancials {
  totalInvoiceOut: number;
  totalInvoiceIn: number;
  independentPaymentIn: number;
  independentPaymentOut: number;
  totalPaymentIn: number;
  totalPaymentOut: number;
  totalIncome: number;
  totalExpense: number;
  projectProfit: number;
  estimatedProfit: number | null;
  budgetUsed: number;
  ownershipType: OwnershipType;
  projectDebt: number;
  clientReceivable: number;
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
}

// ==================== PURE FUNCTIONS ====================

/**
 * Proje finansal hesaplamalarını yapar.
 * allocated_amount kullanarak kısmi bağımsız ödeme tutarlarını hesaplar.
 * ownershipType parametresi ile müşteri projesi ayrımı yapar.
 *
 * Gelir = Satış faturaları + Bağımsız tahsilatlar
 * Gider = Alış faturaları + Bağımsız ödemeler
 * Müşteri Alacağı = Satış faturaları - Eşleştirilmiş tahsilatlar
 * Proje Borcu = Alış faturaları - Eşleştirilmiş ödemeler
 */
export function calculateProjectFinancials(
  transactions: AnyTransaction[],
  ownershipType: OwnershipType = 'own',
  estimatedBudget?: number | null
): ProjectFinancials {
  const totalInvoiceOut = sumByType(transactions, 'invoice_out');
  const totalInvoiceIn = sumByType(transactions, 'invoice_in');
  const totalPaymentIn = sumByType(transactions, 'payment_in');
  const totalPaymentOut = sumByType(transactions, 'payment_out');

  const independentPaymentIn = sumIndependentByType(transactions, 'payment_in');
  const independentPaymentOut = sumIndependentByType(transactions, 'payment_out');

  const totalIncome = totalInvoiceOut + independentPaymentIn;
  const totalExpense = totalInvoiceIn + independentPaymentOut;
  const projectProfit = totalIncome - totalExpense;
  const estimatedProfit = estimatedBudget ? estimatedBudget - totalExpense : null;
  const budgetUsed = estimatedBudget ? (totalExpense / estimatedBudget) * 100 : 0;

  // Müşteri projesi: sadece eşleştirilmiş ödemeler borç/alacaktan düşer
  const allocatedPaymentIn = sumAllocatedByType(transactions, 'payment_in');
  const allocatedPaymentOut = sumAllocatedByType(transactions, 'payment_out');
  const clientReceivable = totalInvoiceOut - allocatedPaymentIn;
  const projectDebt = totalInvoiceIn - allocatedPaymentOut;

  return {
    totalInvoiceOut,
    totalInvoiceIn,
    independentPaymentIn,
    independentPaymentOut,
    totalPaymentIn,
    totalPaymentOut,
    totalIncome,
    totalExpense,
    projectProfit,
    estimatedProfit,
    budgetUsed,
    ownershipType,
    projectDebt: Math.max(0, projectDebt),
    clientReceivable: Math.max(0, clientReceivable),
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
 * İşlem toplamlarını hesaplar (tüm payment'lar dahil).
 * Transactions listesi, CompanyAccount ve PrintView'da kullanılır.
 *
 * totalIncome = Satış faturaları + Tahsilatlar (gelen para)
 * totalExpense = Alış faturaları + Ödemeler (çıkan para)
 * netProfit = Satış faturaları - Alış faturaları (fatura bazlı kâr/zarar)
 * netCashFlow = Tahsilatlar - Ödemeler (nakit akışı)
 * netBalance = totalIncome - totalExpense (genel net durum)
 */
export function calculateTransactionTotals(transactions: AnyTransaction[]): TransactionTotals {
  const totalInvoiceOut = sumByType(transactions, 'invoice_out');
  const totalPaymentIn = sumByType(transactions, 'payment_in');
  const totalInvoiceIn = sumByType(transactions, 'invoice_in');
  const totalPaymentOut = sumByType(transactions, 'payment_out');

  return {
    totalInvoiceOut,
    totalPaymentIn,
    totalInvoiceIn,
    totalPaymentOut,
    totalIncome: totalInvoiceOut + totalPaymentIn,
    totalExpense: totalInvoiceIn + totalPaymentOut,
    netProfit: totalInvoiceOut - totalInvoiceIn,
    netCashFlow: totalPaymentIn - totalPaymentOut,
    netBalance: (totalInvoiceOut + totalPaymentIn) - (totalInvoiceIn + totalPaymentOut),
  };
}

