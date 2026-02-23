import { IpcMainInvokeEvent } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import { validateId } from '../../utils/schemas';
import { safeHandle } from './safeHandle';

export function registerTrashHandlers(getDbService: () => DatabaseService): void {
  safeHandle('trash:getAll', () => getDbService().trash.getAll());

  safeHandle('trash:restore', (_: IpcMainInvokeEvent, id: unknown) => {
    const validation = validateId(id);
    if (!validation.success) throw new Error(validation.error);
    const db = getDbService();
    const result = db.trash.restore(validation.data!);
    db.save();
    return result;
  });

  safeHandle('trash:permanentDelete', (_: IpcMainInvokeEvent, id: unknown) => {
    const validation = validateId(id);
    if (!validation.success) throw new Error(validation.error);
    const db = getDbService();
    const result = db.trash.permanentDelete(validation.data!);
    db.save();
    return result;
  });

  safeHandle('trash:empty', () => {
    const db = getDbService();
    const result = db.trash.emptyTrash();
    db.save();
    return result;
  });
}
