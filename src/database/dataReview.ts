import type { Database as SqlJsDatabase } from 'sql.js';
import type { Currency, TransactionScope, TransactionType } from '../types';
import { runInSavepoint } from './savepoint';
import { collectTransactionBundle, moveToTrash } from './repositories/trashBundle';
import { TransactionRepository } from './repositories/TransactionRepository';
import {
  PaymentAllocationRepository,
  MONEY_TOLERANCE,
  invoiceTypeFor,
  sameMatchPool,
} from './repositories/PaymentAllocationRepository';

export const REVIEW_COMPLETED_KEY = 'ledger_review_completed_at';
export const REVIEW_BASELINE_KEY = 'ledger_review_baseline';

export interface AmountFix {
  id: number;
  type: TransactionType;
  description: string;
  date: string;
  currency: Currency;
  amount: number;
  exchangeRate: number | null;
  storedTry: number | null;
  correctTry: number;
}

export interface DanglingCounts {
  categories: number;
  linkedInvoices: number;
  clientCompanies: number;
  stockLinks: number;
  allocations: number;
  parties: number;
  projectTags: number;
}

export interface OrphanTransaction {
  id: number;
  type: TransactionType;
  scope: TransactionScope;
  description: string;
  date: string;
  currency: Currency;
  amount: number;
  amountTry: number;
  missing: 'company' | 'project';
  missingId: number;
}

export interface RateIssue {
  id: number;
  type: TransactionType;
  description: string;
  date: string;
  currency: Currency;
  amount: number;
  exchangeRate: number | null;
  companyName: string | null;
  projectName: string | null;
}

export type AllocationIssueKind = 'type_mismatch' | 'counterparty' | 'assign_company' | 'payment_over' | 'invoice_over';

export interface AllocationIssue {
  key: string;
  kind: AllocationIssueKind;
  paymentId: number;
  paymentDescription: string;
  paymentDate: string;
  paymentTry: number;
  invoiceId: number | null;
  invoiceDescription: string | null;
  invoiceTry: number | null;
  companyId: number | null;
  companyName: string | null;
  changes: { allocationId: number; invoiceDescription: string; from: number; to: number }[];
}

export interface UnmatchedPayment {
  id: number;
  type: 'payment_in' | 'payment_out';
  scope: TransactionScope;
  description: string;
  date: string;
  currency: Currency;
  amount: number;
  amountTry: number;
  unmatched: number;
  companyId: number | null;
  companyName: string | null;
  companyType: string | null;
  projectId: number | null;
  projectName: string | null;
  matchable: number;
  rest: number;
  countedByOldProjectPage: boolean;
  advanceAllowed: boolean;
  suggestedCategoryId: number | null;
}

export interface LegacyFirmPayment {
  id: number;
  type: 'payment_in' | 'payment_out';
  description: string;
  date: string;
  amount: number;
  amountTry: number;
  becomes: 'invoice_out' | 'invoice_in';
  suggestedCategoryId: number | null;
}

export interface ProjectFigures {
  income: number;
  expense: number;
  profit: number;
}

export interface Totals {
  income: number;
  expense: number;
  collected: number;
  paid: number;
}

export interface ReviewBaseline {
  recordedAt: string;
  totals: Totals;
  projects: Record<string, ProjectFigures & { code: string; name: string }>;
}

export interface ProjectEffect {
  projectId: number;
  code: string;
  name: string;
  before: ProjectFigures | null;
  now: ProjectFigures;
}

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

export interface UnmatchedChoice {
  id: number;
  match: boolean;
  rest: 'document' | 'advance';
  categoryId: number | null;
}

export interface LegacyFirmChoice {
  id: number;
  categoryId: number;
}

