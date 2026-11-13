import type { Database as SqlJsDatabase } from 'sql.js';
import { queryRows } from '../sqlQuery';
import { z } from 'zod';
import { createColumnLookup, inList, toSqlValue } from './trash/bundleSql';

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

export type RestoreProblem =
  | typeof RESTORE_PARENT_MISSING
  | 'not_found'
  | 'invalid_data'
  | 'unknown_type'
  | 'failed';

export interface RestoreResult {
  success: boolean;
  error?: RestoreProblem;
  detail?: string;
}

class BundleBuilder {
  private readonly rows = new Map<BundleTable, Map<number, Row>>();
  private readonly links = new Map<string, BundleLink>();

  constructor(private readonly db: SqlJsDatabase) {}

  addRows(table: BundleTable, where: string, params: unknown[]): void {
    const found = queryRows<Row>(this.db, `SELECT * FROM ${table} WHERE (${where})`, params);
    let byId = this.rows.get(table);
    if (!byId) {
      byId = new Map();
      this.rows.set(table, byId);
    }
    for (const row of found) byId.set(Number(row.id), row);
  }

  addLinks(table: BundleTable, column: string, where: string, params: unknown[]): void {
    const found = queryRows<Row>(
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
    const links = [...this.links.values()].filter(
      (link) => !this.rows.get(link.table)?.has(link.id)
    );
    return { version: 1, rows, links };
  }
}

function addProjects(builder: BundleBuilder, projectIds: number[]): void {
  if (projectIds.length === 0) return;
  const inProjects = inList(projectIds);
  builder.addRows('projects', `id IN ${inProjects}`, projectIds);
  builder.addRows('transactions', `project_id IN ${inProjects} AND scope = 'project'`, projectIds);
  builder.addLinks(
    'transactions',
    'project_id',
    `project_id IN ${inProjects} AND scope != 'project'`,
    projectIds
  );
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
  builder.addLinks(
    'transactions',
    'linked_invoice_id',
    `linked_invoice_id IN ${inTransactions}`,
    transactionIds
  );
}

export function collectCompanyBundle(db: SqlJsDatabase, companyId: number): TrashBundle {
  const builder = new BundleBuilder(db);
  builder.addRows('companies', 'id = ?', [companyId]);
  const clientProjectIds = queryRows<Row>(
    db,
    'SELECT id FROM projects WHERE client_company_id = ?',
    [companyId]
  ).map((row) => Number(row.id));
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

const rowListSchema = z.array(z.record(z.string(), z.unknown())).optional();

const bundleSchema = z.object({
  [BUNDLE_KEY]: z.object({
    version: z.literal(1),
    rows: z.object({
      companies: rowListSchema,
      projects: rowListSchema,
      materials: rowListSchema,
      transactions: rowListSchema,
      project_parties: rowListSchema,
      payment_allocations: rowListSchema,
      stock_movements: rowListSchema,
    }),
    links: z.array(
      z.object({
        table: z.enum(BUNDLE_TABLES),
        id: z.number(),
        column: z.string(),
        value: z.number(),
      })
    ),
  }),
});

export function readBundle(data: unknown): TrashBundle | null {
  const parsed = bundleSchema.safeParse(data);
  if (!parsed.success) return null;
  const { rows, links } = parsed.data[BUNDLE_KEY];
  const present: Partial<Record<BundleTable, Row[]>> = {};
  for (const table of BUNDLE_TABLES) {
    const list = rows[table];
    if (list) present[table] = list;
  }
  return { version: 1, rows: present, links };
}

export function restoreBundle(db: SqlJsDatabase, bundle: TrashBundle): void {
  db.run('PRAGMA defer_foreign_keys = ON');

  const columnsOf = createColumnLookup(db);

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
