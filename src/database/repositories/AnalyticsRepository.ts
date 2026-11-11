import type { Database as SqlJsDatabase } from 'sql.js';
import type { DashboardStats, DebtorCreditor, MonthlyStats, CategoryBreakdown, AgingReceivable } from '../../types';
import { localDateStamp } from '../fileUtils';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function daysBetween(from: string, to: string): number {
  const toUtc = (date: string) => {
    const [year, month, day] = date.slice(0, 10).split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

export class AnalyticsRepository {
  constructor(private db: SqlJsDatabase) {}

  private query<R>(sql: string, params?: unknown[]): R[] {
    const stmt = this.db.prepare(sql);
    if (params) stmt.bind(params);
    const results: R[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as R);
    }
    stmt.free();
    return results;
  }

  private queryOne<R>(sql: string, params?: unknown[]): R | undefined {
    const results = this.query<R>(sql, params);
    return results[0];
  }

  getDashboardStats(): DashboardStats {
    // Combined transaction totals in a single query (replaces 4 separate queries)
    const txTotals = this.queryOne<{
      income: number; expense: number; collected: number; paid: number;
    }>(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'invoice_out' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'invoice_in' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as expense,
        COALESCE(SUM(CASE WHEN type = 'payment_in' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as collected,
        COALESCE(SUM(CASE WHEN type = 'payment_out' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as paid
      FROM transactions
    `);

    // Combined counts in a single query (replaces 3 separate queries)
    const counts = this.queryOne<{
      activeProjects: number; totalCompanies: number; lowStockCount: number;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM projects WHERE is_active = 1 AND status = 'active') as activeProjects,
        (SELECT COUNT(*) FROM companies WHERE is_active = 1) as totalCompanies,
        (SELECT COUNT(*) FROM materials WHERE is_active = 1 AND current_stock <= min_stock AND min_stock > 0) as lowStockCount
    `);

    // Receivables & payables in a single query (replaces 2 separate queries)
    const balances = this.queryOne<{ receivables: number; payables: number }>(`
      SELECT
        COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) as receivables,
        COALESCE(SUM(CASE WHEN debt > 0 THEN debt ELSE 0 END), 0) as payables
      FROM (
        SELECT
          (COALESCE(SUM(CASE WHEN t.type = 'invoice_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN t.type = 'payment_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0)) as balance,
          (COALESCE(SUM(CASE WHEN t.type = 'invoice_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN t.type = 'payment_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0)) as debt
        FROM transactions t WHERE t.company_id IS NOT NULL GROUP BY t.company_id
      )
    `);

    const totalIncome = txTotals?.income || 0;
    const totalExpense = txTotals?.expense || 0;
    const totalCollected = txTotals?.collected || 0;
    const totalPaid = txTotals?.paid || 0;

    return {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      totalCollected,
      totalPaid,
      netCash: totalCollected - totalPaid,
      activeProjects: counts?.activeProjects || 0,
      totalCompanies: counts?.totalCompanies || 0,
      totalReceivables: balances?.receivables || 0,
      totalPayables: balances?.payables || 0,
      lowStockCount: counts?.lowStockCount || 0,
    };
  }

  getTopDebtors(limit = 5, startDate?: string): DebtorCreditor[] {
    const dateFilter = startDate ? ` AND t.date >= ?` : '';
    const params: unknown[] = startDate ? [startDate, limit] : [limit];
    return this.query(`
      SELECT c.id, c.name, c.account_type,
        COALESCE(SUM(CASE WHEN t.type = 'invoice_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.type = 'payment_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as balance
      FROM companies c
      INNER JOIN transactions t ON t.company_id = c.id
      WHERE c.is_active = 1${dateFilter}
      GROUP BY c.id
      HAVING balance > 0
      ORDER BY balance DESC
      LIMIT ?
    `, params);
  }

  getTopCreditors(limit = 5, startDate?: string): DebtorCreditor[] {
    const dateFilter = startDate ? ` AND t.date >= ?` : '';
    const params: unknown[] = startDate ? [startDate, limit] : [limit];
    return this.query(`
      SELECT c.id, c.name, c.account_type,
        COALESCE(SUM(CASE WHEN t.type = 'invoice_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.type = 'payment_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as balance
      FROM companies c
      INNER JOIN transactions t ON t.company_id = c.id
      WHERE c.is_active = 1${dateFilter}
      GROUP BY c.id
      HAVING balance > 0
      ORDER BY balance DESC
      LIMIT ?
    `, params);
  }

  getMonthlyStats(year: number): MonthlyStats[] {
    return this.query(`
      SELECT
        strftime('%m', date) as month,
        COALESCE(SUM(CASE WHEN type = 'invoice_out' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'invoice_in' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as expense,
        COALESCE(SUM(CASE WHEN type = 'payment_in' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as collected,
        COALESCE(SUM(CASE WHEN type = 'payment_out' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as paid
      FROM transactions
      WHERE strftime('%Y', date) = ?
      GROUP BY month
      ORDER BY month
    `, [String(year)]);
  }

  getProjectCategoryBreakdown(projectId: number): CategoryBreakdown[] {
    return this.query(`
      SELECT COALESCE(cat.name, 'Diğer') as category, cat.color as color,
        SUM(COALESCE(t.amount_try, t.amount)) as total, COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories cat ON cat.id = t.category_id
      WHERE t.project_id = ? AND t.type = 'invoice_in'
      GROUP BY t.category_id
      ORDER BY total DESC
    `, [projectId]);
  }

  getCompanyMonthlyStats(companyId: number, year: number): MonthlyStats[] {
    return this.query(`
      SELECT
        strftime('%m', date) as month,
        COALESCE(SUM(CASE WHEN type = 'invoice_out' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'invoice_in' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as expense,
        COALESCE(SUM(CASE WHEN type = 'payment_in' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as collected,
        COALESCE(SUM(CASE WHEN type = 'payment_out' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as paid
      FROM transactions
      WHERE company_id = ? AND strftime('%Y', date) = ?
      GROUP BY month
      ORDER BY month
    `, [companyId, String(year)]);
  }

  /** Nakit akışı raporu: aylık tahsilat/ödeme ve kümülatif bakiye */
  getCashFlowReport(year: number): { month: number; collected: number; paid: number; netCash: number; cumulative: number }[] {
    const monthly = this.query<{ month: number; collected: number; paid: number }>(`
      SELECT
        CAST(strftime('%m', date) AS INTEGER) as month,
        COALESCE(SUM(CASE WHEN type = 'payment_in' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as collected,
        COALESCE(SUM(CASE WHEN type = 'payment_out' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as paid
      FROM transactions
      WHERE strftime('%Y', date) = ?
      GROUP BY month
      ORDER BY month
    `, [String(year)]);

    let cumulative = 0;
    return Array.from({ length: 12 }, (_, i) => {
      const found = monthly.find(m => m.month === i + 1);
      const collected = found?.collected || 0;
      const paid = found?.paid || 0;
      const netCash = collected - paid;
      cumulative += netCash;
      return { month: i + 1, collected, paid, netCash, cumulative };
    });
  }

  getAgingReceivables(today: string = localDateStamp()): AgingReceivable[] {
    const invoices = this.query<{ companyId: number; companyName: string; date: string; amount: number; allocated: number }>(`
      SELECT t.company_id as companyId, c.name as companyName, t.date,
        COALESCE(t.amount_try, t.amount) as amount,
        COALESCE(alloc.allocated, 0) as allocated
      FROM transactions t
      INNER JOIN companies c ON c.id = t.company_id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) as allocated FROM payment_allocations GROUP BY invoice_id
      ) alloc ON alloc.invoice_id = t.id
      WHERE c.is_active = 1 AND t.type = 'invoice_out'
      ORDER BY t.company_id, t.date, t.id
    `);

    const credits = this.query<{ companyId: number; unallocated: number }>(`
      SELECT t.company_id as companyId,
        SUM(MAX(0, COALESCE(t.amount_try, t.amount) - COALESCE(alloc.allocated, 0))) as unallocated
      FROM transactions t
      LEFT JOIN (
        SELECT payment_id, SUM(amount) as allocated FROM payment_allocations GROUP BY payment_id
      ) alloc ON alloc.payment_id = t.id
      WHERE t.type = 'payment_in' AND t.company_id IS NOT NULL
      GROUP BY t.company_id
    `);
    const creditLeft = new Map(credits.map((c) => [c.companyId, c.unallocated]));

    const rows = new Map<number, AgingReceivable>();
    for (const invoice of invoices) {
      let open = Math.max(0, invoice.amount - invoice.allocated);
      const credit = creditLeft.get(invoice.companyId) ?? 0;
      const settled = Math.min(open, credit);
      open -= settled;
      creditLeft.set(invoice.companyId, credit - settled);
      if (open < 0.005) continue;

      let row = rows.get(invoice.companyId);
      if (!row) {
        row = { companyId: invoice.companyId, companyName: invoice.companyName, current: 0, days30: 0, days60: 0, days90plus: 0, total: 0 };
        rows.set(invoice.companyId, row);
      }
      const age = daysBetween(invoice.date, today);
      if (age <= 30) row.current += open;
      else if (age <= 60) row.days30 += open;
      else if (age <= 90) row.days60 += open;
      else row.days90plus += open;
      row.total += open;
    }

    return [...rows.values()]
      .map((row) => ({
        ...row,
        current: roundMoney(row.current),
        days30: roundMoney(row.days30),
        days60: roundMoney(row.days60),
        days90plus: roundMoney(row.days90plus),
        total: roundMoney(row.total),
      }))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);
  }
}
