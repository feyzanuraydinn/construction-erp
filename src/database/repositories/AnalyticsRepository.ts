import type {
  DashboardStats,
  DebtorCreditor,
  MonthlyStats,
  CategoryBreakdown,
  AgingReceivable,
} from '../../types';
import { toLocalDateString } from '../../utils/dates';
import { MONEY_TOLERANCE, roundMoney } from '../../utils/money';
import {
  flowTotalsSql,
  netBalanceSql,
  sumOfTypeSql,
  tryAmountSql,
  allocationTotalsJoinSql,
} from '../sqlFragments';
import { SqlRepository } from './SqlRepository';
import { UNCATEGORIZED } from '../../utils/categories';

function daysBetween(from: string, to: string): number {
  const toUtc = (date: string) => {
    const [year, month, day] = date.slice(0, 10).split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

export class AnalyticsRepository extends SqlRepository {
  getDashboardStats(): DashboardStats {
    const balances = this.queryOne<{ receivables: number; payables: number }>(`
      SELECT
        COALESCE(SUM(CASE WHEN balance > ${MONEY_TOLERANCE} THEN balance ELSE 0 END), 0) as receivables,
        COALESCE(SUM(CASE WHEN balance < -${MONEY_TOLERANCE} THEN -balance ELSE 0 END), 0) as payables
      FROM (
        SELECT ${netBalanceSql('t')} as balance
        FROM transactions t WHERE t.company_id IS NOT NULL GROUP BY t.company_id
      )
    `);

    return {
      totalReceivables: balances?.receivables || 0,
      totalPayables: balances?.payables || 0,
    };
  }

  getTopDebtors(limit = 5): DebtorCreditor[] {
    return this.rankByBalance('', limit);
  }

  getTopCreditors(limit = 5): DebtorCreditor[] {
    return this.rankByBalance('-', limit);
  }

  private rankByBalance(sign: '' | '-', limit: number): DebtorCreditor[] {
    return this.query(
      `
      SELECT c.id, c.name, c.account_type,
        ${sign}(${netBalanceSql('t')}) as balance
      FROM companies c
      INNER JOIN transactions t ON t.company_id = c.id
      WHERE c.is_active = 1
      GROUP BY c.id
      HAVING balance > ${MONEY_TOLERANCE}
      ORDER BY balance DESC
      LIMIT ?
    `,
      [limit]
    );
  }

  getMonthlyStats(year: number): MonthlyStats[] {
    return this.monthlyStats(year);
  }

  getProjectCategoryBreakdown(projectId: number): CategoryBreakdown[] {
    return this.query(
      `
      SELECT COALESCE(cat.name, '${UNCATEGORIZED}') as category, cat.color as color,
        SUM(${tryAmountSql('t')}) as total, COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories cat ON cat.id = t.category_id
      WHERE t.project_id = ? AND t.type = 'invoice_in'
      GROUP BY t.category_id
      ORDER BY total DESC
    `,
      [projectId]
    );
  }

  getCompanyMonthlyStats(companyId: number, year: number): MonthlyStats[] {
    return this.monthlyStats(year, companyId);
  }

  private monthlyStats(year: number, companyId?: number): MonthlyStats[] {
    const forCompany = companyId !== undefined;
    return this.query(
      `
      SELECT
        strftime('%m', date) as month,
        ${flowTotalsSql()}
      FROM transactions
      WHERE ${forCompany ? 'company_id = ? AND ' : ''}strftime('%Y', date) = ?
      GROUP BY month
      ORDER BY month
    `,
      forCompany ? [companyId, String(year)] : [String(year)]
    );
  }

  getCashFlowReport(
    year: number
  ): { month: number; collected: number; paid: number; netCash: number; cumulative: number }[] {
    const monthly = this.query<{ month: number; collected: number; paid: number }>(
      `
      SELECT
        CAST(strftime('%m', date) AS INTEGER) as month,
        ${sumOfTypeSql('payment_in')} as collected,
        ${sumOfTypeSql('payment_out')} as paid
      FROM transactions
      WHERE strftime('%Y', date) = ?
      GROUP BY month
      ORDER BY month
    `,
      [String(year)]
    );

    let cumulative = 0;
    return Array.from({ length: 12 }, (_, i) => {
      const found = monthly.find((m) => m.month === i + 1);
      const collected = found?.collected || 0;
      const paid = found?.paid || 0;
      const netCash = collected - paid;
      cumulative += netCash;
      return { month: i + 1, collected, paid, netCash, cumulative };
    });
  }

  getAgingReceivables(today: string = toLocalDateString()): AgingReceivable[] {
    const invoices = this.query<{
      companyId: number;
      companyName: string;
      date: string;
      amount: number;
      allocated: number;
    }>(`
      SELECT t.company_id as companyId, c.name as companyName, t.date,
        ${tryAmountSql('t')} as amount,
        COALESCE(alloc.allocated, 0) as allocated
      FROM transactions t
      INNER JOIN companies c ON c.id = t.company_id
      ${allocationTotalsJoinSql('invoice_id', 'alloc', 'allocated', 't')}
      WHERE c.is_active = 1 AND t.type = 'invoice_out'
      ORDER BY t.company_id, t.date, t.id
    `);

    const credits = this.query<{ companyId: number; unallocated: number }>(`
      SELECT t.company_id as companyId,
        SUM(MAX(0, ${tryAmountSql('t')} - COALESCE(alloc.allocated, 0))) as unallocated
      FROM transactions t
      ${allocationTotalsJoinSql('payment_id', 'alloc', 'allocated', 't')}
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
      if (open < MONEY_TOLERANCE) continue;

      let row = rows.get(invoice.companyId);
      if (!row) {
        row = {
          companyId: invoice.companyId,
          companyName: invoice.companyName,
          current: 0,
          days30: 0,
          days60: 0,
          days90plus: 0,
          total: 0,
        };
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
