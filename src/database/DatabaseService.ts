import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { dbLogger, type ContextLogger } from '../utils/logger';
import { writeFileAtomic } from './fileUtils';
import { ensureBaseline } from './dataReview';

import { CompanyRepository } from './repositories/CompanyRepository';
import { ProjectRepository } from './repositories/ProjectRepository';
import { TransactionRepository } from './repositories/TransactionRepository';
import { MaterialRepository } from './repositories/MaterialRepository';
import { CategoryRepository } from './repositories/CategoryRepository';
import { AnalyticsRepository } from './repositories/AnalyticsRepository';
import { TrashRepository } from './repositories/TrashRepository';
import { PaymentAllocationRepository } from './repositories/PaymentAllocationRepository';
import { errorText } from '../utils/errorText';
import { prepareSchema } from './service/schema';
import { findDatabaseProblem, foreignKeyCheck } from './service/integrity';
import { writeLatestBackup, writeSafetyCopy } from './service/backupFiles';

export class InvalidDatabaseError extends Error {
  constructor(reason: string) {
    super(`Invalid database file: ${reason}`);
    this.name = 'InvalidDatabaseError';
  }
}

interface Repositories {
  companies: CompanyRepository;
  projects: ProjectRepository;
  transactions: TransactionRepository;
  materials: MaterialRepository;
  categories: CategoryRepository;
  analytics: AnalyticsRepository;
  trash: TrashRepository;
  paymentAllocations: PaymentAllocationRepository;
}

export class DatabaseService {
  private db: SqlJsDatabase | null = null;
  private dbPath: string | null = null;
  private initialized = false;
  private dirty = false;

  private repos: Repositories | null = null;

  constructor(private readonly log: ContextLogger = dbLogger) {}

  private ready(): { db: SqlJsDatabase; repos: Repositories } {
    if (!this.initialized || !this.db || !this.repos) {
      throw new Error('DatabaseService not initialized. Call init() first.');
    }
    return { db: this.db, repos: this.repos };
  }

  get companies(): CompanyRepository {
    return this.ready().repos.companies;
  }

  get projects(): ProjectRepository {
    return this.ready().repos.projects;
  }

  get transactions(): TransactionRepository {
    return this.ready().repos.transactions;
  }

  get materials(): MaterialRepository {
    return this.ready().repos.materials;
  }

  get categories(): CategoryRepository {
    return this.ready().repos.categories;
  }

  get analytics(): AnalyticsRepository {
    return this.ready().repos.analytics;
  }

  get trash(): TrashRepository {
    return this.ready().repos.trash;
  }

  get paymentAllocations(): PaymentAllocationRepository {
    return this.ready().repos.paymentAllocations;
  }

  get rawDb(): SqlJsDatabase {
    return this.ready().db;
  }

  async init(userDataPath: string): Promise<void> {
    if (this.initialized) return;

    const dbDir = path.join(userDataPath, 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.dbPath = path.join(dbDir, 'construction-erp.db');

    const SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
      this.log.info('Database loaded from file');
    } else {
      this.db = new SQL.Database();
      this.log.info('New database created');
    }

    prepareSchema(this.db, this.log);
    this.createRepositories(this.db);

    this.initialized = true;
    if (ensureBaseline(this.db)) this.save();
    this.log.info('DatabaseService initialized successfully');
  }

  private createRepositories(db: SqlJsDatabase): void {
    this.repos = {
      companies: new CompanyRepository(db),
      projects: new ProjectRepository(db),
      transactions: new TransactionRepository(db),
      materials: new MaterialRepository(db),
      categories: new CategoryRepository(db),
      analytics: new AnalyticsRepository(db),
      trash: new TrashRepository(db),
      paymentAllocations: new PaymentAllocationRepository(db),
    };
  }

  private exportBytes(db: SqlJsDatabase): Uint8Array {
    const data = db.export();
    db.run('PRAGMA foreign_keys = ON');
    return data;
  }

  save(): void {
    if (this.db && this.dbPath) {
      writeFileAtomic(this.dbPath, this.exportBytes(this.db));
      this.dirty = true;
      this.log.debug('Database saved to disk');
    }
  }

  getDbPath(): string | null {
    return this.dbPath;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  clearDirty(): void {
    this.dirty = false;
  }

  createBackup(backupDir: string): string {
    const { db } = this.ready();
    return writeLatestBackup(backupDir, () => this.exportBytes(db), this.log);
  }

  createSafetyCopy(backupDir: string, label: string): string {
    const { db } = this.ready();
    return writeSafetyCopy(backupDir, label, () => this.exportBytes(db), this.log);
  }

  checkForeignKeys(): { ok: boolean; violations: unknown[] } {
    return foreignKeyCheck(this.ready().db);
  }

  async loadFromBuffer(buffer: Uint8Array): Promise<void> {
    this.ready();
    const SQL = await initSqlJs();
    const candidate = new SQL.Database(new Uint8Array(buffer));

    try {
      const problem = findDatabaseProblem(candidate);
      if (problem) throw new InvalidDatabaseError(problem);
      prepareSchema(candidate, this.log);
    } catch (error) {
      candidate.close();
      if (error instanceof InvalidDatabaseError) throw error;
      throw new InvalidDatabaseError(errorText(error));
    }

    const previous = this.db;
    this.db = candidate;
    this.createRepositories(candidate);
    previous?.close();
    ensureBaseline(candidate);
    this.save();
    this.log.info('Database loaded from buffer');
  }

  exportBuffer(): Buffer {
    return Buffer.from(this.exportBytes(this.ready().db));
  }

  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
      this.repos = null;
      this.initialized = false;
      this.log.info('Database closed');
    }
  }
}
