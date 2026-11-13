export type BudgetLevel = 'ok' | 'warning' | 'over';

const BUDGET_WARNING_PERCENT = 80;
const BUDGET_OVER_PERCENT = 100;

export function budgetUsedPercent(expense: number, budget: number | null | undefined): number {
  return budget ? (expense / budget) * 100 : 0;
}

export function budgetLevel(percent: number): BudgetLevel {
  if (percent > BUDGET_OVER_PERCENT) return 'over';
  if (percent > BUDGET_WARNING_PERCENT) return 'warning';
  return 'ok';
}
