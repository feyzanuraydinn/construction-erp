import { IpcMainInvokeEvent } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import { categorySchema, parseInput, parseId } from '../../utils/schemas';
import { safeHandle } from './safeHandle';
import { writeAndSave } from './writeAndSave';

export function registerCategoryHandlers(getDbService: () => DatabaseService): void {
  safeHandle('category:getAll', () => getDbService().categories.getAll());

  safeHandle('category:create', (_: IpcMainInvokeEvent, data: unknown) => {
    const input = parseInput(categorySchema, data);
    return writeAndSave(getDbService, (db) => db.categories.create(input));
  });

  safeHandle('category:delete', (_: IpcMainInvokeEvent, id: unknown) => {
    const categoryId = parseId(id);
    return writeAndSave(getDbService, (db) => db.categories.delete(categoryId));
  });
}
