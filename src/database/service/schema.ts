import type { Database as SqlJsDatabase } from 'sql.js';
import type { ContextLogger } from '../../utils/logger';
import { runMigrations } from './migrations';
import { seedDefaultCategories } from './defaultCategories';

export function prepareSchema(db: SqlJsDatabase, log: ContextLogger): void {
  db.run('PRAGMA foreign_keys = ON');
  createTables(db);
  runMigrations(db, log);
  seedDefaultCategories(db, log);
}

function createTables(db: SqlJsDatabase): void {
  db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('person', 'company')),
        account_type TEXT NOT NULL CHECK(account_type IN ('customer', 'supplier', 'subcontractor', 'investor')),
        name TEXT NOT NULL,
        tc_number TEXT, profession TEXT, tax_office TEXT, tax_number TEXT, trade_registry_no TEXT,
        contact_person TEXT, phone TEXT, email TEXT, address TEXT, bank_name TEXT, iban TEXT, notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

  db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
        ownership_type TEXT NOT NULL CHECK(ownership_type IN ('own', 'client')),
        client_company_id INTEGER,
        status TEXT NOT NULL CHECK(status IN ('planned', 'active', 'completed', 'cancelled')) DEFAULT 'planned',
        project_type TEXT CHECK(project_type IN ('residential', 'villa', 'commercial', 'mixed', 'infrastructure', 'renovation')),
        location TEXT, total_area DECIMAL(15,2), unit_count INTEGER, estimated_budget DECIMAL(15,2),
        planned_start DATE, planned_end DATE, actual_start DATE, actual_end DATE,
        description TEXT, is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_company_id) REFERENCES companies(id) ON DELETE SET NULL
      )
    `);

  db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('invoice_out', 'invoice_in', 'payment')),
        color TEXT DEFAULT '#6366f1', is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

  db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scope TEXT NOT NULL CHECK(scope IN ('cari', 'project', 'company')),
        company_id INTEGER, project_id INTEGER,
        type TEXT NOT NULL CHECK(type IN ('invoice_out', 'payment_in', 'invoice_in', 'payment_out')),
        category_id INTEGER, date DATE NOT NULL, description TEXT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency TEXT DEFAULT 'TRY' CHECK(currency IN ('TRY', 'USD', 'EUR')),
        exchange_rate DECIMAL(10,4) DEFAULT 1, amount_try DECIMAL(15,2),
        document_no TEXT, linked_invoice_id INTEGER, notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (linked_invoice_id) REFERENCES transactions(id) ON DELETE SET NULL
      )
    `);

  db.exec(`
      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, category TEXT, unit TEXT NOT NULL,
        min_stock DECIMAL(15,2) DEFAULT 0, current_stock DECIMAL(15,2) DEFAULT 0,
        notes TEXT, is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

  db.exec(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL CHECK(movement_type IN ('in', 'out', 'adjustment', 'waste')),
        quantity DECIMAL(15,2) NOT NULL, unit_price DECIMAL(15,2), total_price DECIMAL(15,2),
        project_id INTEGER, company_id INTEGER,
        date DATE NOT NULL, description TEXT, document_no TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
      )
    `);

  db.exec(`
      CREATE TABLE IF NOT EXISTS project_parties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL, company_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('customer', 'supplier', 'subcontractor', 'investor')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        UNIQUE(project_id, company_id, role)
      )
    `);

  db.exec(`
      CREATE TABLE IF NOT EXISTS trash (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL, data TEXT NOT NULL,
        deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

  db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_project ON transactions(project_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_scope ON transactions(scope);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_company_date ON transactions(company_id, date);
      CREATE INDEX IF NOT EXISTS idx_transactions_project_type ON transactions(project_id, type);
      CREATE INDEX IF NOT EXISTS idx_companies_account_type ON companies(account_type);
      CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);
      CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
      CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);
      CREATE INDEX IF NOT EXISTS idx_projects_ownership ON projects(ownership_type);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_material ON stock_movements(material_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
      CREATE INDEX IF NOT EXISTS idx_project_parties_project ON project_parties(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_parties_company ON project_parties(company_id);
      CREATE INDEX IF NOT EXISTS idx_materials_is_active ON materials(is_active);
      CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
    `);
}
