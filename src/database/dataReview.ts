import type { Database as SqlJsDatabase } from 'sql.js';
import { z } from 'zod';
import { runInSavepoint } from './savepoint';
import { queryRows } from './sqlQuery';
import type * as review from './data-review/reviewTypes';
import { findAmountFixes, repairAmounts } from './data-review/amountFixes';
import { findDangling, repairDangling } from './data-review/dangling';
import { countOrphans, findOrphans, trashOrphans } from './data-review/orphans';
import { findRateIssues, fixRates } from './data-review/rateIssues';
import { findAllocationIssues } from './data-review/allocationIssues';
import { fixAllocationIssues } from './data-review/allocationFixes';
import { countOpenUnmatched, findUnmatchedPayments } from './data-review/unmatchedPayments';
import { settleUnmatchedPayments } from './data-review/unmatchedFixes';
import {
  convertLegacyFirmPayments,
  countLegacyFirmPayments,
  findLegacyFirmPayments,
} from './data-review/legacyFirmPayments';
import { baselineProjects, computeTotals, findProjectEffects } from './data-review/projectTotals';

export const REVIEW_COMPLETED_KEY = 'ledger_review_completed_at';
export const REVIEW_BASELINE_KEY = 'ledger_review_baseline';

export type AmountFix = review.AmountFix;
export type DanglingCounts = review.DanglingCounts;
export type OrphanTransaction = review.OrphanTransaction;
export type RateIssue = review.RateIssue;
export type AllocationIssueKind = review.AllocationIssueKind;
export type AllocationIssue = review.AllocationIssue;
export type UnmatchedPayment = review.UnmatchedPayment;
export type LegacyFirmPayment = review.LegacyFirmPayment;
export type ProjectFigures = review.ProjectFigures;
export type Totals = review.Totals;
export type ReviewBaseline = review.ReviewBaseline;
export type ProjectEffect = review.ProjectEffect;
export type UnmatchedChoice = review.UnmatchedChoice;
export type LegacyFirmChoice = review.LegacyFirmChoice;
export type ApplyResult = review.ApplyResult;

export interface DataReviewReport {
  completed: boolean;
  completedAt: string | null;
  amountFixes: AmountFix[];
  dangling: DanglingCounts;
  orphans: OrphanTransaction[];
  rateIssues: RateIssue[];
  allocationIssues: AllocationIssue[];
  unmatchedPayments: UnmatchedPayment[];
  legacyFirmPayments: LegacyFirmPayment[];
  baseline: ReviewBaseline | null;
  totalsNow: Totals;
  projectEffects: ProjectEffect[];
}

export interface ReviewStepResult {
  result: ApplyResult;
  report: DataReviewReport;
}

const projectFiguresSchema = z.object({
  income: z.number(),
  expense: z.number(),
  profit: z.number(),
});

const reviewBaselineSchema = z.object({
  recordedAt: z.string(),
  totals: z.object({
    income: z.number(),
    expense: z.number(),
    collected: z.number(),
    paid: z.number(),
  }),
  projects: z.record(
    z.string(),
    projectFiguresSchema.extend({ code: z.string(), name: z.string() })
  ),
});

function tableExists(db: SqlJsDatabase, name: string): boolean {
  return (
    queryRows(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [name])
      .length > 0
  );
}

export function getMeta(db: SqlJsDatabase, key: string): string | null {
  if (!tableExists(db, 'app_meta')) return null;
  return (
    queryRows<{ value: string }>(db, 'SELECT value FROM app_meta WHERE key = ?', [key])[0]?.value ??
    null
  );
}

export function setMeta(db: SqlJsDatabase, key: string, value: string): void {
  db.run(
    `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    [key, value]
  );
}

export function computeBaseline(db: SqlJsDatabase, now: Date = new Date()): ReviewBaseline {
  const projects = baselineProjects(db);
  return { recordedAt: now.toISOString(), totals: computeTotals(db), projects };
}

export function readBaseline(db: SqlJsDatabase): ReviewBaseline | null {
  const raw = getMeta(db, REVIEW_BASELINE_KEY);
  if (!raw) return null;
  try {
    const parsed = reviewBaselineSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function analyzeData(db: SqlJsDatabase): DataReviewReport {
  const completedAt = getMeta(db, REVIEW_COMPLETED_KEY);
  const baseline = readBaseline(db);
  return {
    completed: completedAt !== null,
    completedAt,
    amountFixes: findAmountFixes(db),
    dangling: findDangling(db),
    orphans: findOrphans(db),
    rateIssues: findRateIssues(db),
    allocationIssues: findAllocationIssues(db),
    unmatchedPayments: completedAt === null ? findUnmatchedPayments(db) : [],
    legacyFirmPayments: findLegacyFirmPayments(db),
    baseline,
    totalsNow: computeTotals(db),
    projectEffects: findProjectEffects(db, baseline),
  };
}

export function getReviewStatus(db: SqlJsDatabase): { completed: boolean; pending: number } {
  const completed = getMeta(db, REVIEW_COMPLETED_KEY) !== null;
  const dangling = Object.values(findDangling(db)).reduce((sum, n) => sum + n, 0);
  const unmatched = completed ? 0 : countOpenUnmatched(db);
  const pending =
    findAmountFixes(db).length +
    dangling +
    countOrphans(db) +
    findRateIssues(db).length +
    findAllocationIssues(db).length +
    unmatched +
    countLegacyFirmPayments(db);
  return { completed, pending };
}

export function applyRepairs(db: SqlJsDatabase, orphanIds: number[]): ApplyResult {
  return runInSavepoint(db, () => {
    const repaired = repairAmounts(db) + repairDangling(db);
    const trashed = trashOrphans(db, orphanIds);
    return { changed: repaired + trashed.changed, skipped: trashed.skipped };
  });
}

export function applyRates(db: SqlJsDatabase, rates: { id: number; rate: number }[]): ApplyResult {
  return runInSavepoint(db, () => fixRates(db, rates));
}

export function applyAllocationFixes(db: SqlJsDatabase, keys: string[]): ApplyResult {
  return runInSavepoint(db, () => fixAllocationIssues(db, keys));
}

export function applyUnmatched(
  db: SqlJsDatabase,
  choices: UnmatchedChoice[],
  firmChoices: LegacyFirmChoice[],
  note: string | null
): ApplyResult {
  return runInSavepoint(db, () => {
    const settled = settleUnmatchedPayments(db, choices, note);
    const converted = convertLegacyFirmPayments(db, firmChoices);
    return {
      changed: settled.changed + converted.changed,
      skipped: settled.skipped + converted.skipped,
    };
  });
}

export function ensureBaseline(db: SqlJsDatabase): boolean {
  if (getMeta(db, REVIEW_COMPLETED_KEY) || readBaseline(db)) return false;
  setMeta(db, REVIEW_BASELINE_KEY, JSON.stringify(computeBaseline(db)));
  return true;
}

export function completeReview(db: SqlJsDatabase, now: Date = new Date()): void {
  setMeta(db, REVIEW_COMPLETED_KEY, now.toISOString());
}
