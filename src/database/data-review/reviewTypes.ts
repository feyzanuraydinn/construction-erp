import type { z } from 'zod';
import type { Currency, TransactionScope, TransactionType, FlowTotals } from '../../types';
import type { reviewUnmatchedSchema } from '../../utils/schemas';

interface ReviewTransaction {
  id: number;
  type: TransactionType;
  description: string;
  date: string;
  currency: Currency;
  amount: number;
}

export interface AmountFix extends ReviewTransaction {
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

export interface OrphanTransaction extends ReviewTransaction {
  scope: TransactionScope;
  amountTry: number;
  missing: 'company' | 'project';
  missingId: number;
}

export interface RateIssue extends ReviewTransaction {
  exchangeRate: number | null;
  companyName: string | null;
  projectName: string | null;
}

export type AllocationIssueKind =
  | 'type_mismatch'
  | 'counterparty'
  | 'assign_company'
  | 'payment_over'
  | 'invoice_over';

export interface AllocationChange {
  allocationId: number;
  invoiceDescription: string;
  from: number;
  to: number;
}

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
  changes: AllocationChange[];
}

export interface UnmatchedPayment extends ReviewTransaction {
  type: 'payment_in' | 'payment_out';
  scope: TransactionScope;
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

export type Totals = FlowTotals;

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

export type UnmatchedChoice = z.infer<typeof reviewUnmatchedSchema>['choices'][number];

export type LegacyFirmChoice = z.infer<typeof reviewUnmatchedSchema>['firmChoices'][number];

export interface ApplyResult {
  changed: number;
  skipped: number;
}
