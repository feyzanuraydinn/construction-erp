import { IpcMainInvokeEvent } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import { categorySchema, validateInput, validateId } from '../../utils/schemas';
import { safeHandle } from './safeHandle';

export function registerCategoryHandlers(getDbService: () => DatabaseService): void {
  safeHandle('category:getAll', (_: IpcMainInvokeEvent, type: unknown) =>
    getDbService().categories.getAllByType(typeof type === 'string' ? type : null)
  );

  safeHandle('category:create', (_: IpcMainInvokeEvent, data: unknown) => {
    const validation = validateInput(categorySchema, data);
    if (!validation.success) throw new Error(validation.error);
    const db = getDbService();
    const result = db.categories.create(validation.data!);
    db.save();
    return result;
  });

  safeHandle('category:delete', (_: IpcMainInvokeEvent, id: unknown) => {
    const validation = validateId(id);
    if (!validation.success) throw new Error(validation.error);
    const db = getDbService();
    const result = db.categories.delete(validation.data!);
    db.save();
    return result;
  });
}
