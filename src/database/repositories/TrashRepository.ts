import type { TrashItem } from '../../types';
import {
  readBundle,
  restoreBundle,
  RESTORE_PARENT_MISSING,
  type RestoreResult,
  type TrashBundle,
} from './trashBundle';
import { SqlRepository } from './SqlRepository';
import { runInSavepoint } from '../savepoint';
import { isRecord } from '../../utils/typeGuards';
import { changeStock, movementStockDelta } from '../stockLevels';
import { errorText } from '../../utils/errorText';

export class TrashRepository extends SqlRepository {
  getAll(): TrashItem[] {
    return this.query(`SELECT * FROM trash ORDER BY deleted_at DESC`);
  }

  restore(trashId: number): RestoreResult {
    const item = this.queryOne<TrashItem>(`SELECT * FROM trash WHERE id = ?`, [trashId]);
    if (!item) return { success: false, error: 'not_found' };

    let parsed: unknown;
    try {
      parsed = JSON.parse(item.data);
    } catch {
      return { success: false, error: 'invalid_data' };
    }
    const bundle = readBundle(parsed);
    return bundle ? this.restoreFromBundle(trashId, bundle) : this.restoreLegacy(trashId, item);
  }

  private restoreFromBundle(trashId: number, bundle: TrashBundle): RestoreResult {
    try {
      runInSavepoint(this.db, () => {
        restoreBundle(this.db, bundle);
        this.run(`DELETE FROM trash WHERE id = ?`, [trashId]);
      });
      return { success: true };
    } catch (error: unknown) {
      const message = errorText(error);
      if (/FOREIGN KEY constraint failed/i.test(message)) {
        return { success: false, error: RESTORE_PARENT_MISSING };
      }
      return { success: false, error: 'failed', detail: message };
    }
  }

  private restoreLegacy(trashId: number, item: TrashItem): RestoreResult {
    this.db.run('PRAGMA foreign_keys = OFF');
    try {
      return this.restoreLegacyRow(trashId, item);
    } finally {
      this.db.run('PRAGMA foreign_keys = ON');
    }
  }

  private restoreLegacyRow(trashId: number, item: TrashItem): RestoreResult {
    try {
      const data: unknown = JSON.parse(item.data);
      if (!isRecord(data) || typeof data.id !== 'number' || data.id <= 0) {
        return { success: false, error: 'invalid_data' };
      }
      const restored = runInSavepoint(this.db, () => {
        if (!this.insertLegacyRow(item.type, data)) return false;
        this.run(`DELETE FROM trash WHERE id = ?`, [trashId]);
        return true;
      });
      return restored
        ? { success: true }
        : { success: false, error: 'unknown_type', detail: item.type };
    } catch (error: unknown) {
      return { success: false, error: 'failed', detail: errorText(error) };
    }
  }

  private insertLegacyRow(type: string, data: Record<string, unknown>): boolean {
    switch (type) {
      case 'company': {
        this.run(
          `INSERT INTO companies (id, code, type, account_type, name, tc_number, profession, tax_office, tax_number, trade_registry_no, contact_person, phone, email, address, bank_name, iban, notes, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [
            data.id,
            data.code,
            data.type,
            data.account_type,
            data.name,
            data.tc_number,
            data.profession,
            data.tax_office,
            data.tax_number,
            data.trade_registry_no,
            data.contact_person,
            data.phone,
            data.email,
            data.address,
            data.bank_name,
            data.iban,
            data.notes,
            data.created_at,
            data.updated_at,
          ]
        );
        return true;
      }
      case 'project': {
        this.run(
          `INSERT INTO projects (id, code, name, ownership_type, client_company_id, status, project_type, location, total_area, unit_count, estimated_budget, planned_start, planned_end, actual_start, actual_end, description, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [
            data.id,
            data.code,
            data.name,
            data.ownership_type,
            data.client_company_id,
            data.status,
            data.project_type,
            data.location,
            data.total_area,
            data.unit_count,
            data.estimated_budget,
            data.planned_start,
            data.planned_end,
            data.actual_start,
            data.actual_end,
            data.description,
            data.created_at,
            data.updated_at,
          ]
        );
        return true;
      }
      case 'transaction': {
        this.run(
          `INSERT INTO transactions (id, scope, company_id, project_id, type, category_id, date, description, amount, currency, exchange_rate, amount_try, document_no, linked_invoice_id, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.id,
            data.scope,
            data.company_id,
            data.project_id,
            data.type,
            data.category_id,
            data.date,
            data.description,
            data.amount,
            data.currency,
            data.exchange_rate,
            data.amount_try,
            data.document_no,
            data.linked_invoice_id,
            data.notes,
            data.created_at,
            data.updated_at,
          ]
        );
        return true;
      }
      case 'material': {
        this.run(
          `INSERT INTO materials (id, code, name, category, unit, min_stock, current_stock, notes, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [
            data.id,
            data.code,
            data.name,
            data.category,
            data.unit,
            data.min_stock,
            data.current_stock,
            data.notes,
            data.created_at,
            data.updated_at,
          ]
        );
        return true;
      }
      case 'stock_movement': {
        this.run(
          `INSERT INTO stock_movements (id, material_id, movement_type, quantity, unit_price, total_price, project_id, company_id, date, description, document_no, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.id,
            data.material_id,
            data.movement_type,
            data.quantity,
            data.unit_price,
            data.total_price,
            data.project_id,
            data.company_id,
            data.date,
            data.description,
            data.document_no,
            data.created_at,
          ]
        );
        changeStock(
          this.db,
          data.material_id,
          movementStockDelta(data.movement_type, Number(data.quantity))
        );
        return true;
      }
      default:
        return false;
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
