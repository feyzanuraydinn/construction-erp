import type { Database as SqlJsDatabase } from 'sql.js';

export const BUNDLE_TABLES = [
  'companies',
  'projects',
  'materials',
  'transactions',
  'project_parties',
  'payment_allocations',
  'stock_movements',
] as const;

export type BundleTable = (typeof BUNDLE_TABLES)[number];

type Row = Record<string, unknown>;

export interface BundleLink {
  table: BundleTable;
  id: number;
  column: string;
  value: number;
}

export interface TrashBundle {
  version: 1;
  rows: Partial<Record<BundleTable, Row[]>>;
  links: BundleLink[];
}

export const BUNDLE_KEY = '__bundle';

export const RESTORE_PARENT_MISSING = 'parent_missing';

function selectRows(db: SqlJsDatabase, sql: string, params: unknown[] = []): Row[] {
  const stmt = db.prepare(sql);
  try {
    if (params.length > 0) stmt.bind(params);
    const rows: Row[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

function inList(ids: number[]): string {
  return ids.length > 0 ? `(${ids.map(() => '?').join(', ')})` : '(NULL)';
}

class BundleBuilder {
  private readonly rows = new Map<BundleTable, Map<number, Row>>();
  private readonly links = new Map<string, BundleLink>();

  constructor(private readonly db: SqlJsDatabase) {}

  addRows(table: BundleTable, where: string, params: unknown[]): void {
    const found = selectRows(this.db, `SELECT * FROM ${table} WHERE (${where})`, params);
    let byId = this.rows.get(table);
    if (!byId) {
      byId = new Map();
      this.rows.set(table, byId);
    }
    for (const row of found) byId.set(Number(row.id), row);
  }

  addLinks(table: BundleTable, column: string, where: string, params: unknown[]): void {
    const found = selectRows(
      this.db,
      `SELECT id, ${column} AS value FROM ${table} WHERE (${where}) AND ${column} IS NOT NULL`,
      params
    );
    for (const row of found) {
      const id = Number(row.id);
      this.links.set(`${table}:${id}:${column}`, { table, id, column, value: Number(row.value) });
    }
  }

  ids(table: BundleTable): number[] {
    return [...(this.rows.get(table)?.keys() ?? [])];
  }

  build(): TrashBundle {
    const rows: Partial<Record<BundleTable, Row[]>> = {};
    for (const [table, byId] of this.rows) rows[table] = [...byId.values()];
    const links = [...this.links.values()].filter((link) => !this.rows.get(link.table)?.has(link.id));
    return { version: 1, rows, links };
  }
}

function addProjects(builder: BundleBuilder, projectIds: number[]): void {
  if (projectIds.length === 0) return;
  const inProjects = inList(projectIds);
  builder.addRows('projects', `id IN ${inProjects}`, projectIds);
  builder.addRows('transactions', `project_id IN ${inProjects} AND scope = 'project'`, projectIds);
  builder.addLinks('transactions', 'project_id', `project_id IN ${inProjects} AND scope != 'project'`, projectIds);
  builder.addRows('project_parties', `project_id IN ${inProjects}`, projectIds);
  builder.addLinks('stock_movements', 'project_id', `project_id IN ${inProjects}`, projectIds);
}

function addTransactionDependents(builder: BundleBuilder): void {
  const transactionIds = builder.ids('transactions');
  if (transactionIds.length === 0) return;
  const inTransactions = inList(transactionIds);
  builder.addRows(
    'payment_allocations',
    `payment_id IN ${inTransactions} OR invoice_id IN ${inTransactions}`,
    [...transactionIds, ...transactionIds]
  );
  builder.addLinks('transactions', 'linked_invoice_id', `linked_invoice_id IN ${inTransactions}`, transactionIds);
}

export function collectCompanyBundle(db: SqlJsDatabase, companyId: number): TrashBundle {
  const builder = new BundleBuilder(db);
  builder.addRows('companies', 'id = ?', [companyId]);
  const clientProjectIds = selectRows(db, 'SELECT id FROM projects WHERE client_company_id = ?', [companyId]).map(
    (row) => Number(row.id)
  );
  addProjects(builder, clientProjectIds);
  builder.addRows('transactions', 'company_id = ?', [companyId]);
  builder.addRows('project_parties', 'company_id = ?', [companyId]);
  builder.addLinks('stock_movements', 'company_id', 'company_id = ?', [companyId]);
  addTransactionDependents(builder);
  return builder.build();
}

export function collectProjectBundle(db: SqlJsDatabase, projectId: number): TrashBundle {
  const builder = new BundleBuilder(db);
  addProjects(builder, [projectId]);
  addTransactionDependents(builder);
  return builder.build();
}

export function collectTransactionBundle(db: SqlJsDatabase, transactionId: number): TrashBundle {
  const builder = new BundleBuilder(db);
  builder.addRows('transactions', 'id = ?', [transactionId]);
  addTransactionDependents(builder);
  return builder.build();
}

export function collectMaterialBundle(db: SqlJsDatabase, materialId: number): TrashBundle {
  const builder = new BundleBuilder(db);
  builder.addRows('materials', 'id = ?', [materialId]);
  builder.addRows('stock_movements', 'material_id = ?', [materialId]);
  return builder.build();
}

export function moveToTrash(
  db: SqlJsDatabase,
  type: 'company' | 'project' | 'transaction' | 'material',
  displayData: object,
  bundle: TrashBundle
): void {
  db.run('INSERT INTO trash (type, data) VALUES (?, ?)', [
    type,
    JSON.stringify({ ...displayData, [BUNDLE_KEY]: bundle }),
  ]);
  for (const link of bundle.links) {
    db.run(`UPDATE ${link.table} SET ${link.column} = NULL WHERE id = ?`, [link.id]);
  }
  for (const table of [...BUNDLE_TABLES].reverse()) {
    for (const row of bundle.rows[table] ?? []) {
      db.run(`DELETE FROM ${table} WHERE id = ?`, [Number(row.id)]);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBundleTable(value: unknown): value is BundleTable {
  return BUNDLE_TABLES.some((table) => table === value);
}

export function readBundle(data: unknown): TrashBundle | null {
  if (!isRecord(data)) return null;
  const raw = data[BUNDLE_KEY];
  if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.rows) || !Array.isArray(raw.links)) return null;

  const rows: Partial<Record<BundleTable, Row[]>> = {};
  for (const table of BUNDLE_TABLES) {
    const list = raw.rows[table];
    if (list === undefined) continue;
    if (!Array.isArray(list) || !list.every(isRecord)) return null;
    rows[table] = list;
  }

  const links: BundleLink[] = [];
  for (const link of raw.links) {
    if (
      !isRecord(link) ||
      !isBundleTable(link.table) ||
      typeof link.id !== 'number' ||
      typeof link.column !== 'string' ||
      typeof link.value !== 'number'
    ) {
      return null;
    }
    links.push({ table: link.table, id: link.id, column: link.column, value: link.value });
  }

  return { version: 1, rows, links };
}

function toSqlValue(value: unknown): string | number | null {
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

function tableColumns(db: SqlJsDatabase, table: BundleTable): Set<string> {
  return new Set(selectRows(db, `PRAGMA table_info(${table})`).map((row) => String(row.name)));
}

export function restoreBundle(db: SqlJsDatabase, bundle: TrashBundle): void {
  db.run('PRAGMA defer_foreign_keys = ON');

  const columnsByTable = new Map<BundleTable, Set<string>>();
  const columnsOf = (table: BundleTable): Set<string> => {
    let columns = columnsByTable.get(table);
    if (!columns) {
      columns = tableColumns(db, table);
      columnsByTable.set(table, columns);
    }
    return columns;
  };

  for (const table of BUNDLE_TABLES) {
    const rows = bundle.rows[table] ?? [];
    if (rows.length === 0) continue;
    const columns = columnsOf(table);
    for (const row of rows) {
      const names = Object.keys(row).filter((name) => columns.has(name));
      db.run(
        `INSERT INTO ${table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
        names.map((name) => toSqlValue(row[name]))
      );
    }
  }

  for (const link of bundle.links) {
    if (!columnsOf(link.table).has(link.column)) continue;
    db.run(`UPDATE ${link.table} SET ${link.column} = ? WHERE id = ? AND ${link.column} IS NULL`, [
      link.value,
      link.id,
    ]);
  }
}
