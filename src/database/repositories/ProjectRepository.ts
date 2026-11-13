import type { Database as SqlJsDatabase } from 'sql.js';
import { BaseRepository } from './BaseRepository';
import type {
  Project,
  ProjectWithClient,
  ProjectWithSummary,
  ProjectParty,
  ProjectPartyWithDetails,
} from '../../types';
import type { ProjectInput, ProjectPartyInput } from '../../utils/schemas';
import { collectProjectBundle, moveToTrash } from './trashBundle';
import { sumOfTypeSql } from '../sqlFragments';
import { runInSavepoint } from '../savepoint';

const PROJECTS_UPDATABLE_FIELDS: ReadonlyArray<keyof ProjectInput> = [
  'name',
  'ownership_type',
  'client_company_id',
  'status',
  'project_type',
  'location',
  'total_area',
  'unit_count',
  'estimated_budget',
  'planned_start',
  'planned_end',
  'actual_start',
  'actual_end',
  'description',
];

export class ProjectRepository extends BaseRepository<Project> {
  constructor(db: SqlJsDatabase) {
    super(db, 'projects');
  }

  getWithSummary(): ProjectWithSummary[] {
    return this.query(`
      SELECT p.*,
        c.name as client_name,
        ${sumOfTypeSql('payment_in', 't')} as total_collected,
        ${sumOfTypeSql('payment_out', 't')} as total_paid,
        ${sumOfTypeSql('invoice_out', 't')} as total_income,
        ${sumOfTypeSql('invoice_in', 't')} as total_expense
      FROM projects p
      LEFT JOIN companies c ON c.id = p.client_company_id
      LEFT JOIN transactions t ON t.project_id = p.id
      WHERE p.is_active = 1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
  }

  getById(id: number): ProjectWithClient | undefined {
    return this.queryOne<ProjectWithClient>(
      `
      SELECT p.*, c.name as client_name
      FROM projects p
      LEFT JOIN companies c ON c.id = p.client_company_id
      WHERE p.id = ?
    `,
      [id]
    );
  }

  generateCode(): string {
    return this.nextCode(`PRJ-${new Date().getFullYear()}-`);
  }

  create(data: ProjectInput): Project {
    const code = data.code || this.generateCode();
    const result = this.run(
      `INSERT INTO projects (code, name, ownership_type, client_company_id, status, project_type, location, total_area, unit_count, estimated_budget, planned_start, planned_end, actual_start, actual_end, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        data.name,
        data.ownership_type || 'own',
        data.client_company_id || null,
        data.status || 'planned',
        data.project_type || null,
        data.location || null,
        data.total_area || null,
        data.unit_count || null,
        data.estimated_budget || null,
        data.planned_start || null,
        data.planned_end || null,
        data.actual_start || null,
        data.actual_end || null,
        data.description || null,
      ]
    );
    return this.requireRow(this.getById(result.lastInsertRowid));
  }

  update(id: number, data: Partial<ProjectInput>): Project | undefined {
    return this.updateFields(id, data, PROJECTS_UPDATABLE_FIELDS);
  }

  delete(id: number): { success: boolean } {
    const project = this.queryOne(`SELECT * FROM projects WHERE id = ?`, [id]);
    if (!project) return { success: false };
    runInSavepoint(this.db, () =>
      moveToTrash(this.db, 'project', project, collectProjectBundle(this.db, id))
    );
    return { success: true };
  }

  getRelatedCounts(id: number): { transactionCount: number; linkedTransactionCount: number } {
    const row = this.queryOne<{ own: number; linked: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN scope = 'project' THEN 1 ELSE 0 END), 0) as own,
         COALESCE(SUM(CASE WHEN scope != 'project' THEN 1 ELSE 0 END), 0) as linked
       FROM transactions WHERE project_id = ?`,
      [id]
    );
    return { transactionCount: row?.own ?? 0, linkedTransactionCount: row?.linked ?? 0 };
  }

  getParties(projectId: number): ProjectPartyWithDetails[] {
    return this.query(
      `
      SELECT pp.*, c.name as company_name, c.phone, c.email, c.account_type
      FROM project_parties pp
      LEFT JOIN companies c ON c.id = pp.company_id
      WHERE pp.project_id = ?
      ORDER BY pp.role, c.name
    `,
      [projectId]
    );
  }

  addParty(data: ProjectPartyInput): ProjectParty {
    const result = this.run(
      `INSERT OR REPLACE INTO project_parties (project_id, company_id, role, notes)
       VALUES (?, ?, ?, ?)`,
      [data.project_id, data.company_id, data.role, data.notes || null]
    );
    return this.requireRow(
      this.queryOne<ProjectParty>(`SELECT * FROM project_parties WHERE id = ?`, [
        result.lastInsertRowid,
      ])
    );
  }

  removeParty(id: number): { success: boolean } {
    this.run(`DELETE FROM project_parties WHERE id = ?`, [id]);
    return { success: true };
  }
}
