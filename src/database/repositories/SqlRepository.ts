import type { Database as SqlJsDatabase } from 'sql.js';
import { queryRows } from '../sqlQuery';

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

export abstract class SqlRepository<D = unknown> {
  constructor(protected db: SqlJsDatabase) {}

  protected query<R = D>(sql: string, params?: unknown[]): R[] {
    return queryRows<R>(this.db, sql, params);
  }

  protected queryOne<R = D>(sql: string, params?: unknown[]): R | undefined {
    return this.query<R>(sql, params)[0];
  }

  protected requireRow<R>(row: R | undefined): R {
    if (row === undefined) throw new Error('Saved row could not be read back');
    return row;
  }

  protected run(sql: string, params?: unknown[]): RunResult {
    this.db.run(sql, params);
    const changes = this.db.getRowsModified();
    const lastId = this.queryOne<{ id: number }>('SELECT last_insert_rowid() as id');
    return { changes, lastInsertRowid: lastId?.id || 0 };
  }
}
