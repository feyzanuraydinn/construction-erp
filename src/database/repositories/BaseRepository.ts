import type { Database as SqlJsDatabase } from 'sql.js';
import { SqlRepository } from './SqlRepository';

export abstract class BaseRepository<T> extends SqlRepository<T> {
  constructor(
    db: SqlJsDatabase,
    protected tableName: string
  ) {
    super(db);
  }

  getAll(includeInactive = false): T[] {
    const where = includeInactive ? '' : ' WHERE is_active = 1';
    return this.query<T>(`SELECT * FROM ${this.tableName}${where} ORDER BY created_at DESC`);
  }

  getById(id: number): T | undefined {
    return this.queryOne<T>(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  protected nextCode(prefix: string): string {
    const start = prefix.length + 1;
    const row = this.queryOne<{ n: number | null }>(
      `SELECT MAX(CAST(SUBSTR(code, ?) AS INTEGER)) as n FROM ${this.tableName}
       WHERE code LIKE ? AND SUBSTR(code, ?) <> '' AND SUBSTR(code, ?) NOT GLOB '*[^0-9]*'`,
      [start, `${prefix}%`, start, start]
    );
    return `${prefix}${String((row?.n ?? 0) + 1).padStart(3, '0')}`;
  }

  protected assignments<K extends string>(
    data: Partial<Record<K, unknown>>,
    updatable: readonly K[]
  ): { fields: string[]; values: unknown[] } {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const field of updatable) {
      if (field in data) {
        fields.push(`${field} = ?`);
        values.push(data[field] ?? null);
      }
    }
    return { fields, values };
  }

  protected updateFields<K extends string>(
    id: number,
    data: Partial<Record<K, unknown>>,
    updatable: readonly K[]
  ): T | undefined {
    const { fields, values } = this.assignments(data, updatable);
    if (fields.length === 0) return this.getById(id);
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    this.run(`UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  }

  abstract delete(id: number): { success: boolean };
}
