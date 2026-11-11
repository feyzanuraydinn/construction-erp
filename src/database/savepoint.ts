import type { Database as SqlJsDatabase } from 'sql.js';

let savepointCounter = 0;

export function runInSavepoint<T>(db: SqlJsDatabase, fn: () => T): T {
  savepointCounter += 1;
  const name = `sp_${savepointCounter}`;
  db.run(`SAVEPOINT ${name}`);
  try {
    const result = fn();
    db.run(`RELEASE ${name}`);
    return result;
  } catch (error) {
    db.run(`ROLLBACK TO ${name}`);
    db.run(`RELEASE ${name}`);
    throw error;
  }
}
