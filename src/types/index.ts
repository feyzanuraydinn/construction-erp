export const COMPANY_TYPE_VALUES = ['person', 'company'] as const;
export const ACCOUNT_TYPE_VALUES = ['customer', 'supplier', 'subcontractor', 'investor'] as const;
export const PROJECT_STATUS_VALUES = ['planned', 'active', 'completed', 'cancelled'] as const;
export const PROJECT_TYPE_VALUES = [
  'residential',
  'villa',
  'commercial',
  'mixed',
  'infrastructure',
  'renovation',
] as const;
export const OWNERSHIP_TYPE_VALUES = ['own', 'client'] as const;
export const TRANSACTION_TYPE_VALUES = [
  'invoice_out',
  'payment_in',
  'invoice_in',
  'payment_out',
] as const;
export const TRANSACTION_SCOPE_VALUES = ['cari', 'project', 'company'] as const;
export const CURRENCY_VALUES = ['TRY', 'USD', 'EUR'] as const;
export const MOVEMENT_TYPE_VALUES = ['in', 'out', 'adjustment', 'waste'] as const;
export const CATEGORY_TYPE_VALUES = ['invoice_out', 'invoice_in', 'payment'] as const;
export const LANGUAGE_VALUES = ['tr', 'en'] as const;

export type CompanyType = (typeof COMPANY_TYPE_VALUES)[number];
export type AccountType = (typeof ACCOUNT_TYPE_VALUES)[number];
export type ProjectStatus = (typeof PROJECT_STATUS_VALUES)[number];
export type ProjectType = (typeof PROJECT_TYPE_VALUES)[number];
export type OwnershipType = (typeof OWNERSHIP_TYPE_VALUES)[number];
export type TransactionType = (typeof TRANSACTION_TYPE_VALUES)[number];
export type PaymentType = 'payment_in' | 'payment_out';
export type TransactionScope = (typeof TRANSACTION_SCOPE_VALUES)[number];
export type Currency = (typeof CURRENCY_VALUES)[number];
export type MovementType = (typeof MOVEMENT_TYPE_VALUES)[number];
export type CategoryType = (typeof CATEGORY_TYPE_VALUES)[number];
export type Language = (typeof LANGUAGE_VALUES)[number];

