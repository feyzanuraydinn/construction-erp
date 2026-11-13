import { IpcMainInvokeEvent } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import {
  materialSchema,
  stockMovementSchema,
  stockMovementFiltersSchema,
  parseInput,
  parseId,
} from '../../utils/schemas';
import { safeHandle } from './safeHandle';
import { writeAndSave } from './writeAndSave';

export function registerMaterialHandlers(getDbService: () => DatabaseService): void {
  safeHandle('material:getAll', () => getDbService().materials.getAll());

  safeHandle('material:create', (_: IpcMainInvokeEvent, data: unknown) => {
    const input = parseInput(materialSchema, data);
    return writeAndSave(getDbService, (db) => db.materials.create(input));
  });

  safeHandle('material:update', (_: IpcMainInvokeEvent, id: unknown, data: unknown) => {
    const materialId = parseId(id);
    const input = parseInput(materialSchema, data);
    return writeAndSave(getDbService, (db) => db.materials.update(materialId, input));
  });

  safeHandle('material:delete', (_: IpcMainInvokeEvent, id: unknown) => {
    const materialId = parseId(id);
    return writeAndSave(getDbService, (db) => db.materials.delete(materialId));
  });

  safeHandle('material:generateCode', () => getDbService().materials.generateCode());

  safeHandle('stock:getAll', (_: IpcMainInvokeEvent, filters: unknown = {}) =>
    getDbService().materials.getMovements(parseInput(stockMovementFiltersSchema, filters || {}))
  );

  safeHandle('stock:create', (_: IpcMainInvokeEvent, data: unknown) => {
    const input = parseInput(stockMovementSchema, data);
    return writeAndSave(getDbService, (db) => db.materials.createMovement(input));
  });

  safeHandle('stock:delete', (_: IpcMainInvokeEvent, id: unknown) => {
    const movementId = parseId(id);
    return writeAndSave(getDbService, (db) => db.materials.deleteMovement(movementId));
  });
}
