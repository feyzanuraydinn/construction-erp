import type {
  Company,
  CompanyWithBalance,
  CompanyFormData,
  AccountType,
  Project,
  ProjectWithSummary,
  ProjectFormData,
  Transaction,
  TransactionWithDetails,
  TransactionFormData,
  TransactionFilters,
  Material,
  MaterialFormData,
  StockMovement,
  StockMovementWithDetails,
  StockMovementFormData,
  StockMovementFilters,
  Category,
  ProjectParty,
  ProjectPartyWithDetails,
  TrashItem,
  DashboardStats,
  DebtorCreditor,
  MonthlyStats,
  CategoryBreakdown,
  CashFlowData,
  AgingReceivable,
  ExchangeRates,
  DriveBackupFile,
  DriveOperationResult,
  PaymentAllocationWithDetails,
  InvoiceWithBalance,
} from './index';

export interface ElectronAPI {
  company: {
    getAll: () => Promise<Company[]>;
    getWithBalance: () => Promise<CompanyWithBalance[]>;
    getById: (id: number) => Promise<Company | undefined>;
    create: (data: CompanyFormData) => Promise<Company>;
    update: (id: number, data: CompanyFormData) => Promise<Company>;
    delete: (id: number) => Promise<{ success: boolean }>;
    getRelatedCounts: (id: number) => Promise<{ transactionCount: number; projectCount: number }>;
  };

  project: {
    getAll: () => Promise<Project[]>;
    getWithSummary: () => Promise<ProjectWithSummary[]>;
    getById: (id: number) => Promise<ProjectWithSummary | undefined>;
    create: (data: ProjectFormData) => Promise<Project>;
    update: (id: number, data: ProjectFormData) => Promise<Project>;
    delete: (id: number) => Promise<{ success: boolean }>;
    generateCode: () => Promise<string>;
    getParties: (projectId: number) => Promise<ProjectPartyWithDetails[]>;
    addParty: (data: {
      project_id: number;
      company_id: number;
      role: AccountType;
      notes?: string;
    }) => Promise<ProjectParty>;
    removeParty: (id: number) => Promise<{ success: boolean }>;
  };

  transaction: {
    getAll: (filters?: TransactionFilters) => Promise<TransactionWithDetails[]>;
    getByCompany: (
      companyId: number,
      filters?: TransactionFilters
    ) => Promise<TransactionWithDetails[]>;
    getByProject: (
      projectId: number,
      filters?: TransactionFilters
    ) => Promise<TransactionWithDetails[]>;
    create: (data: TransactionFormData) => Promise<Transaction>;
    update: (id: number, data: TransactionFormData) => Promise<Transaction>;
    delete: (id: number) => Promise<{ success: boolean }>;
    getInvoicesForProject: (projectId: number) => Promise<TransactionWithDetails[]>;
    getInvoicesForCompany: (companyId: number) => Promise<TransactionWithDetails[]>;
    getInvoicesWithBalance: (entityId: number, entityType: 'project' | 'company', invoiceType: 'invoice_out' | 'invoice_in') => Promise<InvoiceWithBalance[]>;
    setAllocations: (paymentId: number, allocations: { invoiceId: number; amount: number }[]) => Promise<{ success: boolean }>;
    getAllocationsForPayment: (paymentId: number) => Promise<PaymentAllocationWithDetails[]>;
  };

  material: {
    getAll: () => Promise<Material[]>;
    getById: (id: number) => Promise<Material | undefined>;
    create: (data: MaterialFormData) => Promise<Material>;
    update: (id: number, data: MaterialFormData) => Promise<Material>;
    delete: (id: number) => Promise<{ success: boolean }>;
    generateCode: () => Promise<string>;
    getLowStock: () => Promise<Material[]>;
  };

  stock: {
    getAll: (filters?: StockMovementFilters) => Promise<StockMovementWithDetails[]>;
    create: (data: StockMovementFormData) => Promise<StockMovement>;
    delete: (id: number) => Promise<{ success: boolean }>;
  };

  category: {
    getAll: (type?: Category['type']) => Promise<Category[]>;
    create: (data: { name: string; type: Category['type']; color?: string }) => Promise<Category>;
    delete: (id: number) => Promise<{ success: boolean }>;
  };

  trash: {
    getAll: () => Promise<TrashItem[]>;
    restore: (id: number) => Promise<{ success: boolean; error?: string }>;
    permanentDelete: (id: number) => Promise<{ success: boolean }>;
    empty: () => Promise<{ success: boolean }>;
  };

  dashboard: {
    getStats: () => Promise<DashboardStats>;
    getRecentTransactions: (limit?: number) => Promise<TransactionWithDetails[]>;
    getTopDebtors: (limit?: number, startDate?: string) => Promise<DebtorCreditor[]>;
    getTopCreditors: (limit?: number, startDate?: string) => Promise<DebtorCreditor[]>;
  };

  analytics: {
    getMonthlyStats: (year: number) => Promise<MonthlyStats[]>;
    getProjectCategoryBreakdown: (projectId: number) => Promise<CategoryBreakdown[]>;
    getCompanyMonthlyStats: (companyId: number, year: number) => Promise<MonthlyStats[]>;
    getCashFlowReport: (year: number) => Promise<CashFlowData[]>;
    getAgingReceivables: () => Promise<AgingReceivable[]>;
  };

  backup: {
    create: () => Promise<string>;
    list: () => Promise<{ name: string; path: string; size: number; date: string }[]>;
    restore: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
    selectFolder: () => Promise<string | null>;
    openFolder: () => Promise<void>;
  };

  export: {
    toExcel: (data: { type: string; records: unknown[]; filename?: string }) => Promise<string>;
    toPDF: (data: { type: string; html: string; filename?: string }) => Promise<string>;
  };

  exchange: {
    getRates: () => Promise<ExchangeRates>;
  };

  gdrive: {
    hasCredentials: () => Promise<boolean>;
    isConnected: () => Promise<boolean>;
    saveCredentials: (clientId: string, clientSecret: string) => Promise<{ success: boolean }>;
    connect: () => Promise<DriveOperationResult>;
    disconnect: () => Promise<{ success: boolean }>;
    listBackups: () => Promise<DriveBackupFile[]>;
    uploadBackup: () => Promise<DriveOperationResult>;
    downloadBackup: (fileId: string, fileName: string) => Promise<DriveOperationResult>;
    deleteBackup: (fileId: string) => Promise<DriveOperationResult>;
  };

  app: {
    getVersion: () => Promise<string>;
    print: () => Promise<{ success: boolean; error?: string }>;
    setLanguage: (locale: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
