import type { Database as SqlJsDatabase } from 'sql.js';
import { queryRows } from '../../sqlQuery';

export function inList(ids: number[]): string {
  return ids.length > 0 ? `(${ids.map(() => '?').join(', ')})` : '(NULL)';
}

export function toSqlValue(value: unknown): string | number | null {
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

function tableColumns(db: SqlJsDatabase, table: string): Set<string> {
  return new Set(
    queryRows<{ name: unknown }>(db, `PRAGMA table_info(${table})`).map((row) => String(row.name))
  );
}

export function createColumnLookup(db: SqlJsDatabase): (table: string) => Set<string> {
  const columnsByTable = new Map<string, Set<string>>();
  return (table) => {
    let columns = columnsByTable.get(table);
    if (!columns) {
      columns = tableColumns(db, table);
      columnsByTable.set(table, columns);
    }
    return columns;
  };
}
