// ==================== BASE TYPES ====================

export type CompanyType = 'person' | 'company';
export type AccountType = 'customer' | 'supplier' | 'subcontractor' | 'investor';
export type ProjectStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type ProjectType =
  | 'residential'
  | 'villa'
  | 'commercial'
  | 'mixed'
  | 'infrastructure'
  | 'renovation';
export type OwnershipType = 'own' | 'client';
export type TransactionType = 'invoice_out' | 'payment_in' | 'invoice_in' | 'payment_out';
export type TransactionScope = 'cari' | 'project' | 'company';
export type Currency = 'TRY' | 'USD' | 'EUR';
export type MovementType = 'in' | 'out' | 'adjustment' | 'waste';

// ==================== DATABASE MODELS ====================

export interface Company {
  id: number;
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
  total_invoice_out: number;
  total_payment_in: number;
  total_invoice_in: number;
  total_payment_out: number;
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

export interface ProjectWithSummary extends Project {
  client_name?: string | null;
  total_invoice_out: number;
  total_invoice_in: number;
  total_collected: number;
  total_paid: number;
  independent_payment_in: number;
  independent_payment_out: number;
  total_income: number;
  total_expense: number;
  transaction_count?: number;
  party_count?: number;
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

// ==================== DASHBOARD TYPES ====================

export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  totalCollected: number;
  totalPaid: number;
  netCash: number;
  activeProjects: number;
  totalCompanies: number;
  totalReceivables: number;
  totalPayables: number;
  lowStockCount: number;
}

export interface DebtorCreditor {
  id: number;
  name: string;
  type: CompanyType;
  account_type: AccountType;
  balance: number;
}

// ==================== ANALYTICS TYPES ====================

export interface MonthlyStats {
  month: string;
  income: number;
  expense: number;
  collected: number;
  paid: number;
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

// ==================== FILTER TYPES ====================
// Single source of truth — derived from Zod schemas in utils/schemas.ts.
// Partial<> is used because callers only provide a subset of filter fields.

import type {
  TransactionFiltersInput,
  StockMovementFiltersInput,
  CompanyFormInput,
  ProjectFormInput,
  TransactionFormInput,
  MaterialFormInput,
  StockMovementFormInput,
} from '../utils/schemas';

export type TransactionFilters = Partial<TransactionFiltersInput>;
export type StockMovementFilters = Partial<StockMovementFiltersInput>;

// ==================== FORM DATA TYPES ====================
// Derived from Zod schemas (z.input = pre-transform input types).
// These match what the frontend sends to IPC before Zod validation.

export type CompanyFormData = CompanyFormInput;
export type ProjectFormData = ProjectFormInput;
export type TransactionFormData = TransactionFormInput;
export type MaterialFormData = MaterialFormInput;
export type StockMovementFormData = StockMovementFormInput;

// ==================== UI TYPES ====================

export interface SelectOption {
  value: string | number;
  label: string;
}

export type BadgeVariant =
  | 'gray'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'purple'
  | 'default';

// ==================== EXCHANGE RATES ====================

export interface ExchangeRates {
  USD: number;
  EUR: number;
}

// ==================== GOOGLE DRIVE TYPES ====================

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

// ==================== PAYMENT ALLOCATION TYPES ====================

export interface PaymentAllocation {
  id: number;
  payment_id: number;
  invoice_id: number;
  amount: number;
  created_at: string;
}

export interface PaymentAllocationWithDetails extends PaymentAllocation {
  invoice_description?: string;
  invoice_amount?: number;
  invoice_amount_try?: number;
  invoice_date?: string;
  invoice_document_no?: string | null;
  invoice_type?: TransactionType;
  payment_description?: string;
  payment_amount?: number;
  payment_amount_try?: number;
  payment_date?: string;
  payment_document_no?: string | null;
}

export interface InvoiceWithBalance {
  id: number;
  type: TransactionType;
  description: string;
  amount: number;
  amount_try: number;
  date: string;
  document_no: string | null;
  company_name?: string | null;
  total_allocated: number;
  remaining: number;
}