export interface Company {
  id: number;
  code?: string | null;
  type: CompanyType;
  account_type: AccountType;
  name: string;
  tc_number?: string | null;
  profession?: string | null;
  tax_office?: string | null;
  tax_number?: string | null;
  trade_registry_no?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  bank_name?: string | null;
  iban?: string | null;
  notes?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyWithBalance extends Company {
  receivable: number;
  payable: number;
  balance: number;
}

export interface Project {
  id: number;
  code: string;
  name: string;
  ownership_type: OwnershipType;
  client_company_id?: number | null;
  status: ProjectStatus;
  project_type?: ProjectType | null;
  location?: string | null;
  total_area?: number | null;
  unit_count?: number | null;
  estimated_budget?: number | null;
  planned_start?: string | null;
  planned_end?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  description?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithClient extends Project {
  client_name?: string | null;
}

export interface ProjectWithSummary extends ProjectWithClient {
  total_collected: number;
  total_paid: number;
  total_income: number;
  total_expense: number;
}

export interface Category {
  id: number;
  name: string;
  type: 'invoice_out' | 'invoice_in' | 'payment';
  color: string;
  is_default: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  scope: TransactionScope;
  company_id?: number | null;
  project_id?: number | null;
  type: TransactionType;
  category_id?: number | null;
  date: string;
  description: string;
  amount: number;
  currency: Currency;
  exchange_rate: number;
  amount_try: number;
  document_no?: string | null;
  linked_invoice_id?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionWithDetails extends Transaction {
  company_name?: string | null;
  project_name?: string | null;
  project_code?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  allocated_amount?: number;
  settled_amount?: number;
}

export interface Material {
  id: number;
  code: string;
  name: string;
  category?: string | null;
  unit: string;
  min_stock: number;
  current_stock: number;
  notes?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  material_id: number;
  movement_type: MovementType;
  quantity: number;
  unit_price?: number | null;
  total_price?: number | null;
  project_id?: number | null;
  company_id?: number | null;
  date: string;
  description?: string | null;
  document_no?: string | null;
  created_at: string;
}

export interface StockMovementWithDetails extends StockMovement {
  material_name: string;
  material_unit: string;
  material_code: string;
  project_name?: string | null;
  company_name?: string | null;
}

export interface ProjectParty {
  id: number;
  project_id: number;
  company_id: number;
  role: AccountType;
  notes?: string | null;
  created_at: string;
}

export interface ProjectPartyWithDetails extends ProjectParty {
  company_name: string;
  company_type: CompanyType;
  phone?: string | null;
  email?: string | null;
}

export interface TrashItem {
  id: number;
  type: 'company' | 'project' | 'transaction' | 'material' | 'stock_movement';
  data: string;
  deleted_at: string;
}

export interface DashboardStats {
  totalReceivables: number;
  totalPayables: number;
}

export interface DebtorCreditor {
  id: number;
  name: string;
  type: CompanyType;
  account_type: AccountType;
  balance: number;
}

export interface FlowTotals {
  income: number;
  expense: number;
  collected: number;
  paid: number;
}

export interface MonthlyStats extends FlowTotals {
  month: string;
}

export interface CategoryBreakdown {
  category: string;
  color: string;
  total: number;
}

export interface CashFlowData {
  month: number;
  collected: number;
  paid: number;
  netCash: number;
  cumulative: number;
}

export interface AgingReceivable {
  companyId: number;
  companyName: string;
  current: number;
  days30: number;
  days60: number;
  days90plus: number;
  total: number;
}

import type {
  TransactionFiltersInput,
  StockMovementFiltersInput,
  TransactionFormInput,
} from '../utils/schemas';

export type TransactionFilters = Partial<TransactionFiltersInput>;
export type StockMovementFilters = Partial<StockMovementFiltersInput>;

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface TypedSelectOption<T extends string> extends SelectOption {
  value: T;
}

export type BadgeVariant = 'gray' | 'success' | 'danger' | 'warning' | 'info' | 'purple';

export interface ExchangeRates {
  USD: number;
  EUR: number;
}

export interface DriveBackupFile {
  id: string;
  name: string;
  size: string;
  createdTime: string;
  modifiedTime: string;
}

export interface DriveOperationResult {
  success: boolean;
  fileId?: string;
  error?: string;
}

export interface PaymentAllocation {
  id: number;
  payment_id: number;
  invoice_id: number;
  amount: number;
  created_at: string;
}

export interface PaymentAllocationWithDetails extends PaymentAllocation {
  invoice_description?: string;
  invoice_date?: string;
  invoice_document_no?: string | null;
  payment_description?: string;
  payment_date?: string;
  payment_document_no?: string | null;
}

export interface MatchCandidate {
  id: number;
  type: TransactionType;
  description: string;
  amount: number;
  currency: Currency;
  amount_try: number;
  date: string;
  document_no: string | null;
  company_id: number | null;
  company_name: string | null;
  project_id: number | null;
  project_name: string | null;
  remaining: number;
  allocated_here: number;
}

export interface AllocationInput {
  invoiceId: number;
  amount: number;
}

export interface InvoiceAllocationInput {
  paymentId: number;
  amount: number;
}

export interface SaveTransactionRequest {
  id?: number;
  data: TransactionFormInput;
  paymentAllocations?: AllocationInput[];
  invoiceAllocations?: InvoiceAllocationInput[];
  remainderDocument?: { categoryId: number };
}

export interface SaveTransactionResult {
  transaction: TransactionWithDetails;
  documentId: number | null;
}

export interface MatchCandidatesRequest {
  type: TransactionType;
  companyId: number | null;
  projectId: number | null;
  selfId: number | null;
}

export interface MatchPool {
  companyId: number | null;
  projectId: number | null;
}
