import type { Database as SqlJsDatabase } from 'sql.js';
import { MONEY_TOLERANCE, roundMoney } from '../../utils/money';
import {
  flowTotalsSql,
  sumOfTypeSql,
  tryAmountSql,
  allocationTotalsJoinSql,
} from '../sqlFragments';
import { queryRows } from '../sqlQuery';
import type { ProjectEffect, ProjectFigures, ReviewBaseline, Totals } from './reviewTypes';

interface ProjectTotalsRow {
  id: number;
  code: string;
  name: string;
  invoice_out: number;
  invoice_in: number;
  independent_in: number;
  independent_out: number;
}

export function computeTotals(db: SqlJsDatabase): Totals {
  const row = queryRows<Totals>(
    db,
    `
    SELECT
      ${flowTotalsSql()}
    FROM transactions
  `
  )[0];
  return {
    income: roundMoney(row?.income ?? 0),
    expense: roundMoney(row?.expense ?? 0),
    collected: roundMoney(row?.collected ?? 0),
    paid: roundMoney(row?.paid ?? 0),
  };
}

function loadProjectTotals(db: SqlJsDatabase): ProjectTotalsRow[] {
  const independent = (type: string) => `
    COALESCE(SUM(CASE WHEN t.type = '${type}' THEN
      CASE
        WHEN COALESCE(alloc.allocated, 0) > 0 THEN MAX(0, ${tryAmountSql('t')} - alloc.allocated)
        WHEN t.linked_invoice_id IS NOT NULL THEN 0
        ELSE ${tryAmountSql('t')}
      END
    ELSE 0 END), 0)`;
  return queryRows<ProjectTotalsRow>(
    db,
    `
    SELECT pr.id, pr.code, pr.name,
      ${sumOfTypeSql('invoice_out', 't')} as invoice_out,
      ${sumOfTypeSql('invoice_in', 't')} as invoice_in,
      ${independent('payment_in')} as independent_in,
      ${independent('payment_out')} as independent_out
    FROM projects pr
    LEFT JOIN transactions t ON t.project_id = pr.id
    ${allocationTotalsJoinSql('payment_id', 'alloc', 'allocated', 't')}
    WHERE pr.is_active = 1
    GROUP BY pr.id
    ORDER BY pr.code
  `
  );
}

function figures(income: number, expense: number): ProjectFigures {
  return {
    income: roundMoney(income),
    expense: roundMoney(expense),
    profit: roundMoney(income - expense),
  };
}

export function baselineProjects(db: SqlJsDatabase): ReviewBaseline['projects'] {
  const projects: ReviewBaseline['projects'] = {};
  for (const row of loadProjectTotals(db)) {
    projects[String(row.id)] = {
      code: row.code,
      name: row.name,
      ...figures(row.invoice_out + row.independent_in, row.invoice_in + row.independent_out),
    };
  }
  return projects;
}

export function findProjectEffects(
  db: SqlJsDatabase,
  baseline: ReviewBaseline | null
): ProjectEffect[] {
  return loadProjectTotals(db)
    .map((row) => {
      const before = baseline?.projects[String(row.id)] ?? null;
      return {
        projectId: row.id,
        code: row.code,
        name: row.name,
        before: before
          ? { income: before.income, expense: before.expense, profit: before.profit }
          : null,
        now: figures(row.invoice_out, row.invoice_in),
      };
    })
    .filter(
      (effect) =>
        !effect.before ||
        Math.abs(effect.before.income - effect.now.income) > MONEY_TOLERANCE ||
        Math.abs(effect.before.expense - effect.now.expense) > MONEY_TOLERANCE
    );
}