export interface ApplyResult {
  changed: number;
  skipped: number;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function rows<T>(db: SqlJsDatabase, sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  try {
    if (params.length > 0) stmt.bind(params);
    const result: T[] = [];
    while (stmt.step()) result.push(stmt.getAsObject() as T);
    return result;
  } finally {
    stmt.free();
  }
}

function count(db: SqlJsDatabase, sql: string): number {
  return rows<{ n: number }>(db, sql)[0]?.n ?? 0;
}

function tableExists(db: SqlJsDatabase, name: string): boolean {
  return rows(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [name]).length > 0;
}

export function getMeta(db: SqlJsDatabase, key: string): string | null {
  if (!tableExists(db, 'app_meta')) return null;
  return rows<{ value: string }>(db, 'SELECT value FROM app_meta WHERE key = ?', [key])[0]?.value ?? null;
}

export function setMeta(db: SqlJsDatabase, key: string, value: string): void {
  db.run(
    `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    [key, value]
  );
}

const TRY_EXPR = 'COALESCE(t.amount_try, t.amount)';

const MISSING_COMPANY = 't.company_id IS NOT NULL AND t.company_id NOT IN (SELECT id FROM companies)';
const MISSING_OWN_PROJECT =
  "t.scope = 'project' AND t.project_id IS NOT NULL AND t.project_id NOT IN (SELECT id FROM projects)";
const ORPHAN_CONDITION = `(${MISSING_COMPANY}) OR (${MISSING_OWN_PROJECT})`;

function defaultCategoryId(db: SqlJsDatabase, type: 'invoice_out' | 'invoice_in'): number | null {
  const preferred = type === 'invoice_in' ? 'Diğer Gider' : 'Diğer Gelir';
  const named = rows<{ id: number }>(db, 'SELECT id FROM categories WHERE type = ? AND name = ? LIMIT 1', [type, preferred]);
  if (named[0]) return named[0].id;
  return rows<{ id: number }>(db, 'SELECT id FROM categories WHERE type = ? ORDER BY id LIMIT 1', [type])[0]?.id ?? null;
}

function findAmountFixes(db: SqlJsDatabase): AmountFix[] {
  const found = rows<{
    id: number; type: TransactionType; description: string; date: string; currency: Currency | null;
    amount: number; exchange_rate: number | null; amount_try: number | null;
  }>(db, `
    SELECT t.id, t.type, t.description, t.date, t.currency, t.amount, t.exchange_rate, t.amount_try
    FROM transactions t
    WHERE NOT (${ORPHAN_CONDITION}) AND (
      ((t.currency IS NULL OR t.currency = 'TRY')
        AND (t.amount_try IS NULL OR ABS(t.amount_try - t.amount) > ${MONEY_TOLERANCE}))
      OR (t.currency IN ('USD', 'EUR') AND t.exchange_rate > 1
        AND (t.amount_try IS NULL OR ABS(t.amount_try - ROUND(t.amount * t.exchange_rate, 2)) > 0.01))
    )
    ORDER BY t.date, t.id
  `);
  return found.map((row) => {
    const currency: Currency = row.currency ?? 'TRY';
    const correctTry = currency === 'TRY' ? roundMoney(row.amount) : roundMoney(row.amount * (row.exchange_rate ?? 0));
    return {
      id: row.id,
      type: row.type,
      description: row.description,
      date: row.date,
      currency,
      amount: row.amount,
      exchangeRate: row.exchange_rate,
      storedTry: row.amount_try,
      correctTry,
    };
  });
}

function findDangling(db: SqlJsDatabase): DanglingCounts {
  return {
    categories: count(db, `SELECT COUNT(*) as n FROM transactions
      WHERE category_id IS NOT NULL AND category_id NOT IN (SELECT id FROM categories)`),
    linkedInvoices: count(db, `SELECT COUNT(*) as n FROM transactions
      WHERE linked_invoice_id IS NOT NULL AND linked_invoice_id NOT IN (SELECT id FROM transactions)`),
    clientCompanies: count(db, `SELECT COUNT(*) as n FROM projects
      WHERE client_company_id IS NOT NULL AND client_company_id NOT IN (SELECT id FROM companies)`),
    stockLinks: count(db, `SELECT COUNT(*) as n FROM stock_movements
      WHERE (project_id IS NOT NULL AND project_id NOT IN (SELECT id FROM projects))
         OR (company_id IS NOT NULL AND company_id NOT IN (SELECT id FROM companies))`),
    allocations: count(db, `SELECT COUNT(*) as n FROM payment_allocations
      WHERE payment_id NOT IN (SELECT id FROM transactions) OR invoice_id NOT IN (SELECT id FROM transactions)`),
    parties: count(db, `SELECT COUNT(*) as n FROM project_parties
      WHERE project_id NOT IN (SELECT id FROM projects) OR company_id NOT IN (SELECT id FROM companies)`),
    projectTags: count(db, `SELECT COUNT(*) as n FROM transactions t
      WHERE t.scope != 'project' AND t.project_id IS NOT NULL AND t.project_id NOT IN (SELECT id FROM projects)
        AND NOT (${MISSING_COMPANY})`),
  };
}

function findOrphans(db: SqlJsDatabase): OrphanTransaction[] {
  const found = rows<{
    id: number; type: TransactionType; scope: TransactionScope; description: string; date: string;
    currency: Currency | null; amount: number; amount_try: number; company_missing: number;
    company_id: number | null; project_id: number | null;
  }>(db, `
    SELECT t.id, t.type, t.scope, t.description, t.date, t.currency, t.amount,
      ${TRY_EXPR} as amount_try, t.company_id, t.project_id,
      CASE WHEN ${MISSING_COMPANY} THEN 1 ELSE 0 END as company_missing
    FROM transactions t
    WHERE ${ORPHAN_CONDITION}
    ORDER BY t.date, t.id
  `);
  return found.map((row) => ({
    id: row.id,
    type: row.type,
    scope: row.scope,
    description: row.description,
    date: row.date,
    currency: row.currency ?? 'TRY',
    amount: row.amount,
    amountTry: row.amount_try,
    missing: row.company_missing ? 'company' : 'project',
    missingId: Number(row.company_missing ? row.company_id : row.project_id),
  }));
}

function findRateIssues(db: SqlJsDatabase): RateIssue[] {
  const found = rows<{
    id: number; type: TransactionType; description: string; date: string; currency: Currency;
    amount: number; exchange_rate: number | null; company_name: string | null; project_name: string | null;
  }>(db, `
    SELECT t.id, t.type, t.description, t.date, t.currency, t.amount, t.exchange_rate,
      c.name as company_name, p.name as project_name
    FROM transactions t
    LEFT JOIN companies c ON c.id = t.company_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.currency IN ('USD', 'EUR') AND (t.exchange_rate IS NULL OR t.exchange_rate <= 1)
      AND NOT (${ORPHAN_CONDITION})
    ORDER BY t.date, t.id
  `);
  return found.map((row) => ({
    id: row.id,
    type: row.type,
    description: row.description,
    date: row.date,
    currency: row.currency,
    amount: row.amount,
    exchangeRate: row.exchange_rate,
    companyName: row.company_name,
    projectName: row.project_name,
  }));
}

interface AllocationRow {
  allocation_id: number;
  amount: number;
  payment_id: number;
  payment_type: TransactionType;
  payment_company_id: number | null;
  payment_project_id: number | null;
  payment_description: string;
  payment_date: string;
  payment_try: number;
  invoice_id: number;
  invoice_type: TransactionType;
  invoice_company_id: number | null;
  invoice_project_id: number | null;
  invoice_description: string;
  invoice_date: string;
  invoice_try: number;
  invoice_company_name: string | null;
}

function loadAllocations(db: SqlJsDatabase): AllocationRow[] {
  return rows<AllocationRow>(db, `
    SELECT pa.id as allocation_id, pa.amount,
      p.id as payment_id, p.type as payment_type, p.company_id as payment_company_id,
      p.project_id as payment_project_id, p.description as payment_description, p.date as payment_date,
      COALESCE(p.amount_try, p.amount) as payment_try,
      i.id as invoice_id, i.type as invoice_type, i.company_id as invoice_company_id,
      i.project_id as invoice_project_id, i.description as invoice_description, i.date as invoice_date,
      COALESCE(i.amount_try, i.amount) as invoice_try,
      ic.name as invoice_company_name
    FROM payment_allocations pa
    JOIN transactions p ON p.id = pa.payment_id
    JOIN transactions i ON i.id = pa.invoice_id
    LEFT JOIN companies ic ON ic.id = i.company_id
    ORDER BY pa.id
  `);
}

function issueBase(row: AllocationRow): Omit<AllocationIssue, 'key' | 'kind' | 'changes'> {
  return {
    paymentId: row.payment_id,
    paymentDescription: row.payment_description,
    paymentDate: row.payment_date,
    paymentTry: row.payment_try,
    invoiceId: row.invoice_id,
    invoiceDescription: row.invoice_description,
    invoiceTry: row.invoice_try,
    companyId: null,
    companyName: null,
  };
}

function trimToFit(
  allocations: AllocationRow[],
  limit: number,
  dateOf: (row: AllocationRow) => string
): { allocationId: number; invoiceDescription: string; from: number; to: number }[] {
  let excess = roundMoney(allocations.reduce((sum, a) => sum + a.amount, 0) - limit);
  const changes: { allocationId: number; invoiceDescription: string; from: number; to: number }[] = [];
  const newestFirst = [...allocations].sort((a, b) =>
    dateOf(b).localeCompare(dateOf(a)) || b.allocation_id - a.allocation_id
  );
  for (const allocation of newestFirst) {
    if (excess <= MONEY_TOLERANCE) break;
    const cut = Math.min(allocation.amount, excess);
    changes.push({
      allocationId: allocation.allocation_id,
      invoiceDescription: allocation.invoice_description,
      from: allocation.amount,
      to: roundMoney(allocation.amount - cut),
    });
    excess = roundMoney(excess - cut);
  }
  return changes;
}

function isValidPair(row: AllocationRow): boolean {
  return invoiceTypeFor(row.payment_type) === row.invoice_type;
}

function samePool(row: AllocationRow): boolean {
  return sameMatchPool(
    { company_id: row.payment_company_id, project_id: row.payment_project_id },
    { company_id: row.invoice_company_id, project_id: row.invoice_project_id }
  );
}

function findAllocationIssues(db: SqlJsDatabase): AllocationIssue[] {
  const all = loadAllocations(db);
  const issues: AllocationIssue[] = [];

  for (const row of all.filter((a) => !isValidPair(a))) {
    issues.push({
      ...issueBase(row),
      key: `type_mismatch:${row.allocation_id}`,
      kind: 'type_mismatch',
      changes: [{ allocationId: row.allocation_id, invoiceDescription: row.invoice_description, from: row.amount, to: 0 }],
    });
  }
  const valid = all.filter(isValidPair);

  const byPayment = new Map<number, AllocationRow[]>();
  for (const row of valid) byPayment.set(row.payment_id, [...(byPayment.get(row.payment_id) ?? []), row]);
  for (const [paymentId, list] of byPayment) {
    const mismatched = list.filter((a) => !samePool(a));
    if (mismatched.length === 0) continue;
    const companies = new Set(list.map((a) => a.invoice_company_id));
    const first = list[0];
    if (first.payment_company_id === null && companies.size === 1 && first.invoice_company_id !== null) {
      issues.push({
        ...issueBase(first),
        key: `assign_company:${paymentId}`,
        kind: 'assign_company',
        invoiceId: null,
        invoiceDescription: null,
        invoiceTry: null,
        companyId: first.invoice_company_id,
        companyName: first.invoice_company_name,
        changes: [],
      });
      continue;
    }
    for (const row of mismatched) {
      issues.push({
        ...issueBase(row),
        key: `counterparty:${row.allocation_id}`,
        kind: 'counterparty',
        changes: [{ allocationId: row.allocation_id, invoiceDescription: row.invoice_description, from: row.amount, to: 0 }],
      });
    }
  }

  for (const [paymentId, list] of byPayment) {
    const total = list.reduce((sum, a) => sum + a.amount, 0);
    const first = list[0];
    if (total <= first.payment_try + MONEY_TOLERANCE) continue;
    issues.push({
      ...issueBase(first),
      key: `payment_over:${paymentId}`,
      kind: 'payment_over',
      invoiceId: null,
      invoiceDescription: null,
      invoiceTry: null,
      changes: trimToFit(list, first.payment_try, (a) => a.invoice_date),
    });
  }

  const byInvoice = new Map<number, AllocationRow[]>();
  for (const row of valid) byInvoice.set(row.invoice_id, [...(byInvoice.get(row.invoice_id) ?? []), row]);
  for (const [invoiceId, list] of byInvoice) {
    const total = list.reduce((sum, a) => sum + a.amount, 0);
    const first = list[0];
    if (total <= first.invoice_try + MONEY_TOLERANCE) continue;
    issues.push({
      ...issueBase(first),
      key: `invoice_over:${invoiceId}`,
      kind: 'invoice_over',
      changes: trimToFit(list, first.invoice_try, (a) => a.payment_date),
    });
  }
  return issues;
}

interface PaymentRow {
  id: number;
  type: 'payment_in' | 'payment_out';
  scope: TransactionScope;
  description: string;
  date: string;
  currency: Currency | null;
  amount: number;
  amount_try: number;
  allocated: number;
  linked_invoice_id: number | null;
  company_id: number | null;
  company_name: string | null;
  company_type: string | null;
  project_id: number | null;
  project_name: string | null;
}

function loadUnmatchedPayments(db: SqlJsDatabase): PaymentRow[] {
  return rows<PaymentRow>(db, `
    SELECT t.id, t.type, t.scope, t.description, t.date, t.currency, t.amount,
      ${TRY_EXPR} as amount_try,
      COALESCE((SELECT SUM(amount) FROM payment_allocations WHERE payment_id = t.id), 0) as allocated,
      t.linked_invoice_id, t.company_id, c.name as company_name, c.type as company_type,
      t.project_id, p.name as project_name
    FROM transactions t
    LEFT JOIN companies c ON c.id = t.company_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.type IN ('payment_in', 'payment_out') AND t.scope != 'company'
      AND NOT (${ORPHAN_CONDITION})
      AND ${TRY_EXPR} - COALESCE((SELECT SUM(amount) FROM payment_allocations WHERE payment_id = t.id), 0) > ${MONEY_TOLERANCE}
    ORDER BY CASE WHEN t.project_id IS NULL THEN 1 ELSE 0 END, t.date, t.id
  `);
}

function reviewCandidates(
  allocations: PaymentAllocationRepository,
  type: string,
  pool: { companyId: number | null; projectId: number | null },
  paymentId: number
) {
  const candidates = allocations.getInvoiceCandidates(type, pool, paymentId);
  return pool.projectId === null ? candidates : candidates.filter((c) => c.project_id === pool.projectId);
}

function findUnmatchedPayments(db: SqlJsDatabase): UnmatchedPayment[] {
  const allocations = new PaymentAllocationRepository(db);
  const taken = new Map<number, number>();
  const categories = {
    invoice_in: defaultCategoryId(db, 'invoice_in'),
    invoice_out: defaultCategoryId(db, 'invoice_out'),
  };
  const result: UnmatchedPayment[] = [];

  for (const payment of loadUnmatchedPayments(db)) {
    const unmatched = roundMoney(payment.amount_try - payment.allocated);
    const pool = { companyId: payment.company_id, projectId: payment.project_id };
    let matchable = 0;
    for (const invoice of reviewCandidates(allocations, payment.type, pool, payment.id)) {
      if (matchable >= unmatched - MONEY_TOLERANCE) break;
      const free = invoice.remaining - invoice.allocated_here - (taken.get(invoice.id) ?? 0);
      if (free <= MONEY_TOLERANCE) continue;
      const share = roundMoney(Math.min(free, unmatched - matchable));
      taken.set(invoice.id, (taken.get(invoice.id) ?? 0) + share);
      matchable = roundMoney(matchable + share);
    }
    if (payment.project_id === null && matchable <= MONEY_TOLERANCE) continue;

    const documentType = payment.type === 'payment_out' ? 'invoice_in' : 'invoice_out';
    result.push({
      id: payment.id,
      type: payment.type,
      scope: payment.scope,
      description: payment.description,
      date: payment.date,
      currency: payment.currency ?? 'TRY',
      amount: payment.amount,
      amountTry: payment.amount_try,
      unmatched,
      companyId: payment.company_id,
      companyName: payment.company_name,
      companyType: payment.company_type,
      projectId: payment.project_id,
      projectName: payment.project_name,
      matchable,
      rest: roundMoney(Math.max(0, unmatched - matchable)),
      countedByOldProjectPage:
        payment.project_id !== null && (payment.allocated > 0 || payment.linked_invoice_id === null),
      advanceAllowed: payment.company_id !== null,
      suggestedCategoryId: categories[documentType],
    });
  }
  return result;
}

function findLegacyFirmPayments(db: SqlJsDatabase): LegacyFirmPayment[] {
  const found = rows<{ id: number; type: 'payment_in' | 'payment_out'; description: string; date: string; amount: number; amount_try: number }>(db, `
    SELECT t.id, t.type, t.description, t.date, t.amount, ${TRY_EXPR} as amount_try
    FROM transactions t
    WHERE t.scope = 'company' AND t.type IN ('payment_in', 'payment_out')
    ORDER BY t.date, t.id
  `);
  const categories = {
    invoice_in: defaultCategoryId(db, 'invoice_in'),
    invoice_out: defaultCategoryId(db, 'invoice_out'),
  };
  return found.map((row) => {
    const becomes = row.type === 'payment_in' ? 'invoice_out' : 'invoice_in';
    return {
      id: row.id,
      type: row.type,
      description: row.description,
      date: row.date,
      amount: row.amount,
      amountTry: row.amount_try,
      becomes,
      suggestedCategoryId: categories[becomes],
    };
  });
}

function computeTotals(db: SqlJsDatabase): Totals {
  const row = rows<Totals>(db, `
    SELECT
      COALESCE(SUM(CASE WHEN type = 'invoice_out' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'invoice_in' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as expense,
      COALESCE(SUM(CASE WHEN type = 'payment_in' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as collected,
      COALESCE(SUM(CASE WHEN type = 'payment_out' THEN COALESCE(amount_try, amount) ELSE 0 END), 0) as paid
    FROM transactions
  `)[0];
  return {
    income: roundMoney(row?.income ?? 0),
    expense: roundMoney(row?.expense ?? 0),
    collected: roundMoney(row?.collected ?? 0),
    paid: roundMoney(row?.paid ?? 0),
  };
}

interface ProjectTotalsRow {
  id: number;
  code: string;
  name: string;
  invoice_out: number;
  invoice_in: number;
  independent_in: number;
  independent_out: number;
}

function loadProjectTotals(db: SqlJsDatabase): ProjectTotalsRow[] {
  const independent = (type: string) => `
    COALESCE(SUM(CASE WHEN t.type = '${type}' THEN
      CASE
        WHEN COALESCE(alloc.allocated, 0) > 0 THEN MAX(0, ${TRY_EXPR} - alloc.allocated)
        WHEN t.linked_invoice_id IS NOT NULL THEN 0
        ELSE ${TRY_EXPR}
      END
    ELSE 0 END), 0)`;
  return rows<ProjectTotalsRow>(db, `
    SELECT pr.id, pr.code, pr.name,
      COALESCE(SUM(CASE WHEN t.type = 'invoice_out' THEN ${TRY_EXPR} ELSE 0 END), 0) as invoice_out,
      COALESCE(SUM(CASE WHEN t.type = 'invoice_in' THEN ${TRY_EXPR} ELSE 0 END), 0) as invoice_in,
      ${independent('payment_in')} as independent_in,
      ${independent('payment_out')} as independent_out
    FROM projects pr
    LEFT JOIN transactions t ON t.project_id = pr.id
    LEFT JOIN (SELECT payment_id, SUM(amount) as allocated FROM payment_allocations GROUP BY payment_id) alloc
      ON alloc.payment_id = t.id
    WHERE pr.is_active = 1
    GROUP BY pr.id
    ORDER BY pr.code
  `);
}

function figures(income: number, expense: number): ProjectFigures {
  return { income: roundMoney(income), expense: roundMoney(expense), profit: roundMoney(income - expense) };
}

export function computeBaseline(db: SqlJsDatabase, now: Date = new Date()): ReviewBaseline {
  const projects: ReviewBaseline['projects'] = {};
  for (const row of loadProjectTotals(db)) {
    projects[String(row.id)] = {
      code: row.code,
      name: row.name,
      ...figures(row.invoice_out + row.independent_in, row.invoice_in + row.independent_out),
    };
  }
  return { recordedAt: now.toISOString(), totals: computeTotals(db), projects };
}

export function readBaseline(db: SqlJsDatabase): ReviewBaseline | null {
  const raw = getMeta(db, REVIEW_BASELINE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'totals' in parsed && 'projects' in parsed) {
      return parsed as ReviewBaseline;
    }
    return null;
  } catch {
    return null;
  }
}

function findProjectEffects(db: SqlJsDatabase, baseline: ReviewBaseline | null): ProjectEffect[] {
  return loadProjectTotals(db)
    .map((row) => {
      const before = baseline?.projects[String(row.id)] ?? null;
      return {
        projectId: row.id,
        code: row.code,
        name: row.name,
        before: before ? { income: before.income, expense: before.expense, profit: before.profit } : null,
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
  const unmatched = completed
    ? 0
    : count(db, `
      SELECT COUNT(*) as n FROM transactions t
      WHERE t.type IN ('payment_in', 'payment_out') AND t.scope != 'company' AND NOT (${ORPHAN_CONDITION})
        AND ${TRY_EXPR} - COALESCE((SELECT SUM(amount) FROM payment_allocations WHERE payment_id = t.id), 0) > ${MONEY_TOLERANCE}
        AND (t.project_id IS NOT NULL OR EXISTS (
          SELECT 1 FROM transactions i
          WHERE i.company_id = t.company_id
            AND i.type = CASE t.type WHEN 'payment_in' THEN 'invoice_out' ELSE 'invoice_in' END
            AND COALESCE(i.amount_try, i.amount) - COALESCE((SELECT SUM(amount) FROM payment_allocations WHERE invoice_id = i.id), 0) > ${MONEY_TOLERANCE}
        ))
    `);
  const pending =
    findAmountFixes(db).length +
    dangling +
    count(db, `SELECT COUNT(*) as n FROM transactions t WHERE ${ORPHAN_CONDITION}`) +
    findRateIssues(db).length +
    findAllocationIssues(db).length +
    unmatched +
    count(db, "SELECT COUNT(*) as n FROM transactions WHERE scope = 'company' AND type IN ('payment_in', 'payment_out')");
  return { completed, pending };
}

export function countPending(report: DataReviewReport): number {
  const dangling = Object.values(report.dangling).reduce((sum, n) => sum + n, 0);
  return (
    report.amountFixes.length +
    dangling +
    report.orphans.length +
    report.rateIssues.length +
    report.allocationIssues.length +
    report.unmatchedPayments.length +
    report.legacyFirmPayments.length
  );
}

export function applyRepairs(db: SqlJsDatabase, orphanIds: number[]): ApplyResult {
  return runInSavepoint(db, () => {
    let changed = 0;
    for (const fix of findAmountFixes(db)) {
      db.run(
        `UPDATE transactions SET amount_try = ?, exchange_rate = CASE WHEN COALESCE(currency, 'TRY') = 'TRY' THEN 1 ELSE exchange_rate END,
           currency = COALESCE(currency, 'TRY'), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [fix.correctTry, fix.id]
      );
      changed += 1;
    }

    const statements = [
      `UPDATE transactions SET category_id = NULL
         WHERE category_id IS NOT NULL AND category_id NOT IN (SELECT id FROM categories)`,
      `UPDATE transactions SET linked_invoice_id = NULL
         WHERE linked_invoice_id IS NOT NULL AND linked_invoice_id NOT IN (SELECT id FROM transactions)`,
      `UPDATE projects SET client_company_id = NULL
         WHERE client_company_id IS NOT NULL AND client_company_id NOT IN (SELECT id FROM companies)`,
      `UPDATE stock_movements SET project_id = NULL
         WHERE project_id IS NOT NULL AND project_id NOT IN (SELECT id FROM projects)`,
      `UPDATE stock_movements SET company_id = NULL
         WHERE company_id IS NOT NULL AND company_id NOT IN (SELECT id FROM companies)`,
      `DELETE FROM payment_allocations
         WHERE payment_id NOT IN (SELECT id FROM transactions) OR invoice_id NOT IN (SELECT id FROM transactions)`,
      `DELETE FROM project_parties
         WHERE project_id NOT IN (SELECT id FROM projects) OR company_id NOT IN (SELECT id FROM companies)`,
      `UPDATE transactions SET project_id = NULL
         WHERE scope != 'project' AND project_id IS NOT NULL AND project_id NOT IN (SELECT id FROM projects)
           AND NOT (company_id IS NOT NULL AND company_id NOT IN (SELECT id FROM companies))`,
    ];
    for (const sql of statements) {
      db.run(sql);
      changed += db.getRowsModified();
    }

    const wanted = new Set(orphanIds);
    let skipped = 0;
    for (const orphan of findOrphans(db)) {
      if (!wanted.has(orphan.id)) {
        skipped += 1;
        continue;
      }
      const display = rows<Record<string, unknown>>(db, 'SELECT * FROM transactions WHERE id = ?', [orphan.id])[0];
      moveToTrash(db, 'transaction', display, collectTransactionBundle(db, orphan.id));
      changed += 1;
    }
    return { changed, skipped };
  });
}

export function applyRates(db: SqlJsDatabase, rates: { id: number; rate: number }[]): ApplyResult {
  return runInSavepoint(db, () => {
    let changed = 0;
    let skipped = 0;
    const issues = new Map(findRateIssues(db).map((issue) => [issue.id, issue]));
    for (const { id, rate } of rates) {
      const issue = issues.get(id);
      if (!issue || !(rate > 1)) {
        skipped += 1;
        continue;
      }
      const oldRate = issue.exchangeRate && issue.exchangeRate > 0 ? issue.exchangeRate : 1;
      const factor = rate / oldRate;
      const newTry = roundMoney(issue.amount * rate);
      db.run('UPDATE transactions SET exchange_rate = ?, amount_try = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        rate,
        newTry,
        id,
      ]);
      const linked = rows<{ id: number; amount: number; other_currency: string | null }>(db, `
        SELECT pa.id, pa.amount, o.currency as other_currency
        FROM payment_allocations pa
        JOIN transactions o ON o.id = CASE WHEN pa.payment_id = ? THEN pa.invoice_id ELSE pa.payment_id END
        WHERE pa.payment_id = ? OR pa.invoice_id = ?
      `, [id, id, id]);
      for (const allocation of linked) {
        if ((allocation.other_currency ?? 'TRY') !== issue.currency) continue;
        db.run('UPDATE payment_allocations SET amount = ? WHERE id = ?', [roundMoney(allocation.amount * factor), allocation.id]);
      }
      changed += 1;
    }
    capAllocations(db);
    return { changed, skipped };
  });
}

function capAllocations(db: SqlJsDatabase): void {
  for (const kind of ['payment_over', 'invoice_over'] as const) {
    for (const issue of findAllocationIssues(db).filter((i) => i.kind === kind)) {
      applyChanges(db, issue);
    }
  }
}

function applyChanges(db: SqlJsDatabase, issue: AllocationIssue): void {
  for (const change of issue.changes) {
    if (change.to <= MONEY_TOLERANCE) db.run('DELETE FROM payment_allocations WHERE id = ?', [change.allocationId]);
    else db.run('UPDATE payment_allocations SET amount = ? WHERE id = ?', [change.to, change.allocationId]);
  }
}

export function applyAllocationFixes(db: SqlJsDatabase, keys: string[]): ApplyResult {
  return runInSavepoint(db, () => {
    const wanted = new Set(keys);
    let changed = 0;
    const order: AllocationIssueKind[] = ['type_mismatch', 'assign_company', 'counterparty', 'payment_over', 'invoice_over'];
    for (const kind of order) {
      for (const issue of findAllocationIssues(db).filter((i) => i.kind === kind && wanted.has(i.key))) {
        if (issue.kind === 'assign_company') {
          db.run('UPDATE transactions SET company_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id IS NULL', [
            issue.companyId,
            issue.paymentId,
          ]);
        } else {
          applyChanges(db, issue);
        }
        changed += 1;
      }
    }
    const remaining = findAllocationIssues(db).length;
    return { changed, skipped: remaining };
  });
}

export function applyUnmatched(
  db: SqlJsDatabase,
  choices: UnmatchedChoice[],
  firmChoices: LegacyFirmChoice[],
  note: string | null
): ApplyResult {
  return runInSavepoint(db, () => {
    const allocations = new PaymentAllocationRepository(db);
    const transactions = new TransactionRepository(db);
    const listed = new Map(findUnmatchedPayments(db).map((p) => [p.id, p]));
    let changed = 0;
    let skipped = 0;

    const position = new Map([...listed.keys()].map((id, index) => [id, index]));
    const ordered = choices
      .filter((choice) => listed.has(choice.id))
      .sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
    skipped += choices.length - ordered.length;

    for (const choice of ordered) {
      const payment = listed.get(choice.id)!;
      if (choice.rest === 'advance' && !payment.advanceAllowed) {
        skipped += 1;
        continue;
      }
      let did = false;
      if (choice.match) {
        const pool = { companyId: payment.companyId, projectId: payment.projectId };
        const candidates = reviewCandidates(allocations, payment.type, pool, payment.id);
        let left = roundMoney(payment.amountTry - candidates.reduce((s, c) => s + c.allocated_here, 0));
        const next = candidates
          .filter((c) => c.allocated_here > 0)
          .map((c) => ({ invoiceId: c.id, amount: c.allocated_here }));
        for (const candidate of candidates) {
          if (left <= MONEY_TOLERANCE) break;
          const free = roundMoney(candidate.remaining - candidate.allocated_here);
          if (free <= MONEY_TOLERANCE) continue;
          const share = roundMoney(Math.min(free, left));
          const existing = next.find((n) => n.invoiceId === candidate.id);
          if (existing) existing.amount = roundMoney(existing.amount + share);
          else next.push({ invoiceId: candidate.id, amount: share });
          left = roundMoney(left - share);
        }
        if (allocations.findAllocationProblem(payment.id, next) === null) {
          allocations.setForPayment(payment.id, next);
          did = true;
        }
      }
      if (choice.rest === 'document') {
        const categoryId = choice.categoryId ?? payment.suggestedCategoryId;
        if (categoryId === null) {
          skipped += 1;
          continue;
        }
        if (transactions.bookRemainderDocument(payment.id, categoryId, note) !== null) did = true;
      }
      if (did) changed += 1;
    }

    const firm = new Map(findLegacyFirmPayments(db).map((p) => [p.id, p]));
    for (const choice of firmChoices) {
      const payment = firm.get(choice.id);
      const category = rows<{ type: string }>(db, 'SELECT type FROM categories WHERE id = ?', [choice.categoryId])[0];
      if (!payment || category?.type !== payment.becomes) {
        skipped += 1;
        continue;
      }
      db.run('DELETE FROM payment_allocations WHERE payment_id = ? OR invoice_id = ?', [payment.id, payment.id]);
      db.run('UPDATE transactions SET type = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        payment.becomes,
        choice.categoryId,
        payment.id,
      ]);
      changed += 1;
    }
    return { changed, skipped };
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
