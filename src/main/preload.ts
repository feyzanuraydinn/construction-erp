import { contextBridge, ipcRenderer } from 'electron';
import type { ExportRequest, ConflictChoice } from '../utils/schemas';
import type { TransactionFilters, StockMovementFilters } from '../types';
import type { ElectronAPI } from '../types/electron';
import type { SyncStatusPayload, SyncConflictPayload } from '../types/sync';

const api: ElectronAPI = {
  company: {
    getAll: () => ipcRenderer.invoke('company:getAll'),
    getWithBalance: () => ipcRenderer.invoke('company:getWithBalance'),
    getById: (id: number) => ipcRenderer.invoke('company:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('company:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('company:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('company:delete', id),
    getRelatedCounts: (id: number) => ipcRenderer.invoke('company:getRelatedCounts', id),
  },

  project: {
    getAll: () => ipcRenderer.invoke('project:getAll'),
    getWithSummary: () => ipcRenderer.invoke('project:getWithSummary'),
    getById: (id: number) => ipcRenderer.invoke('project:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('project:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('project:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('project:delete', id),
    getRelatedCounts: (id: number) => ipcRenderer.invoke('project:getRelatedCounts', id),
    generateCode: () => ipcRenderer.invoke('project:generateCode'),
    getParties: (projectId: number) => ipcRenderer.invoke('project:getParties', projectId),
    addParty: (data: unknown) => ipcRenderer.invoke('project:addParty', data),
    removeParty: (id: number) => ipcRenderer.invoke('project:removeParty', id),
  },

  transaction: {
    getAll: (filters?: TransactionFilters) => ipcRenderer.invoke('transaction:getAll', filters),
    getByCompany: (companyId: number, filters?: TransactionFilters) =>
      ipcRenderer.invoke('transaction:getByCompany', companyId, filters),
    getByProject: (projectId: number, filters?: TransactionFilters) =>
      ipcRenderer.invoke('transaction:getByProject', projectId, filters),
    create: (data: unknown) => ipcRenderer.invoke('transaction:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('transaction:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('transaction:delete', id),
    save: (request: unknown) => ipcRenderer.invoke('transaction:save', request),
    getMatchCandidates: (request: unknown) =>
      ipcRenderer.invoke('transaction:getMatchCandidates', request),
    getAllocationsForPayment: (paymentId: number) =>
      ipcRenderer.invoke('transaction:getAllocationsForPayment', paymentId),
    getAllocationsForInvoice: (invoiceId: number) =>
      ipcRenderer.invoke('transaction:getAllocationsForInvoice', invoiceId),
  },

  review: {
    getStatus: () => ipcRenderer.invoke('review:getStatus'),
    getReport: () => ipcRenderer.invoke('review:getReport'),
    applyRepairs: (request: unknown) => ipcRenderer.invoke('review:applyRepairs', request),
    applyRates: (request: unknown) => ipcRenderer.invoke('review:applyRates', request),
    applyAllocationFixes: (request: unknown) =>
      ipcRenderer.invoke('review:applyAllocationFixes', request),
    applyUnmatched: (request: unknown) => ipcRenderer.invoke('review:applyUnmatched', request),
    complete: () => ipcRenderer.invoke('review:complete'),
  },

  material: {
    getAll: () => ipcRenderer.invoke('material:getAll'),
    create: (data: unknown) => ipcRenderer.invoke('material:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('material:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('material:delete', id),
    generateCode: () => ipcRenderer.invoke('material:generateCode'),
  },

  stock: {
    getAll: (filters?: StockMovementFilters) => ipcRenderer.invoke('stock:getAll', filters),
    create: (data: unknown) => ipcRenderer.invoke('stock:create', data),
    delete: (id: number) => ipcRenderer.invoke('stock:delete', id),
  },

  category: {
    getAll: () => ipcRenderer.invoke('category:getAll'),
    create: (data: unknown) => ipcRenderer.invoke('category:create', data),
    delete: (id: number) => ipcRenderer.invoke('category:delete', id),
  },

  trash: {
    getAll: () => ipcRenderer.invoke('trash:getAll'),
    restore: (id: number) => ipcRenderer.invoke('trash:restore', id),
    permanentDelete: (id: number) => ipcRenderer.invoke('trash:permanentDelete', id),
    empty: () => ipcRenderer.invoke('trash:empty'),
  },

  dashboard: {
    getStats: () => ipcRenderer.invoke('dashboard:getStats'),
    getTopDebtors: (limit: number) => ipcRenderer.invoke('dashboard:getTopDebtors', limit),
    getTopCreditors: (limit: number) => ipcRenderer.invoke('dashboard:getTopCreditors', limit),
  },

  analytics: {
    getMonthlyStats: (year: number) => ipcRenderer.invoke('analytics:getMonthlyStats', year),
    getProjectCategoryBreakdown: (projectId: number) =>
      ipcRenderer.invoke('analytics:getProjectCategoryBreakdown', projectId),
    getCompanyMonthlyStats: (companyId: number, year: number) =>
      ipcRenderer.invoke('analytics:getCompanyMonthlyStats', companyId, year),
    getCashFlowReport: (year: number) => ipcRenderer.invoke('analytics:getCashFlowReport', year),
    getAgingReceivables: () => ipcRenderer.invoke('analytics:getAgingReceivables'),
  },

  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    list: () => ipcRenderer.invoke('backup:list'),
    restore: (backupPath: string) => ipcRenderer.invoke('backup:restore', backupPath),
    openFolder: () => ipcRenderer.invoke('backup:openFolder'),
  },

  export: {
    toExcel: (data: ExportRequest) => ipcRenderer.invoke('export:toExcel', data),
    share: (data: ExportRequest) => ipcRenderer.invoke('export:share', data),
  },

  exchange: {
    getRates: () => ipcRenderer.invoke('exchange:getRates'),
  },

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
  },

  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    print: () => ipcRenderer.invoke('app:print'),
    setLanguage: (locale: string) => ipcRenderer.invoke('app:setLanguage', locale),
    confirmClose: () => ipcRenderer.invoke('app:close-confirmed'),
    cancelClose: () => ipcRenderer.invoke('app:close-cancelled'),
    onCloseRequested: (callback: (payload: { hasPendingChanges: boolean }) => void) => {
      const handler = (_: unknown, p: { hasPendingChanges: boolean }) => callback(p);
      ipcRenderer.on('app:close-requested', handler);
      return () => ipcRenderer.removeListener('app:close-requested', handler);
    },
    onDataChanged: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('db:changed', listener);
      return () => ipcRenderer.removeListener('db:changed', listener);
    },
  },

  sync: {
    getStatus: () => ipcRenderer.invoke('sync:getStatus'),
    check: () => ipcRenderer.invoke('sync:check'),
    resolveConflict: (choice: ConflictChoice) => ipcRenderer.invoke('sync:resolveConflict', choice),
    onStatus: (callback: (status: SyncStatusPayload) => void) => {
      const listener = (_: unknown, payload: SyncStatusPayload) => callback(payload);
      ipcRenderer.on('sync:status', listener);
      return () => ipcRenderer.removeListener('sync:status', listener);
    },
    onConflict: (callback: (payload: SyncConflictPayload) => void) => {
      const listener = (_: unknown, payload: SyncConflictPayload) => callback(payload);
      ipcRenderer.on('sync:conflict', listener);
      return () => ipcRenderer.removeListener('sync:conflict', listener);
    },
    onReloadRequired: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('sync:reload-required', listener);
      return () => ipcRenderer.removeListener('sync:reload-required', listener);
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
