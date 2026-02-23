import type { Database as SqlJsDatabase } from 'sql.js';
import type { TrashItem } from '../../types';

export class TrashRepository {
  constructor(private db: SqlJsDatabase) {}

  private query<R>(sql: string, params?: unknown[]): R[] {
    const stmt = this.db.prepare(sql);
    if (params) stmt.bind(params);
    const results: R[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as R);
    }
    stmt.free();
    return results;
  }

  private queryOne<R>(sql: string, params?: unknown[]): R | undefined {
    return this.query<R>(sql, params)[0];
  }

  private run(sql: string, params?: unknown[]): void {
    this.db.run(sql, params as (string | number | Uint8Array | null)[]);
  }

  getAll(): TrashItem[] {
    return this.query(`SELECT * FROM trash ORDER BY deleted_at DESC`);
  }

  restore(trashId: number): { success: boolean; error?: string } {
    const item = this.queryOne<TrashItem>(`SELECT * FROM trash WHERE id = ?`, [trashId]);
    if (!item) return { success: false, error: 'Öğe bulunamadı' };

    try {
      const data = JSON.parse(item.data);
      // Validate parsed data has required id field
      if (!data || typeof data !== 'object' || typeof data.id !== 'number' || data.id <= 0) {
        return { success: false, error: 'Geçersiz yedek verisi: id alanı eksik veya hatalı' };
      }
      this.db.run('BEGIN TRANSACTION');
      switch (item.type) {
        case 'company': {
          this.run(
            `INSERT INTO companies (id, type, account_type, name, tc_number, profession, tax_office, tax_number, trade_registry_no, contact_person, phone, email, address, bank_name, iban, notes, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [data.id, data.type, data.account_type, data.name, data.tc_number, data.profession, data.tax_office, data.tax_number, data.trade_registry_no, data.contact_person, data.phone, data.email, data.address, data.bank_name, data.iban, data.notes, data.created_at, data.updated_at]
          );
          break;
        }
        case 'project': {
          this.run(
            `INSERT INTO projects (id, code, name, ownership_type, client_company_id, status, project_type, location, total_area, unit_count, estimated_budget, planned_start, planned_end, actual_start, actual_end, description, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [data.id, data.code, data.name, data.ownership_type, data.client_company_id, data.status, data.project_type, data.location, data.total_area, data.unit_count, data.estimated_budget, data.planned_start, data.planned_end, data.actual_start, data.actual_end, data.description, data.created_at, data.updated_at]
          );
          break;
        }
        case 'transaction': {
          this.run(
            `INSERT INTO transactions (id, scope, company_id, project_id, type, category_id, date, description, amount, currency, exchange_rate, amount_try, document_no, linked_invoice_id, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.id, data.scope, data.company_id, data.project_id, data.type, data.category_id, data.date, data.description, data.amount, data.currency, data.exchange_rate, data.amount_try, data.document_no, data.linked_invoice_id, data.notes, data.created_at, data.updated_at]
          );
          break;
        }
        case 'material': {
          this.run(
            `INSERT INTO materials (id, code, name, category, unit, min_stock, current_stock, notes, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [data.id, data.code, data.name, data.category, data.unit, data.min_stock, data.current_stock, data.notes, data.created_at, data.updated_at]
          );
          break;
        }
        case 'stock_movement': {
          this.run(
            `INSERT INTO stock_movements (id, material_id, movement_type, quantity, unit_price, total_price, project_id, company_id, date, description, document_no, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.id, data.material_id, data.movement_type, data.quantity, data.unit_price, data.total_price, data.project_id, data.company_id, data.date, data.description, data.document_no, data.created_at]
          );
          // Re-apply stock change
          if (data.movement_type === 'in') {
            this.run(`UPDATE materials SET current_stock = current_stock + ? WHERE id = ?`, [data.quantity, data.material_id]);
          } else if (data.movement_type === 'out' || data.movement_type === 'waste') {
            this.run(`UPDATE materials SET current_stock = current_stock - ? WHERE id = ?`, [data.quantity, data.material_id]);
          }
          break;
        }
        default:
          return { success: false, error: `Bilinmeyen tür: ${item.type}` };
      }
      this.run(`DELETE FROM trash WHERE id = ?`, [trashId]);
      this.db.run('COMMIT');
      return { success: true };
    } catch (error: unknown) {
      try { this.db.run('ROLLBACK'); } catch { /* already rolled back */ }
      const message = error instanceof Error ? error.message : 'Geri yükleme hatası';
      return { success: false, error: message };
    }
  }

  permanentDelete(trashId: number): { success: boolean } {
    const item = this.queryOne<TrashItem>(`SELECT * FROM trash WHERE id = ?`, [trashId]);
    if (!item) return { success: false };
    this.run(`DELETE FROM trash WHERE id = ?`, [trashId]);
    return { success: true };
  }

  emptyTrash(): { success: boolean } {
    this.run(`DELETE FROM trash`);
    return { success: true };
  }
}
