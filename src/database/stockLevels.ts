import type { Database as SqlJsDatabase } from 'sql.js';

export function movementStockDelta(movementType: unknown, quantity: number): number {
  if (movementType === 'in') return quantity;
  if (movementType === 'out' || movementType === 'waste') return -quantity;
  return 0;
}

export function changeStock(db: SqlJsDatabase, materialId: unknown, delta: number): void {
  if (delta === 0) return;
  db.run(
    `UPDATE materials SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [delta, Number(materialId)]
  );
}

export function setStock(db: SqlJsDatabase, materialId: number, quantity: number): void {
  db.run(`UPDATE materials SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
    quantity,
    materialId,
  ]);
}
