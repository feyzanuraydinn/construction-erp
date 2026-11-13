import { IpcMainInvokeEvent } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import { parseId } from '../../utils/schemas';
import { safeHandle } from './safeHandle';
import { writeAndSave } from './writeAndSave';

export function registerTrashHandlers(getDbService: () => DatabaseService): void {
  safeHandle('trash:getAll', () => getDbService().trash.getAll());

  safeHandle('trash:restore', (_: IpcMainInvokeEvent, id: unknown) => {
    const trashId = parseId(id);
    return writeAndSave(getDbService, (db) => db.trash.restore(trashId));
  });

  safeHandle('trash:permanentDelete', (_: IpcMainInvokeEvent, id: unknown) => {
    const trashId = parseId(id);
    return writeAndSave(getDbService, (db) => db.trash.permanentDelete(trashId));
  });

  safeHandle('trash:empty', () => writeAndSave(getDbService, (db) => db.trash.emptyTrash()));
}
