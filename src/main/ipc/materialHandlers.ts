import { IpcMainInvokeEvent } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import { materialSchema, stockMovementSchema, stockMovementFiltersSchema, validateInput, validateId } from '../../utils/schemas';
import { safeHandle } from './safeHandle';

export function registerMaterialHandlers(getDbService: () => DatabaseService): void {
  // Material CRUD
  safeHandle('material:getAll', () => getDbService().materials.getAll());

  safeHandle('material:getById', (_: IpcMainInvokeEvent, id: unknown) => {
    const validation = validateId(id);
    if (!validation.success) throw new Error(validation.error);
    return getDbService().materials.getById(validation.data!);
  });

  safeHandle('material:create', (_: IpcMainInvokeEvent, data: unknown) => {
    const validation = validateInput(materialSchema, data);
    if (!validation.success) throw new Error(validation.error);
    const db = getDbService();
    const result = db.materials.create(validation.data!);
    db.save();
    return result;
  });

  safeHandle('material:update', (_: IpcMainInvokeEvent, id: unknown, data: unknown) => {
    const idValidation = validateId(id);
    if (!idValidation.success) throw new Error(idValidation.error);
    const dataValidation = validateInput(materialSchema, data);
    if (!dataValidation.success) throw new Error(dataValidation.error);
    const db = getDbService();
    const result = db.materials.update(idValidation.data!, dataValidation.data!);
    db.save();
    return result;
  });

  safeHandle('material:delete', (_: IpcMainInvokeEvent, id: unknown) => {
    const validation = validateId(id);
    if (!validation.success) throw new Error(validation.error);
    const db = getDbService();
    const result = db.materials.delete(validation.data!);
    db.save();
    return result;
  });

  safeHandle('material:generateCode', () => getDbService().materials.generateCode());
  safeHandle('material:getLowStock', () => getDbService().materials.getLowStock());

  // Stock movement handlers
  safeHandle('stock:getAll', (_: IpcMainInvokeEvent, filters: unknown = {}) => {
    const validation = validateInput(stockMovementFiltersSchema, filters || {});
    if (!validation.success) throw new Error(validation.error);
    return getDbService().materials.getMovements(validation.data!);
  });

  safeHandle('stock:create', (_: IpcMainInvokeEvent, data: unknown) => {
    const validation = validateInput(stockMovementSchema, data);
    if (!validation.success) throw new Error(validation.error);
    const db = getDbService();
    const result = db.materials.createMovement(validation.data!);
    db.save();
    return result;
  });

  safeHandle('stock:delete', (_: IpcMainInvokeEvent, id: unknown) => {
    const validation = validateId(id);
    if (!validation.success) throw new Error(validation.error);
    const db = getDbService();
    const result = db.materials.deleteMovement(validation.data!);
    db.save();
    return result;
  });
}
