import type {
  Company,
  CompanyWithBalance,
  AccountType,
  Project,
  ProjectWithSummary,
  ProjectWithClient,
  Transaction,
  TransactionWithDetails,
  TransactionFilters,
  Material,
  StockMovement,
  StockMovementWithDetails,
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
  MatchCandidate,
  MatchCandidatesRequest,
  SaveTransactionRequest,
  SaveTransactionResult,
} from './index';
import type {
  ExportRequest,
  CompanyFormInput,
  ProjectFormInput,
  TransactionFormInput,
  MaterialFormInput,
  StockMovementFormInput,
  ConflictChoice,
} from '../utils/schemas';
import type { RestoreResult } from '../database/repositories/trashBundle';
import type {
  DataReviewReport,
  LegacyFirmChoice,
  ReviewStepResult,
  UnmatchedChoice,
} from '../database/dataReview';
import type { SyncStatusPayload, SyncConflictPayload } from './sync';

export interface ElectronAPI {
  company: {
    getAll: () => Promise<Company[]>;
    getWithBalance: () => Promise<CompanyWithBalance[]>;
    getById: (id: number) => Promise<Company | undefined>;
    create: (data: CompanyFormInput) => Promise<Company>;
    update: (id: number, data: CompanyFormInput) => Promise<Company | undefined>;
    delete: (id: number) => Promise<{ success: boolean }>;
    getRelatedCounts: (id: number) => Promise<{ transactionCount: number; projectCount: number }>;
  };

  project: {
    getAll: () => Promise<Project[]>;
    getWithSummary: () => Promise<ProjectWithSummary[]>;
    getById: (id: number) => Promise<ProjectWithClient | undefined>;
    create: (data: ProjectFormInput) => Promise<Project>;
    update: (id: number, data: ProjectFormInput) => Promise<Project | undefined>;
    delete: (id: number) => Promise<{ success: boolean }>;
    getRelatedCounts: (
      id: number
    ) => Promise<{ transactionCount: number; linkedTransactionCount: number }>;
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
    create: (data: TransactionFormInput) => Promise<Transaction>;
    update: (id: number, data: TransactionFormInput) => Promise<TransactionWithDetails | undefined>;
    delete: (id: number) => Promise<{ success: boolean }>;
    save: (request: SaveTransactionRequest) => Promise<SaveTransactionResult>;
    getMatchCandidates: (request: MatchCandidatesRequest) => Promise<MatchCandidate[]>;
    getAllocationsForPayment: (paymentId: number) => Promise<PaymentAllocationWithDetails[]>;
    getAllocationsForInvoice: (invoiceId: number) => Promise<PaymentAllocationWithDetails[]>;
  };

  review: {
    getStatus: () => Promise<{ completed: boolean; pending: number }>;
    getReport: () => Promise<DataReviewReport>;
    applyRepairs: (request: { orphanIds: number[] }) => Promise<ReviewStepResult>;
    applyRates: (request: { rates: { id: number; rate: number }[] }) => Promise<ReviewStepResult>;
    applyAllocationFixes: (request: { keys: string[] }) => Promise<ReviewStepResult>;
    applyUnmatched: (request: {
      choices: UnmatchedChoice[];
      firmChoices: LegacyFirmChoice[];
    }) => Promise<ReviewStepResult>;
    complete: () => Promise<DataReviewReport>;
  };

  material: {
    getAll: () => Promise<Material[]>;
    create: (data: MaterialFormInput) => Promise<Material>;
    update: (id: number, data: MaterialFormInput) => Promise<Material | undefined>;
    delete: (id: number) => Promise<{ success: boolean }>;
    generateCode: () => Promise<string>;
  };

  stock: {
    getAll: (filters?: StockMovementFilters) => Promise<StockMovementWithDetails[]>;
    create: (data: StockMovementFormInput) => Promise<StockMovement>;
    delete: (id: number) => Promise<{ success: boolean }>;
  };

  category: {
    getAll: () => Promise<Category[]>;
    create: (data: { name: string; type: Category['type']; color?: string }) => Promise<Category>;
    delete: (id: number) => Promise<{ success: boolean }>;
  };

  trash: {
    getAll: () => Promise<TrashItem[]>;
    restore: (id: number) => Promise<RestoreResult>;
    permanentDelete: (id: number) => Promise<{ success: boolean }>;
    empty: () => Promise<{ success: boolean }>;
  };

  dashboard: {
    getStats: () => Promise<DashboardStats>;
    getTopDebtors: (limit: number) => Promise<DebtorCreditor[]>;
    getTopCreditors: (limit: number) => Promise<DebtorCreditor[]>;
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
    openFolder: () => Promise<void>;
  };

  export: {
    toExcel: (data: ExportRequest) => Promise<string>;
    share: (data: ExportRequest) => Promise<{ success: boolean }>;
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
  };

  app: {
    getVersion: () => Promise<string>;
    print: () => Promise<{ success: boolean; error?: string }>;
    setLanguage: (locale: string) => Promise<void>;
    confirmClose: () => Promise<{ success: boolean }>;
    cancelClose: () => Promise<{ success: boolean }>;
    onCloseRequested: (callback: (payload: { hasPendingChanges: boolean }) => void) => () => void;
    onDataChanged: (callback: () => void) => () => void;
  };

  sync: SyncAPI;
}

export interface SyncAPI {
  getStatus: () => Promise<SyncStatusPayload>;
  check: () => Promise<{ success: boolean }>;
  resolveConflict: (choice: ConflictChoice) => Promise<{ success: boolean; error?: string }>;
  onStatus: (callback: (payload: SyncStatusPayload) => void) => () => void;
  onConflict: (callback: (payload: SyncConflictPayload) => void) => () => void;
  onReloadRequired: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
