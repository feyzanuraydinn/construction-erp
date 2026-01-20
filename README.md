# Construction ERP System

A full-featured desktop ERP application for construction companies. Manage accounts, projects, and inventory with ease.

![Application Preview](construction-erp.gif)

**[Türkçe README](README.tr.md)**

## Features

- **Account Management** - Track companies and current accounts with multi-currency support (TRY, USD, EUR, GBP)
- **Project Management** - Monitor project-based income/expenses with profitability analysis
- **Inventory Control** - Manage materials with stock movements and low-stock alerts
- **Financial Analytics** - Interactive dashboards with charts and statistics
- **Data Import/Export** - Excel (XLSX) support for bulk operations
- **Cloud Backup** - Google Drive integration for secure backup and restore
- **Trash & Recovery** - Soft delete with data recovery option
- **Keyboard Shortcuts** - Quick navigation with customizable shortcuts

## Tech Stack

| Category | Technologies |
|----------|-------------|
| Frontend | React 18, TypeScript, Tailwind CSS |
| Desktop | Electron 28 |
| Database | SQL.js (SQLite via WebAssembly) |
| State | React Query (TanStack Query) |
| Charts | Recharts |
| Validation | Zod |
| Testing | Vitest, Playwright |
| Cloud | Google Drive API |

## Installation

### Prerequisites

- Node.js 18+
- npm 9+

### Development

```bash
# Clone repository
git clone https://github.com/feyzanuraydinn/construction-erp.git
cd construction-erp

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Production Build

```bash
# Build Windows installer
npm run build

# Output: dist/İnşaat ERP Setup {version}.exe
```

## Project Structure

```
src/
├── main/           # Electron main process (IPC, backup, logging)
├── pages/          # Application pages (Dashboard, Projects, etc.)
├── components/     # Reusable UI components
├── database/       # SQL.js database layer
├── hooks/          # Custom React hooks
├── utils/          # Utilities (validation, formatting, constants)
└── types/          # TypeScript definitions
```

## Security

- Context isolation between main and renderer processes
- IPC validation with Zod schemas
- Rate limiting for database operations
- Content Security Policy (CSP) headers
- Parameterized SQL queries
- Encrypted credential storage

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## License

For personal use only.
