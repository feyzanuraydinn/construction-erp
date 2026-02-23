/**
 * Database Service
 *
 * A unified service that provides access to all database repositories.
 * This serves as the main entry point for database operations.
 *
 * @module DatabaseService
 *
 * @example
 * ```typescript
 * import { DatabaseService } from './DatabaseService';
 *
 * // Initialize
 * const dbService = new DatabaseService();
 * await dbService.init(userDataPath);
 *
 * // Use repositories
 * const companies = dbService.companies.getWithBalance();
 * const projects = dbService.projects.getWithSummary();
 * const stats = dbService.analytics.getDashboardStats();
 * ```
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { dbLogger } from '../utils/logger';

// Import repositories
import {
  CompanyRepository,
  ProjectRepository,
  TransactionRepository,
  MaterialRepository,
  CategoryRepository,
  AnalyticsRepository,
  TrashRepository,
  PaymentAllocationRepository,
} from './repositories';

/**
 * Unified database service with repository access
 */
export class DatabaseService {
  private db: SqlJsDatabase | null = null;
  private dbPath: string | null = null;
  private initialized = false;
  private dirty = false;

  // Repositories
  private _companies: CompanyRepository | null = null;
  private _projects: ProjectRepository | null = null;
  private _transactions: TransactionRepository | null = null;
  private _materials: MaterialRepository | null = null;
  private _categories: CategoryRepository | null = null;
  private _analytics: AnalyticsRepository | null = null;
  private _trash: TrashRepository | null = null;
  private _paymentAllocations: PaymentAllocationRepository | null = null;

  /**
   * Company repository for customer/supplier operations
   */
  get companies(): CompanyRepository {
    this.ensureInitialized();
    return this._companies!;
  }

  /**
   * Project repository for project management
   */
  get projects(): ProjectRepository {
    this.ensureInitialized();
    return this._projects!;
  }

  /**
   * Transaction repository for financial operations
   */
  get transactions(): TransactionRepository {
    this.ensureInitialized();
    return this._transactions!;
  }

  /**
   * Material repository for inventory management
   */
  get materials(): MaterialRepository {
    this.ensureInitialized();
    return this._materials!;
  }

  /**
   * Category repository for transaction categories
   */
  get categories(): CategoryRepository {
    this.ensureInitialized();
    return this._categories!;
  }

  /**
   * Analytics repository for dashboard and reports
   */
  get analytics(): AnalyticsRepository {
    this.ensureInitialized();
    return this._analytics!;
  }

  /**
   * Trash repository for deleted items
   */
  get trash(): TrashRepository {
    this.ensureInitialized();
    return this._trash!;
  }

  /**
   * Payment allocation repository for invoice-payment matching
   */
  get paymentAllocations(): PaymentAllocationRepository {
    this.ensureInitialized();
    return this._paymentAllocations!;
  }

  /**
   * Raw database access (for advanced operations)
   */
  get rawDb(): SqlJsDatabase {
    this.ensureInitialized();
    return this.db!;
  }

  /**
   * Initialize the database service
   */
  async init(userDataPath: string): Promise<void> {
    if (this.initialized) return;

    const dbDir = path.join(userDataPath, 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.dbPath = path.join(dbDir, 'insaat-erp.db');

    const SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
      dbLogger.info('Database loaded from file', 'DatabaseService');
    } else {
      this.db = new SQL.Database();
      dbLogger.info('New database created', 'DatabaseService');
    }

    // Enable foreign key constraints (SQLite default: OFF)
    this.db.run('PRAGMA foreign_keys = ON');
    dbLogger.info('Foreign key constraints enabled', 'DatabaseService');

    // Initialize tables, run migrations, and seed default data
    this.initializeTables();
    this.initializeDefaultCategories();

    // Initialize repositories
    this._companies = new CompanyRepository(this.db);
    this._projects = new ProjectRepository(this.db);
    this._transactions = new TransactionRepository(this.db);
    this._materials = new MaterialRepository(this.db);
    this._categories = new CategoryRepository(this.db);
    this._analytics = new AnalyticsRepository(this.db);
    this._trash = new TrashRepository(this.db);
    this._paymentAllocations = new PaymentAllocationRepository(this.db);

    this.initialized = true;
    dbLogger.info('DatabaseService initialized successfully', 'DatabaseService');
  }

