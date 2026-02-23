import type { Database as SqlJsDatabase } from 'sql.js';
import { BaseRepository } from './BaseRepository';
import type { Project, ProjectWithSummary, ProjectParty, ProjectPartyWithDetails } from '../../types';
import type { ProjectInput, ProjectPartyInput } from '../../utils/schemas';

export class ProjectRepository extends BaseRepository<Project> {
  constructor(db: SqlJsDatabase) {
    super(db, 'projects');
  }

  getWithSummary(): ProjectWithSummary[] {
    return this.query(`
      SELECT p.*,
        c.name as client_name,
        COALESCE(SUM(CASE WHEN t.type = 'invoice_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as total_invoice_out,
        COALESCE(SUM(CASE WHEN t.type = 'invoice_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as total_invoice_in,
        COALESCE(SUM(CASE WHEN t.type = 'payment_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as total_collected,
        COALESCE(SUM(CASE WHEN t.type = 'payment_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN t.type = 'payment_in' THEN COALESCE(t.amount_try, t.amount) - COALESCE(alloc.allocated_amount, 0) ELSE 0 END), 0) as independent_payment_in,
        COALESCE(SUM(CASE WHEN t.type = 'payment_out' THEN COALESCE(t.amount_try, t.amount) - COALESCE(alloc.allocated_amount, 0) ELSE 0 END), 0) as independent_payment_out,
        COALESCE(SUM(CASE WHEN t.type = 'invoice_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN t.type = 'payment_in' THEN COALESCE(t.amount_try, t.amount) - COALESCE(alloc.allocated_amount, 0) ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type = 'invoice_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN t.type = 'payment_out' THEN COALESCE(t.amount_try, t.amount) - COALESCE(alloc.allocated_amount, 0) ELSE 0 END), 0) as total_expense,
        COUNT(DISTINCT t.id) as transaction_count,
        (SELECT COUNT(DISTINCT pp.company_id) FROM project_parties pp WHERE pp.project_id = p.id) as party_count
      FROM projects p
      LEFT JOIN companies c ON c.id = p.client_company_id
      LEFT JOIN transactions t ON t.project_id = p.id
      LEFT JOIN (
        SELECT payment_id, SUM(amount) as allocated_amount
        FROM payment_allocations
        GROUP BY payment_id
      ) alloc ON alloc.payment_id = t.id
      WHERE p.is_active = 1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
  }

  getById(id: number): Project | undefined {
    return this.queryOne(`
      SELECT p.*, c.name as client_name
      FROM projects p
      LEFT JOIN companies c ON c.id = p.client_company_id
      WHERE p.id = ?
    `, [id]);
  }

  generateCode(): string {
    const year = new Date().getFullYear();
    const prefix = `PRJ-${year}-`;
    const last = this.queryOne<{ code: string }>(`SELECT code FROM projects WHERE code LIKE ? ORDER BY code DESC LIMIT 1`, [`${prefix}%`]);
    if (last) {
      const num = parseInt(last.code.replace(prefix, ''), 10) + 1;
      return `${prefix}${String(num).padStart(3, '0')}`;
    }
    return `${prefix}001`;
  }

  create(data: ProjectInput): Project {
    const code = data.code || this.generateCode();
    const result = this.run(
      `INSERT INTO projects (code, name, ownership_type, client_company_id, status, project_type, location, total_area, unit_count, estimated_budget, planned_start, planned_end, actual_start, actual_end, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, data.name, data.ownership_type || 'own', data.client_company_id || null, data.status || 'planned', data.project_type || null, data.location || null, data.total_area || null, data.unit_count || null, data.estimated_budget || null, data.planned_start || null, data.planned_end || null, data.actual_start || null, data.actual_end || null, data.description || null]
    );
    return this.getById(result.lastInsertRowid)!;
  }

  update(id: number, data: Partial<ProjectInput>): Project | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];
    const updatable = ['name', 'ownership_type', 'client_company_id', 'status', 'project_type', 'location', 'total_area', 'unit_count', 'estimated_budget', 'planned_start', 'planned_end', 'actual_start', 'actual_end', 'description'] as const;
    for (const field of updatable) {
      if (field in data) {
        fields.push(`${field} = ?`);
        values.push(data[field] ?? null);
      }
    }
    if (fields.length === 0) return this.getById(id);
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    this.run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  }

  delete(id: number): { success: boolean } {
    const project = this.queryOne(`SELECT * FROM projects WHERE id = ?`, [id]);
    if (!project) return { success: false };
    this.db.run('BEGIN TRANSACTION');
    try {
      this.run(`INSERT INTO trash (type, data) VALUES ('project', ?)`, [JSON.stringify(project)]);
      this.run(`DELETE FROM project_parties WHERE project_id = ?`, [id]);
      this.run(`DELETE FROM projects WHERE id = ?`, [id]);
      this.db.run('COMMIT');
      return { success: true };
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  getParties(projectId: number): ProjectPartyWithDetails[] {
    return this.query(`
      SELECT pp.*, c.name as company_name, c.phone, c.email, c.account_type
      FROM project_parties pp
      LEFT JOIN companies c ON c.id = pp.company_id
      WHERE pp.project_id = ?
      ORDER BY pp.role, c.name
    `, [projectId]);
  }

  addParty(data: ProjectPartyInput): ProjectParty {
    const result = this.run(
      `INSERT OR REPLACE INTO project_parties (project_id, company_id, role, notes)
       VALUES (?, ?, ?, ?)`,
      [data.project_id, data.company_id, data.role, data.notes || null]
    );
    return this.queryOne<ProjectParty>(`SELECT * FROM project_parties WHERE id = ?`, [result.lastInsertRowid])!;
  }

  removeParty(id: number): { success: boolean } {
    this.run(`DELETE FROM project_parties WHERE id = ?`, [id]);
    return { success: true };
  }
}
