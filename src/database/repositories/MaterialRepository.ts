import type { Database as SqlJsDatabase } from 'sql.js';
import { BaseRepository } from './BaseRepository';
import type { Material, StockMovementWithDetails, StockMovementFilters } from '../../types';
import type { MaterialInput, StockMovementInput } from '../../utils/schemas';
import { collectMaterialBundle, moveToTrash } from './trashBundle';
import { runInSavepoint } from '../savepoint';
import { changeStock, movementStockDelta, setStock } from '../stockLevels';

const MATERIALS_UPDATABLE_FIELDS: ReadonlyArray<keyof MaterialInput> = [
  'name',
  'category',
  'unit',
  'min_stock',
  'current_stock',
  'notes',
];

export class MaterialRepository extends BaseRepository<Material> {
  constructor(db: SqlJsDatabase) {
    super(db, 'materials');
  }

  generateCode(): string {
    return this.nextCode('MLZ-');
  }

  create(data: MaterialInput): Material {
    const code = data.code || this.generateCode();
    const result = this.run(
      `INSERT INTO materials (code, name, category, unit, min_stock, current_stock, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        data.name,
        data.category || null,
        data.unit,
        data.min_stock || 0,
        data.current_stock || 0,
        data.notes || null,
      ]
    );
    return this.requireRow(this.getById(result.lastInsertRowid));
  }

  update(id: number, data: Partial<MaterialInput>): Material | undefined {
    return this.updateFields(id, data, MATERIALS_UPDATABLE_FIELDS);
  }

  delete(id: number): { success: boolean } {
    const material = this.getById(id);
    if (!material) return { success: false };
    runInSavepoint(this.db, () =>
      moveToTrash(this.db, 'material', material, collectMaterialBundle(this.db, id))
    );
    return { success: true };
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
    if (filters?.material_id) {
      query += ` AND sm.material_id = ?`;
      params.push(filters.material_id);
    }
    if (filters?.movement_type) {
      query += ` AND sm.movement_type = ?`;
      params.push(filters.movement_type);
    }
    if (filters?.project_id) {
      query += ` AND sm.project_id = ?`;
      params.push(filters.project_id);
    }
    if (filters?.start_date) {
      query += ` AND sm.date >= ?`;
      params.push(filters.start_date);
    }
    if (filters?.end_date) {
      query += ` AND sm.date <= ?`;
      params.push(filters.end_date);
    }
    query += ` ORDER BY sm.date DESC, sm.created_at DESC`;
    return this.query(query, params);
  }

  createMovement(data: StockMovementInput): StockMovementWithDetails {
    const quantity = data.quantity;
    const unitPrice = data.unit_price || 0;
    const totalPrice = quantity * unitPrice;

    return runInSavepoint(this.db, () => {
      const result = this.run(
        `INSERT INTO stock_movements (material_id, movement_type, quantity, unit_price, total_price, project_id, company_id, date, description, document_no)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.material_id,
          data.movement_type,
          quantity,
          unitPrice,
          totalPrice,
          data.project_id || null,
          data.company_id || null,
          data.date,
          data.description || null,
          data.document_no || null,
        ]
      );

      if (data.movement_type === 'adjustment') {
        setStock(this.db, data.material_id, quantity);
      } else {
        changeStock(this.db, data.material_id, movementStockDelta(data.movement_type, quantity));
      }

      const movement = this.requireRow(
        this.queryOne<StockMovementWithDetails>(
          `
        SELECT sm.*, m.name as material_name, m.unit as material_unit
        FROM stock_movements sm
        LEFT JOIN materials m ON m.id = sm.material_id
        WHERE sm.id = ?
      `,
          [result.lastInsertRowid]
        )
      );

      return movement;
    });
  }

  deleteMovement(id: number): { success: boolean } {
    const movement = this.queryOne<StockMovementWithDetails>(
      `SELECT * FROM stock_movements WHERE id = ?`,
      [id]
    );
    if (!movement) return { success: false };

    runInSavepoint(this.db, () => {
      this.run(`INSERT INTO trash (type, data) VALUES ('stock_movement', ?)`, [
        JSON.stringify(movement),
      ]);

      changeStock(
        this.db,
        movement.material_id,
        -movementStockDelta(movement.movement_type, movement.quantity)
      );

      this.run(`DELETE FROM stock_movements WHERE id = ?`, [id]);
    });
    return { success: true };
  }
}