  /**
   * Save database to disk
   */
  save(): void {
    if (this.db && this.dbPath) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
      this.dirty = true;
      dbLogger.debug('Database saved to disk', 'DatabaseService');
    }
  }

  /**
   * Check if there are unbacked changes since last backup
   */
  isDirty(): boolean {
    return this.dirty;
  }

  /**
   * Clear the dirty flag (call after backup)
   */
  clearDirty(): void {
    this.dirty = false;
  }

  /**
   * Begin a transaction
   */
  beginTransaction(): void {
    this.ensureInitialized();
    this.db!.run('BEGIN TRANSACTION');
  }

  /**
   * Commit a transaction
   */
  commit(): void {
    this.ensureInitialized();
    this.db!.run('COMMIT');
    this.save();
  }

  /**
   * Rollback a transaction
   */
  rollback(): void {
    this.ensureInitialized();
    this.db!.run('ROLLBACK');
  }

  /**
   * Execute a callback within a transaction
   */
  async withTransaction<T>(callback: () => T | Promise<T>): Promise<T> {
    this.beginTransaction();
    try {
      const result = await callback();
      this.commit();
      return result;
    } catch (error) {
      this.rollback();
      throw error;
    }
  }

  /**
   * Check database integrity
   */
  checkIntegrity(): { ok: boolean; error?: string } {
    this.ensureInitialized();
    try {
      const result = this.db!.exec('PRAGMA integrity_check');
      if (result.length > 0 && result[0].values.length > 0) {
        const status = result[0].values[0][0] as string;
        if (status === 'ok') {
          return { ok: true };
        }
        return { ok: false, error: status };
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }

  /**
   * Get database statistics
   */
  getStats(): { tables: Record<string, number>; size: number } {
    this.ensureInitialized();
    const tables: Record<string, number> = {};
    const tableNames = [
      'companies',
      'projects',
      'transactions',
      'materials',
      'stock_movements',
      'categories',
      'project_parties',
      'trash',
      'payment_allocations',
    ];

    for (const table of tableNames) {
      try {
        const result = this.db!.exec(`SELECT COUNT(*) FROM ${table}`);
        tables[table] = result[0]?.values[0]?.[0] as number ?? 0;
      } catch {
        tables[table] = 0;
      }
    }

    let size = 0;
    if (this.db) {
      const data = this.db.export();
      size = data.length;
    }

    return { tables, size };
  }

  /**
   * Create a backup
   */
  createBackup(backupDir: string): string {
    this.ensureInitialized();

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, 'latest_backup.db');
    const data = this.db!.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(backupPath, buffer);

    const metaPath = path.join(backupDir, 'backup_meta.json');
    fs.writeFileSync(
      metaPath,
      JSON.stringify(
        {
          lastBackup: new Date().toISOString(),
          size: buffer.length,
        },
        null,
        2
      )
    );

    dbLogger.info(`Backup created: ${backupPath}`, 'DatabaseService');
    return backupPath;
  }

  /**
   * Get backup info
   */
  getBackupInfo(backupDir: string): { exists: boolean; date?: string; size?: number } {
    const backupPath = path.join(backupDir, 'latest_backup.db');
    const metaPath = path.join(backupDir, 'backup_meta.json');
    if (!fs.existsSync(backupPath)) return { exists: false };
    try {
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        return { exists: true, date: meta.lastBackup, size: meta.size };
      }
      const stat = fs.statSync(backupPath);
      return { exists: true, size: stat.size };
    } catch {
      return { exists: true };
    }
  }

  /**
   * Check foreign key constraint violations
   */
  checkForeignKeys(): { ok: boolean; violations: unknown[] } {
    this.ensureInitialized();
    try {
      const stmt = this.db!.prepare('PRAGMA foreign_key_check');
      const violations: unknown[] = [];
      while (stmt.step()) {
        violations.push(stmt.getAsObject());
      }
      stmt.free();
      return { ok: violations.length === 0, violations };
    } catch {
      return { ok: true, violations: [] };
    }
  }

  /**
   * Load database from a buffer (for restore from backup)
   */
  async loadFromBuffer(buffer: Buffer): Promise<void> {
    this.ensureInitialized();
    const SQL = await initSqlJs();
    this.db = new SQL.Database(new Uint8Array(buffer));
    this.db.run('PRAGMA foreign_keys = ON');
    // Re-initialize repositories with new db instance
    this._companies = new CompanyRepository(this.db);
    this._projects = new ProjectRepository(this.db);
    this._transactions = new TransactionRepository(this.db);
    this._materials = new MaterialRepository(this.db);
    this._categories = new CategoryRepository(this.db);
    this._analytics = new AnalyticsRepository(this.db);
    this._trash = new TrashRepository(this.db);
    this._paymentAllocations = new PaymentAllocationRepository(this.db);
    this.save();
    dbLogger.info('Database loaded from buffer', 'DatabaseService');
  }

  /**
   * Export database as buffer
   */
  exportBuffer(): Buffer {
    this.ensureInitialized();
    return Buffer.from(this.db!.export());
  }

  /**
   * Close the database
   */
  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
      this.initialized = false;
      dbLogger.info('Database closed', 'DatabaseService');
    }
  }

  /**
   * Initialize database tables and indexes
   */
  private initializeTables(): void {
    this.db!.exec(`
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

    this.db!.exec(`
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

    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('invoice_out', 'invoice_in', 'payment')),
        color TEXT DEFAULT '#6366f1', is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db!.exec(`
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

    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, category TEXT, unit TEXT NOT NULL,
        min_stock DECIMAL(15,2) DEFAULT 0, current_stock DECIMAL(15,2) DEFAULT 0,
        notes TEXT, is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db!.exec(`
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

    this.db!.exec(`
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

    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS trash (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL, data TEXT NOT NULL,
        deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    this.db!.exec(`
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

    // Run migrations
    this.runMigrations();
  }

  private runMigrations(): void {
    // Create schema_versions table for tracking applied migrations
    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const getVersion = (): number => {
      const result = this.db!.exec('SELECT COALESCE(MAX(version), 0) as v FROM schema_versions');
      return result.length > 0 && result[0].values.length > 0 ? (result[0].values[0][0] as number) : 0;
    };

    const applyMigration = (version: number, name: string, sql: string): void => {
      const current = getVersion();
      if (current >= version) return;
      this.db!.exec(sql);
      this.db!.run(`INSERT INTO schema_versions (version, name) VALUES (?, ?)`, [version, name]);
      dbLogger.info(`Migration ${version} applied: ${name}`, 'DatabaseService');
    };

    // Handle pre-existing databases that already have these columns/tables but no schema_versions
    if (getVersion() === 0) {
      const stmt = this.db!.prepare('PRAGMA table_info(transactions)');
      const columns: string[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject() as { name: string };
        columns.push(row.name);
      }
      stmt.free();

      if (columns.includes('linked_invoice_id')) {
        this.db!.run(`INSERT INTO schema_versions (version, name) VALUES (?, ?)`, [1, 'add_linked_invoice_id (retroactive)']);
      }

      const hasTable = this.db!.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='payment_allocations'");
      if (hasTable.length > 0 && hasTable[0].values.length > 0) {
        this.db!.run(`INSERT INTO schema_versions (version, name) VALUES (?, ?)`, [2, 'create_payment_allocations (retroactive)']);
      }
    }

    // ---- Migration 1: Add linked_invoice_id ----
    applyMigration(1, 'add_linked_invoice_id', `
      ALTER TABLE transactions ADD COLUMN linked_invoice_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_transactions_linked_invoice ON transactions(linked_invoice_id);
    `);

    // ---- Migration 2: Create payment_allocations table ----
    applyMigration(2, 'create_payment_allocations', `
      CREATE TABLE IF NOT EXISTS payment_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id INTEGER NOT NULL,
        invoice_id INTEGER NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (invoice_id) REFERENCES transactions(id) ON DELETE CASCADE,
        UNIQUE(payment_id, invoice_id)
      );
      CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON payment_allocations(payment_id);
      CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice ON payment_allocations(invoice_id);
      INSERT OR IGNORE INTO payment_allocations (payment_id, invoice_id, amount)
        SELECT id, linked_invoice_id, COALESCE(amount_try, amount)
        FROM transactions
        WHERE linked_invoice_id IS NOT NULL;
    `);
  }

  private initializeDefaultCategories(): void {
    const stmt = this.db!.prepare('SELECT COUNT(*) as count FROM categories');
    stmt.step();
    const result = stmt.getAsObject() as { count: number };
    stmt.free();
    if (result.count > 0) return;

    const categories = [
      { name: 'Daire/Konut Satışı', type: 'invoice_out', color: '#22c55e' },
      { name: 'Dükkan/Ofis Satışı', type: 'invoice_out', color: '#10b981' },
      { name: 'Arsa Satışı', type: 'invoice_out', color: '#14b8a6' },
      { name: 'Kira Geliri', type: 'invoice_out', color: '#06b6d4' },
      { name: 'Hakediş Faturası', type: 'invoice_out', color: '#3b82f6' },
      { name: 'Hizmet Geliri', type: 'invoice_out', color: '#6366f1' },
      { name: 'Diğer Gelir', type: 'invoice_out', color: '#84cc16' },
      { name: 'Arsa Maliyeti', type: 'invoice_in', color: '#ef4444' },
      { name: 'Hafriyat', type: 'invoice_in', color: '#f97316' },
      { name: 'Beton', type: 'invoice_in', color: '#84cc16' },
      { name: 'Demir/Çelik', type: 'invoice_in', color: '#64748b' },
      { name: 'İşçilik', type: 'invoice_in', color: '#8b5cf6' },
      { name: 'Kalıp/İskele', type: 'invoice_in', color: '#a855f7' },
      { name: 'Elektrik Malzeme', type: 'invoice_in', color: '#eab308' },
      { name: 'Sıhhi Tesisat', type: 'invoice_in', color: '#06b6d4' },
      { name: 'Boya/Kaplama', type: 'invoice_in', color: '#ec4899' },
      { name: 'Seramik/Fayans', type: 'invoice_in', color: '#14b8a6' },
      { name: 'Kapı/Pencere', type: 'invoice_in', color: '#f59e0b' },
      { name: 'Çatı/İzolasyon', type: 'invoice_in', color: '#78716c' },
      { name: 'Peyzaj', type: 'invoice_in', color: '#22c55e' },
      { name: 'Proje/Ruhsat', type: 'invoice_in', color: '#6366f1' },
      { name: 'Taşeron Faturası', type: 'invoice_in', color: '#0ea5e9' },
      { name: 'Nakliye', type: 'invoice_in', color: '#f43f5e' },
      { name: 'Ofis Kirası', type: 'invoice_in', color: '#ef4444' },
      { name: 'Elektrik/Su/Doğalgaz', type: 'invoice_in', color: '#f97316' },
      { name: 'Personel Maaşları', type: 'invoice_in', color: '#8b5cf6' },
      { name: 'SGK Primleri', type: 'invoice_in', color: '#a855f7' },
      { name: 'Vergi', type: 'invoice_in', color: '#ef4444' },
      { name: 'Muhasebe/Danışmanlık', type: 'invoice_in', color: '#6366f1' },
      { name: 'Araç Giderleri', type: 'invoice_in', color: '#64748b' },
      { name: 'Diğer Gider', type: 'invoice_in', color: '#71717a' },
      { name: 'Nakit', type: 'payment', color: '#22c55e' },
      { name: 'EFT/Havale', type: 'payment', color: '#3b82f6' },
      { name: 'Çek', type: 'payment', color: '#f59e0b' },
      { name: 'Senet', type: 'payment', color: '#f97316' },
      { name: 'Kredi Kartı', type: 'payment', color: '#8b5cf6' },
      { name: 'Takas/Mahsup', type: 'payment', color: '#64748b' },
    ];

    this.db!.run('BEGIN TRANSACTION');
    try {
      for (const cat of categories) {
        this.db!.run('INSERT INTO categories (name, type, color, is_default) VALUES (?, ?, ?, 1)', [cat.name, cat.type, cat.color]);
      }
      this.db!.run('COMMIT');
    } catch (error) {
      this.db!.run('ROLLBACK');
      console.error('Error initializing categories:', error);
    }
  }

  /**
   * Ensure the database is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error('DatabaseService not initialized. Call init() first.');
    }
  }
}

export default DatabaseService;
