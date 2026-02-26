# Construction ERP System

A full-featured desktop ERP application for construction companies. Manage current accounts, projects, stock, and financial transactions from a single interface.

![Application Preview](construction-erp.gif)

**[Türkçe README](README.tr.md)**

## Features

### Core Modules
- **Current Account Management** - Track companies (customer, supplier, subcontractor, investor) with multi-currency support (TRY, USD, EUR)
- **Project Management** - Project-based income/expense tracking, party assignments, profitability analysis
- **Stock & Inventory** - Material management, stock movements (in/out/adjustment/waste), low-stock alerts
- **Financial Transactions** - Invoices, payments, payment-invoice allocations, document tracking
- **Analytics Dashboard** - Interactive charts (bar, pie, line), financial summaries, cash flow analysis

### Additional Features
- **Data Export** - Excel (XLSX) and PDF export for all data tables
- **Cloud Backup** - Google Drive integration with encrypted backup/restore and auto-sync
- **Trash & Recovery** - Soft delete for all entities with one-click recovery
- **Multi-language** - Full Turkish and English support across the entire app (including main process dialogs)
- **Dark Mode** - Light, dark, and system-follow theme options
- **Command Palette** - Quick navigation with Ctrl+K
- **Print Support** - Print-ready views for transactions and reports
- **Auto Updates** - Built-in update checker with download and install

## Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | React 18, TypeScript (strict), Tailwind CSS 3 |
| Desktop | Electron 40 |
| Database | SQL.js (SQLite via WebAssembly) |
| Build | Vite 7 |
| Charts | Recharts 2 |
| Forms | React Hook Form 7 + Zod 4 |
| i18n | i18next + react-i18next |
| Testing | Vitest (692 unit tests, 45 files), Playwright (E2E) |
| Cloud | Google Drive API (@googleapis/drive) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Development

```bash
git clone https://github.com/feyzanuraydinn/construction-erp.git
cd construction-erp
npm install
npm run dev
```

### Production Build

```bash
# Full build: compile + package + installer
npm run build

# Output: dist/Construction ERP Setup 3.0.0.exe
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development mode (Vite + Electron) |
| `npm run build` | Full production build with installer |
| `npm run build:react` | Build React frontend only (Vite) |
| `npm run build:electron` | Build Electron main process only |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:ui` | Open Vitest UI |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## Architecture

### Project Structure

```
src/
├── main/                    # Electron main process
│   ├── ipc/                 # 12 IPC handler modules
│   │   ├── safeHandle.ts    # Error-sanitizing IPC wrapper
│   │   ├── appHandlers.ts
│   │   ├── companyHandlers.ts
│   │   ├── projectHandlers.ts
│   │   ├── transactionHandlers.ts
│   │   ├── materialHandlers.ts
│   │   ├── exportHandlers.ts
│   │   ├── gdriveHandlers.ts
│   │   ├── backupHandlers.ts
│   │   ├── categoryHandlers.ts
│   │   ├── dashboardHandlers.ts
│   │   └── trashHandlers.ts
│   ├── i18n.ts              # Main process i18n (shared locale files)
│   ├── googleDrive.ts       # Google Drive OAuth2 & sync
│   ├── autoUpdater.ts       # Auto-update manager
│   ├── preload.ts           # Context bridge (renderer ↔ main)
│   └── main.ts              # App entry point
├── pages/                   # 11 pages (all lazy-loaded)
│   ├── Dashboard.tsx
│   ├── Companies.tsx
│   ├── CompanyDetail.tsx
│   ├── CompanyAccount.tsx
│   ├── Projects.tsx
│   ├── ProjectDetail.tsx
│   ├── Transactions.tsx
│   ├── Stock.tsx
│   ├── Analytics.tsx
│   ├── Settings.tsx
│   ├── Trash.tsx
│   ├── analytics-components/
│   ├── transactions-components/
│   └── project-detail/
├── components/
│   ├── ui/                  # 15 UI primitives
│   ├── modals/              # 6 CRUD modals
│   └── shared/              # Sidebar, Layout, PrintView
├── database/
│   ├── DatabaseService.ts   # SQLite init, migrations
│   └── repositories/        # 8 specialized repositories
│       ├── BaseRepository.ts
│       ├── CompanyRepository.ts
│       ├── ProjectRepository.ts
│       ├── TransactionRepository.ts
│       ├── MaterialRepository.ts
│       ├── CategoryRepository.ts
│       ├── AnalyticsRepository.ts
│       ├── TrashRepository.ts
│       └── PaymentAllocationRepository.ts
├── hooks/                   # 10 custom hooks
│   ├── useCRUDPage.ts       # Generic CRUD page logic
│   ├── useTransactionList.ts
│   ├── useDataCache.ts      # LRU cache (100 entries, 5min TTL)
│   ├── usePagination.ts
│   ├── useSelection.ts
│   ├── useBulkDelete.ts
│   ├── useExport.ts
│   ├── usePrint.ts
│   ├── useKeyboardShortcuts.ts
│   └── useDebounce.ts
├── contexts/                # Toast, Theme
├── i18n/
│   └── locales/             # tr.json, en.json (~1200 keys each)
├── utils/
│   ├── schemas.ts           # 11 Zod validation schemas
│   ├── formatters.ts
│   ├── security.ts
│   ├── exportUtils.ts
│   ├── financials.ts
│   ├── transactionHelpers.ts
│   └── constants.ts
└── types/                   # Central TypeScript definitions
```

### Design Patterns

- **Repository Pattern** - `BaseRepository` with 8 specialized repositories for isolated data access
- **Generic CRUD Hook** - `useCRUDPage<T>` shared across Companies, Projects, Stock pages
- **Error Sanitization** - `safeHandle` IPC wrapper strips internal DB details from error messages
- **Lazy Loading** - All 11 pages via `React.lazy` with per-page `ErrorBoundary`
- **LRU Cache** - `useDataCache` with 100-entry max and 5-minute TTL
- **Schema-Driven Types** - Form types derived from Zod schemas (`z.input<>` / `z.infer<>`)

## Security

- **Context Isolation** - `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- **Content Security Policy** - Strict CSP in production, relaxed in development
- **Parameterized Queries** - All SQL queries use `?` placeholders (SQL injection prevention)
- **Error Sanitization** - `safeHandle` wrapper prevents DB schema leakage to renderer
- **Input Validation** - All user input validated with Zod schemas before processing
- **Path Traversal Prevention** - File path validation for Google Drive operations
- **Secure IPC** - All communication through `contextBridge.exposeInMainWorld`

## Testing

```bash
npm test                # Unit tests (692 tests, 45 files)
npm run test:e2e        # E2E tests (Playwright)
npm run test:coverage   # Coverage report
npm run test:ui         # Vitest interactive UI
```

### Coverage

| Metric | Value | Threshold |
|--------|-------|-----------|
| Statements | 61.7% | 55% |
| Branches | 61.7% | 55% |
| Functions | 52.8% | 45% |
| Lines | 63.2% | 55% |

### Test Categories

| Category | Tests |
|----------|-------|
| UI Components | 174 |
| Pages | 148 |
| Hooks | 125 |
| Modals | 93 |
| Utils & Schemas | 98 |
| Database & Main | 49 |
| E2E Suites | 6 |

## License

For personal use only.
