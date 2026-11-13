import type { Database as SqlJsDatabase } from 'sql.js';
import { dbLogger } from '../utils/logger';

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
    try {
      db.run(`ROLLBACK TO ${name}`);
      db.run(`RELEASE ${name}`);
    } catch (rollbackError) {
      dbLogger.error(`Savepoint ${name} rollback failed`, rollbackError);
    }
    throw error;
  }
}
