import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.electronAPI for tests
// Mirrors ElectronAPI interface from src/types/electron.d.ts exactly
const mockElectronAPI = {
  company: {
    getAll: vi.fn().mockResolvedValue([]),
    getWithBalance: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue({ id: 1, name: 'Test', code: 'T001' }),
    update: vi.fn().mockResolvedValue({ id: 1, name: 'Test', code: 'T001' }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    getRelatedCounts: vi.fn().mockResolvedValue({ transactionCount: 0, projectCount: 0 }),
  },
  project: {
    getAll: vi.fn().mockResolvedValue([]),
    getWithSummary: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue({ id: 1, name: 'Test', code: 'P001' }),
    update: vi.fn().mockResolvedValue({ id: 1, name: 'Test', code: 'P001' }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    generateCode: vi.fn().mockResolvedValue('P-001'),
    getParties: vi.fn().mockResolvedValue([]),
    addParty: vi.fn().mockResolvedValue({ id: 1, project_id: 1, company_id: 1, role: 'customer' }),
    removeParty: vi.fn().mockResolvedValue({ success: true }),
  },
  transaction: {
    getAll: vi.fn().mockResolvedValue([]),
    getByCompany: vi.fn().mockResolvedValue([]),
    getByProject: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue({ id: 1 }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    getInvoicesForProject: vi.fn().mockResolvedValue([]),
    getInvoicesForCompany: vi.fn().mockResolvedValue([]),
    getInvoicesWithBalance: vi.fn().mockResolvedValue([]),
    setAllocations: vi.fn().mockResolvedValue({ success: true }),
    getAllocationsForPayment: vi.fn().mockResolvedValue([]),
  },
  material: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue({ id: 1, name: 'Test', code: 'M001' }),
    update: vi.fn().mockResolvedValue({ id: 1, name: 'Test', code: 'M001' }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    generateCode: vi.fn().mockResolvedValue('M-001'),
    getLowStock: vi.fn().mockResolvedValue([]),
  },
  stock: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
  category: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 1, name: 'Test', type: 'expense' }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
  trash: {
    getAll: vi.fn().mockResolvedValue([]),
    restore: vi.fn().mockResolvedValue({ success: true }),
    permanentDelete: vi.fn().mockResolvedValue({ success: true }),
    empty: vi.fn().mockResolvedValue({ success: true }),
  },
  dashboard: {
    getStats: vi.fn().mockResolvedValue({
      totalCompanies: 0,
      totalProjects: 0,
      totalTransactions: 0,
    }),
    getRecentTransactions: vi.fn().mockResolvedValue([]),
    getTopDebtors: vi.fn().mockResolvedValue([]),
    getTopCreditors: vi.fn().mockResolvedValue([]),
  },
  analytics: {
    getMonthlyStats: vi.fn().mockResolvedValue([]),
    getProjectCategoryBreakdown: vi.fn().mockResolvedValue([]),
    getCompanyMonthlyStats: vi.fn().mockResolvedValue([]),
    getCashFlowReport: vi.fn().mockResolvedValue([]),
    getAgingReceivables: vi.fn().mockResolvedValue([]),
  },
  backup: {
    create: vi.fn().mockResolvedValue('/path/to/backup.db'),
    list: vi.fn().mockResolvedValue([]),
    restore: vi.fn().mockResolvedValue({ success: true }),
    selectFolder: vi.fn().mockResolvedValue(null),
    openFolder: vi.fn().mockResolvedValue(undefined),
  },
  export: {
    toExcel: vi.fn().mockResolvedValue('/path/to/export.xlsx'),
    toPDF: vi.fn().mockResolvedValue('/path/to/export.pdf'),
  },
  exchange: {
    getRates: vi.fn().mockResolvedValue({ USD: 30, EUR: 32 }),
  },
  gdrive: {
    hasCredentials: vi.fn().mockResolvedValue(false),
    isConnected: vi.fn().mockResolvedValue(false),
    saveCredentials: vi.fn().mockResolvedValue({ success: true }),
    connect: vi.fn().mockResolvedValue({ success: true }),
    disconnect: vi.fn().mockResolvedValue({ success: true }),
    listBackups: vi.fn().mockResolvedValue([]),
    uploadBackup: vi.fn().mockResolvedValue({ success: true }),
    downloadBackup: vi.fn().mockResolvedValue({ success: true }),
    deleteBackup: vi.fn().mockResolvedValue({ success: true }),
  },
  app: {
    getVersion: vi.fn().mockResolvedValue('1.0.0'),
    print: vi.fn().mockResolvedValue({ success: true }),
  },
};

window.electronAPI = mockElectronAPI as unknown as typeof window.electronAPI;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
