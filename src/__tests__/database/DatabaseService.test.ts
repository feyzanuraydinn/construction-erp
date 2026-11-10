// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import initSqlJs from 'sql.js';
import { DatabaseService, InvalidDatabaseError } from '../../database/DatabaseService';
import { localDateStamp } from '../../database/fileUtils';

let userDataPath: string;
let service: DatabaseService;

function companyNames(db: DatabaseService): string[] {
  const result = db.rawDb.exec('SELECT name FROM companies ORDER BY id');
  return (result[0]?.values ?? []).map((row) => String(row[0]));
}

function insertCompany(db: DatabaseService, name: string): void {
  db.rawDb.run(
    "INSERT INTO companies (type, account_type, name) VALUES ('company', 'customer', ?)",
    [name]
  );
  db.save();
}

beforeEach(async () => {
  userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-db-'));
  service = new DatabaseService();
  await service.init(userDataPath);
});

afterEach(() => {
  service.close();
  fs.rmSync(userDataPath, { recursive: true, force: true });
});

describe('DatabaseService.save', () => {
  it('persists data that survives a reopen', async () => {
    insertCompany(service, 'Acme');
    service.close();

    const reopened = new DatabaseService();
    await reopened.init(userDataPath);
    expect(companyNames(reopened)).toEqual(['Acme']);
    reopened.close();

    service = new DatabaseService();
    await service.init(userDataPath);
  });

  it('leaves no temp files next to the database', () => {
    insertCompany(service, 'Acme');
    expect(fs.readdirSync(path.join(userDataPath, 'data'))).toEqual(['construction-erp.db']);
  });
});

describe('DatabaseService.createBackup', () => {
  it('writes latest_backup.db, its meta file and one archive per day', () => {
    const backupDir = path.join(userDataPath, 'backups');
    insertCompany(service, 'First');
    service.createBackup(backupDir);
    insertCompany(service, 'Second');
    service.createBackup(backupDir);

    expect(fs.existsSync(path.join(backupDir, 'latest_backup.db'))).toBe(true);
    expect(fs.existsSync(path.join(backupDir, 'backup_meta.json'))).toBe(true);

    const archives = fs.readdirSync(path.join(backupDir, 'daily'));
    expect(archives).toEqual([`daily-${localDateStamp()}.db`]);
  });

  it('keeps the first state of the day in the daily archive', async () => {
    const backupDir = path.join(userDataPath, 'backups');
    insertCompany(service, 'Morning');
    service.createBackup(backupDir);
    insertCompany(service, 'Evening');
    service.createBackup(backupDir);

    const SQL = await initSqlJs();
    const archive = new SQL.Database(
      fs.readFileSync(path.join(backupDir, 'daily', `daily-${localDateStamp()}.db`))
    );
    const names = archive.exec('SELECT name FROM companies')[0].values.map((row) => String(row[0]));
    archive.close();
    expect(names).toEqual(['Morning']);
  });
});

describe('DatabaseService.createSafetyCopy', () => {
  it('writes a copy of the current state under backups/safety', () => {
    const backupDir = path.join(userDataPath, 'backups');
    insertCompany(service, 'Acme');
    const copyPath = service.createSafetyCopy(backupDir, 'pre-restore');

    expect(path.dirname(copyPath)).toBe(path.join(backupDir, 'safety'));
    expect(path.basename(copyPath).startsWith('pre-restore-')).toBe(true);
    expect(fs.statSync(copyPath).size).toBeGreaterThan(0);
  });
});

describe('DatabaseService.loadFromBuffer', () => {
  it('rejects an empty buffer and keeps the current data', async () => {
    insertCompany(service, 'Keep me');
    await expect(service.loadFromBuffer(new Uint8Array(0))).rejects.toBeInstanceOf(
      InvalidDatabaseError
    );
    expect(companyNames(service)).toEqual(['Keep me']);
  });

  it('rejects a file that is not a database and keeps the current data', async () => {
    insertCompany(service, 'Keep me');
    const garbage = Buffer.from('<html>error page</html>'.repeat(100));
    await expect(service.loadFromBuffer(garbage)).rejects.toBeInstanceOf(InvalidDatabaseError);
    expect(companyNames(service)).toEqual(['Keep me']);
    // The service must still be usable after a rejected load.
    insertCompany(service, 'Still works');
    expect(companyNames(service)).toEqual(['Keep me', 'Still works']);
  });

  it('rejects a database without the app tables', async () => {
    const SQL = await initSqlJs();
    const other = new SQL.Database();
    other.run('CREATE TABLE unrelated (id INTEGER)');
    const bytes = other.export();
    other.close();

    await expect(service.loadFromBuffer(bytes)).rejects.toBeInstanceOf(InvalidDatabaseError);
  });

  it('loads a valid database and replaces the current data', async () => {
    insertCompany(service, 'Before');
    const snapshot = service.exportBuffer();
    insertCompany(service, 'After');

    await service.loadFromBuffer(snapshot);

    expect(companyNames(service)).toEqual(['Before']);
    // Repositories must point at the new database.
    expect(service.companies.getAll().map((c) => c.name)).toEqual(['Before']);
  });

  it('migrates an older database while loading it', async () => {
    const snapshot = service.exportBuffer();
    const SQL = await initSqlJs();
    const old = new SQL.Database(snapshot);
    // Roll the schema back to version 1 (before payment_allocations and company codes).
    old.run('DROP TABLE payment_allocations');
    old.run('DROP INDEX IF EXISTS idx_companies_code');
    old.run('ALTER TABLE companies DROP COLUMN code');
    old.run('DELETE FROM schema_versions WHERE version >= 2');
    const oldBytes = old.export();
    old.close();

    await service.loadFromBuffer(oldBytes);

    const tables = service.rawDb.exec(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'payment_allocations'"
    );
    expect(tables[0]?.values.length).toBe(1);
  });

  it('writes the loaded database to disk', async () => {
    insertCompany(service, 'Before');
    const snapshot = service.exportBuffer();
    insertCompany(service, 'After');
    await service.loadFromBuffer(snapshot);
    service.close();

    const reopened = new DatabaseService();
    await reopened.init(userDataPath);
    expect(companyNames(reopened)).toEqual(['Before']);
    reopened.close();

    service = new DatabaseService();
    await service.init(userDataPath);
  });
});
