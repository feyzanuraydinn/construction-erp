import type { Database as SqlJsDatabase } from 'sql.js';
import type { DashboardStats, DebtorCreditor, MonthlyStats, CategoryBreakdown } from '../../types';

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
        CAST(strftime('%m', date) AS INTEGER) as month,
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
      SELECT
        COALESCE(cat.name, 'Diğer') as category,
        cat.color as color,
        SUM(COALESCE(t.amount_try, t.amount)) as total,
        COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories cat ON cat.id = t.category_id
      WHERE t.project_id = ? AND t.type IN ('invoice_in', 'payment_out')
      GROUP BY t.category_id
      ORDER BY total DESC
    `, [projectId]);
  }

  getCompanyMonthlyStats(companyId: number, year: number): MonthlyStats[] {
    return this.query(`
      SELECT
        CAST(strftime('%m', date) AS INTEGER) as month,
        COALESCE(SUM(CASE WHEN type IN ('invoice_out', 'payment_in') THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as debit,
        COALESCE(SUM(CASE WHEN type IN ('invoice_in', 'payment_out') THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as credit
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

  /** Vadesi geçen alacaklar: invoice_out - payment_in bazında, 30/60/90+ gün ayrımlı */
  getAgingReceivables(): { companyId: number; companyName: string; current: number; days30: number; days60: number; days90plus: number; total: number }[] {
    const today = new Date().toISOString().split('T')[0];
    return this.query(`
      SELECT
        c.id as companyId,
        c.name as companyName,
        COALESCE(SUM(CASE WHEN julianday(?) - julianday(t.date) <= 30 AND t.type = 'invoice_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN julianday(?) - julianday(t.date) <= 30 AND t.type = 'payment_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as current,
        COALESCE(SUM(CASE WHEN julianday(?) - julianday(t.date) > 30 AND julianday(?) - julianday(t.date) <= 60 AND t.type = 'invoice_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN julianday(?) - julianday(t.date) > 30 AND julianday(?) - julianday(t.date) <= 60 AND t.type = 'payment_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as days30,
        COALESCE(SUM(CASE WHEN julianday(?) - julianday(t.date) > 60 AND julianday(?) - julianday(t.date) <= 90 AND t.type = 'invoice_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN julianday(?) - julianday(t.date) > 60 AND julianday(?) - julianday(t.date) <= 90 AND t.type = 'payment_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as days60,
        COALESCE(SUM(CASE WHEN julianday(?) - julianday(t.date) > 90 AND t.type = 'invoice_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN julianday(?) - julianday(t.date) > 90 AND t.type = 'payment_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as days90plus,
        COALESCE(SUM(CASE WHEN t.type = 'invoice_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.type = 'payment_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as total
      FROM companies c
      INNER JOIN transactions t ON t.company_id = c.id
      WHERE c.is_active = 1
      GROUP BY c.id
      HAVING total > 0
      ORDER BY total DESC
    `, [today, today, today, today, today, today, today, today, today, today, today, today]);
  }
}
