import type { Database as SqlJsDatabase } from 'sql.js';
import type { ContextLogger } from '../../utils/logger';
import { queryRows } from '../sqlQuery';
import { tryAmountSql } from '../sqlFragments';

export function runMigrations(db: SqlJsDatabase, log: ContextLogger): void {
  db.exec(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

  const getVersion = (): number => {
    const result = db.exec('SELECT COALESCE(MAX(version), 0) as v FROM schema_versions');
    const version = result[0]?.values[0]?.[0];
    return typeof version === 'number' ? version : 0;
  };

  const applyMigration = (version: number, name: string, sql: string): void => {
    const current = getVersion();
    if (current >= version) return;
    db.exec(sql);
    db.run(`INSERT INTO schema_versions (version, name) VALUES (?, ?)`, [version, name]);
    log.info(`Migration ${version} applied: ${name}`);
  };

  if (getVersion() === 0) {
    const columns = queryRows<{ name: unknown }>(db, 'PRAGMA table_info(transactions)').map(
      (column) => String(column.name)
    );

    if (columns.includes('linked_invoice_id')) {
      db.run(`INSERT INTO schema_versions (version, name) VALUES (?, ?)`, [
        1,
        'add_linked_invoice_id (retroactive)',
      ]);
    }

    const hasTable = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='payment_allocations'"
    );
    if (hasTable.length > 0 && hasTable[0].values.length > 0) {
      db.run(`INSERT INTO schema_versions (version, name) VALUES (?, ?)`, [
        2,
        'create_payment_allocations (retroactive)',
      ]);
    }
  }

  applyMigration(
    1,
    'add_linked_invoice_id',
    `
      ALTER TABLE transactions ADD COLUMN linked_invoice_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_transactions_linked_invoice ON transactions(linked_invoice_id);
    `
  );

  applyMigration(
    2,
    'create_payment_allocations',
    `
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
        SELECT id, linked_invoice_id, ${tryAmountSql()}
        FROM transactions
        WHERE linked_invoice_id IS NOT NULL;
    `
  );

  applyMigration(
    3,
    'add_company_code',
    `
      ALTER TABLE companies ADD COLUMN code TEXT;
    `
  );

  if (getVersion() === 3) {
    const hasNullCodes = db.exec(`SELECT COUNT(*) as c FROM companies WHERE code IS NULL`);
    if (Number(hasNullCodes[0]?.values[0]?.[0] ?? 0) > 0) {
      db.exec(`UPDATE companies SET code = 'CRH-' || printf('%03d', id) WHERE code IS NULL`);
    }
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_code ON companies(code)`);
  }

  applyMigration(
    4,
    'create_app_meta',
    `
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `
  );
}
