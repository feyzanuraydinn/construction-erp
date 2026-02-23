import { contextBridge, ipcRenderer } from 'electron';

// These mirror TransactionFilters and StockMovementFilters from types/index.ts.
// Kept local because preload runs in a separate compilation context (electron main).
// Union types match the Zod schemas in utils/schemas.ts.
interface TransactionFilters {
  scope?: 'cari' | 'project' | 'company';
  type?: 'invoice_out' | 'payment_in' | 'invoice_in' | 'payment_out';
  company_id?: number | null;
  project_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  search?: string;
  limit?: number | null;
}

interface StockMovementFilters {
  material_id?: number | null;
  movement_type?: 'in' | 'out' | 'adjustment' | 'waste';
  project_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Company operations
  company: {
    getAll: () => ipcRenderer.invoke('company:getAll'),
    getWithBalance: () => ipcRenderer.invoke('company:getWithBalance'),
    getById: (id: number) => ipcRenderer.invoke('company:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('company:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('company:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('company:delete', id),
    getRelatedCounts: (id: number) => ipcRenderer.invoke('company:getRelatedCounts', id),
  },

  // Project operations
  project: {
    getAll: () => ipcRenderer.invoke('project:getAll'),
    getWithSummary: () => ipcRenderer.invoke('project:getWithSummary'),
    getById: (id: number) => ipcRenderer.invoke('project:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('project:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('project:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('project:delete', id),
    generateCode: () => ipcRenderer.invoke('project:generateCode'),
    getParties: (projectId: number) => ipcRenderer.invoke('project:getParties', projectId),
    addParty: (data: unknown) => ipcRenderer.invoke('project:addParty', data),
    removeParty: (id: number) => ipcRenderer.invoke('project:removeParty', id),
  },

  // Transaction operations
  transaction: {
    getAll: (filters?: TransactionFilters) => ipcRenderer.invoke('transaction:getAll', filters),
    getByCompany: (companyId: number, filters?: TransactionFilters) =>
      ipcRenderer.invoke('transaction:getByCompany', companyId, filters),
    getByProject: (projectId: number, filters?: TransactionFilters) =>
      ipcRenderer.invoke('transaction:getByProject', projectId, filters),
    create: (data: unknown) => ipcRenderer.invoke('transaction:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('transaction:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('transaction:delete', id),
    getInvoicesForProject: (projectId: number) =>
      ipcRenderer.invoke('transaction:getInvoicesForProject', projectId),
    getInvoicesForCompany: (companyId: number) =>
      ipcRenderer.invoke('transaction:getInvoicesForCompany', companyId),
    getInvoicesWithBalance: (entityId: number, entityType: string, invoiceType: string) =>
      ipcRenderer.invoke('transaction:getInvoicesWithBalance', entityId, entityType, invoiceType),
    setAllocations: (paymentId: number, allocations: { invoiceId: number; amount: number }[]) =>
      ipcRenderer.invoke('transaction:setAllocations', paymentId, allocations),
    getAllocationsForPayment: (paymentId: number) =>
      ipcRenderer.invoke('transaction:getAllocationsForPayment', paymentId),
  },

  // Material operations
  material: {
    getAll: () => ipcRenderer.invoke('material:getAll'),
    getById: (id: number) => ipcRenderer.invoke('material:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('material:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('material:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('material:delete', id),
    generateCode: () => ipcRenderer.invoke('material:generateCode'),
    getLowStock: () => ipcRenderer.invoke('material:getLowStock'),
  },

  // Stock operations
  stock: {
    getAll: (filters?: StockMovementFilters) => ipcRenderer.invoke('stock:getAll', filters),
    create: (data: unknown) => ipcRenderer.invoke('stock:create', data),
    delete: (id: number) => ipcRenderer.invoke('stock:delete', id),
  },

  // Category operations
  category: {
    getAll: (type?: string) => ipcRenderer.invoke('category:getAll', type),
    create: (data: unknown) => ipcRenderer.invoke('category:create', data),
    delete: (id: number) => ipcRenderer.invoke('category:delete', id),
  },

  // Trash operations
  trash: {
    getAll: () => ipcRenderer.invoke('trash:getAll'),
    restore: (id: number) => ipcRenderer.invoke('trash:restore', id),
    permanentDelete: (id: number) => ipcRenderer.invoke('trash:permanentDelete', id),
    empty: () => ipcRenderer.invoke('trash:empty'),
  },

  // Dashboard operations
  dashboard: {
    getStats: () => ipcRenderer.invoke('dashboard:getStats'),
    getRecentTransactions: (limit: number) =>
      ipcRenderer.invoke('dashboard:getRecentTransactions', limit),
    getTopDebtors: (limit: number, startDate?: string) => ipcRenderer.invoke('dashboard:getTopDebtors', limit, startDate),
    getTopCreditors: (limit: number, startDate?: string) => ipcRenderer.invoke('dashboard:getTopCreditors', limit, startDate),
  },

  // Analytics operations
  analytics: {
    getMonthlyStats: (year: number) => ipcRenderer.invoke('analytics:getMonthlyStats', year),
    getProjectCategoryBreakdown: (projectId: number) =>
      ipcRenderer.invoke('analytics:getProjectCategoryBreakdown', projectId),
    getCompanyMonthlyStats: (companyId: number, year: number) =>
      ipcRenderer.invoke('analytics:getCompanyMonthlyStats', companyId, year),
    getCashFlowReport: (year: number) => ipcRenderer.invoke('analytics:getCashFlowReport', year),
    getAgingReceivables: () => ipcRenderer.invoke('analytics:getAgingReceivables'),
  },

  // Backup operations
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    list: () => ipcRenderer.invoke('backup:list'),
    restore: (backupPath: string) => ipcRenderer.invoke('backup:restore', backupPath),
    selectFolder: () => ipcRenderer.invoke('backup:selectFolder'),
    openFolder: () => ipcRenderer.invoke('backup:openFolder'),
  },

  // Export operations
  export: {
    toExcel: (data: { type: string; records: unknown[]; filename?: string }) =>
      ipcRenderer.invoke('export:toExcel', data),
    toPDF: (data: { type: string; html: string; filename?: string }) =>
      ipcRenderer.invoke('export:toPDF', data),
  },

  // Exchange rate operations
  exchange: {
    getRates: () => ipcRenderer.invoke('exchange:getRates'),
  },

  // Google Drive operations
  gdrive: {
    hasCredentials: () => ipcRenderer.invoke('gdrive:hasCredentials'),
    isConnected: () => ipcRenderer.invoke('gdrive:isConnected'),
    saveCredentials: (clientId: string, clientSecret: string) =>
      ipcRenderer.invoke('gdrive:saveCredentials', clientId, clientSecret),
    connect: () => ipcRenderer.invoke('gdrive:connect'),
    disconnect: () => ipcRenderer.invoke('gdrive:disconnect'),
    listBackups: () => ipcRenderer.invoke('gdrive:listBackups'),
    uploadBackup: () => ipcRenderer.invoke('gdrive:uploadBackup'),
    downloadBackup: (fileId: string, fileName: string) =>
      ipcRenderer.invoke('gdrive:downloadBackup', fileId, fileName),
    deleteBackup: (fileId: string) => ipcRenderer.invoke('gdrive:deleteBackup', fileId),
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    print: () => ipcRenderer.invoke('app:print'),
    setLanguage: (locale: string) => ipcRenderer.invoke('app:setLanguage', locale),
  },
});
