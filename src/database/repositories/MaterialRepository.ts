import type { Database as SqlJsDatabase } from 'sql.js';
import { BaseRepository } from './BaseRepository';
import type { Material, StockMovementWithDetails, StockMovementFilters } from '../../types';
import type { MaterialInput, StockMovementInput } from '../../utils/schemas';

export class MaterialRepository extends BaseRepository<Material> {
  constructor(db: SqlJsDatabase) {
    super(db, 'materials');
  }

  generateCode(): string {
    const last = this.queryOne<{ code: string }>(`SELECT code FROM materials ORDER BY id DESC LIMIT 1`);
    if (last) {
      const num = parseInt(last.code.replace('MLZ-', ''), 10) + 1;
      return `MLZ-${String(num).padStart(3, '0')}`;
    }
    return 'MLZ-001';
  }

  create(data: MaterialInput): Material {
    const code = data.code || this.generateCode();
    const result = this.run(
      `INSERT INTO materials (code, name, category, unit, min_stock, current_stock, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [code, data.name, data.category || null, data.unit, data.min_stock || 0, data.current_stock || 0, data.notes || null]
    );
    return this.getById(result.lastInsertRowid)!;
  }

  update(id: number, data: Partial<MaterialInput>): Material | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];
    const updatable = ['name', 'category', 'unit', 'min_stock', 'current_stock', 'notes'] as const;
    for (const field of updatable) {
      if (field in data) {
        fields.push(`${field} = ?`);
        values.push(data[field] ?? null);
      }
    }
    if (fields.length === 0) return this.getById(id);
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    this.run(`UPDATE materials SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  }

  delete(id: number): { success: boolean } {
    const material = this.getById(id);
    if (!material) return { success: false };
    this.db.run('BEGIN TRANSACTION');
    try {
      this.run(`INSERT INTO trash (type, data) VALUES ('material', ?)`, [JSON.stringify(material)]);
      this.run(`DELETE FROM stock_movements WHERE material_id = ?`, [id]);
      this.run(`DELETE FROM materials WHERE id = ?`, [id]);
      this.db.run('COMMIT');
      return { success: true };
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  getLowStock(): Material[] {
    return this.query(`
      SELECT * FROM materials
      WHERE is_active = 1 AND current_stock <= min_stock AND min_stock > 0
      ORDER BY (current_stock / NULLIF(min_stock, 0)) ASC
    `);
  }

  getMovements(filters?: StockMovementFilters): StockMovementWithDetails[] {
    let query = `
      SELECT sm.*,
        m.name as material_name, m.unit as material_unit,
        p.name as project_name,
        c.name as company_name
      FROM stock_movements sm
      LEFT JOIN materials m ON m.id = sm.material_id
      LEFT JOIN projects p ON p.id = sm.project_id
      LEFT JOIN companies c ON c.id = sm.company_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    if (filters?.material_id) { query += ` AND sm.material_id = ?`; params.push(filters.material_id); }
    if (filters?.movement_type) { query += ` AND sm.movement_type = ?`; params.push(filters.movement_type); }
    if (filters?.project_id) { query += ` AND sm.project_id = ?`; params.push(filters.project_id); }
    if (filters?.start_date) { query += ` AND sm.date >= ?`; params.push(filters.start_date); }
    if (filters?.end_date) { query += ` AND sm.date <= ?`; params.push(filters.end_date); }
    query += ` ORDER BY sm.date DESC, sm.created_at DESC`;
    return this.query(query, params);
  }

  createMovement(data: StockMovementInput): StockMovementWithDetails {
    const quantity = data.quantity;
    const unitPrice = data.unit_price || 0;
    const totalPrice = quantity * unitPrice;

    this.db.run('BEGIN TRANSACTION');
    try {
      const result = this.run(
        `INSERT INTO stock_movements (material_id, movement_type, quantity, unit_price, total_price, project_id, company_id, date, description, document_no)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.material_id, data.movement_type, quantity, unitPrice, totalPrice, data.project_id || null, data.company_id || null, data.date, data.description || null, data.document_no || null]
      );

      // Update material stock
      const movementType = data.movement_type;
      if (movementType === 'in') {
        this.run(`UPDATE materials SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [quantity, data.material_id]);
      } else if (movementType === 'out' || movementType === 'waste') {
        this.run(`UPDATE materials SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [quantity, data.material_id]);
      } else if (movementType === 'adjustment') {
        this.run(`UPDATE materials SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [quantity, data.material_id]);
      }

      const movement = this.queryOne<StockMovementWithDetails>(`
        SELECT sm.*, m.name as material_name, m.unit as material_unit
        FROM stock_movements sm
        LEFT JOIN materials m ON m.id = sm.material_id
        WHERE sm.id = ?
      `, [result.lastInsertRowid])!;

      this.db.run('COMMIT');
      return movement;
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  deleteMovement(id: number): { success: boolean } {
    const movement = this.queryOne<StockMovementWithDetails>(`SELECT * FROM stock_movements WHERE id = ?`, [id]);
    if (!movement) return { success: false };

    this.db.run('BEGIN TRANSACTION');
    try {
      this.run(`INSERT INTO trash (type, data) VALUES ('stock_movement', ?)`, [JSON.stringify(movement)]);

      // Revert stock
      if (movement.movement_type === 'in') {
        this.run(`UPDATE materials SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [movement.quantity, movement.material_id]);
      } else if (movement.movement_type === 'out' || movement.movement_type === 'waste') {
        this.run(`UPDATE materials SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [movement.quantity, movement.material_id]);
      }

      this.run(`DELETE FROM stock_movements WHERE id = ?`, [id]);
      this.db.run('COMMIT');
      return { success: true };
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }
}
