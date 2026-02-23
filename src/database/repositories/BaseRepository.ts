import type { Database as SqlJsDatabase } from 'sql.js';

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

export abstract class BaseRepository<T> {
  constructor(
    protected db: SqlJsDatabase,
    protected tableName: string
  ) {}

  protected query<R = T>(sql: string, params?: unknown[]): R[] {
    const stmt = this.db.prepare(sql);
    if (params) stmt.bind(params);
    const results: R[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as R);
    }
    stmt.free();
    return results;
  }

  protected queryOne<R = T>(sql: string, params?: unknown[]): R | undefined {
    const results = this.query<R>(sql, params);
    return results[0];
  }

  protected run(sql: string, params?: unknown[]): RunResult {
    this.db.run(sql, params as (string | number | Uint8Array | null)[]);
    const changes = this.db.getRowsModified();
    const lastId = this.queryOne<{ id: number }>('SELECT last_insert_rowid() as id');
    return { changes, lastInsertRowid: lastId?.id || 0 };
  }

  getAll(includeInactive = false): T[] {
    const where = includeInactive ? '' : ' WHERE is_active = 1';
    return this.query<T>(`SELECT * FROM ${this.tableName}${where} ORDER BY created_at DESC`);
  }

  getById(id: number): T | undefined {
    return this.queryOne<T>(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  abstract delete(id: number): { success: boolean };
}
