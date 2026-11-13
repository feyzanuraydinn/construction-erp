import { IpcMainInvokeEvent } from 'electron';
import { syncService } from '../SyncService';
import { safeHandle } from './safeHandle';
import { conflictChoiceSchema, parseInput } from '../../utils/schemas';

export function registerSyncHandlers(): void {
  safeHandle('sync:getStatus', () => syncService.getStatus());

  safeHandle('sync:check', async () => {
    await syncService.checkAndSync();
    return { success: true };
  });

  safeHandle('sync:resolveConflict', async (_: IpcMainInvokeEvent, choice: unknown) => {
    return syncService.resolveConflict(parseInput(conflictChoiceSchema, choice));
  });
}
