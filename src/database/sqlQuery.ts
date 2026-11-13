import type { Database as SqlJsDatabase } from 'sql.js';

export function queryRows<R>(db: SqlJsDatabase, sql: string, params: unknown[] = []): R[] {
  const stmt = db.prepare(sql);
  try {
    if (params.length > 0) stmt.bind(params);
    const rows: R[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as R);
    return rows;
  } finally {
    stmt.free();
  }
}
