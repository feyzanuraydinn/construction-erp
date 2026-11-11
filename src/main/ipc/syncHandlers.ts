import { IpcMainInvokeEvent } from 'electron';
import { syncService } from '../SyncService';
import { safeHandle } from './safeHandle';
import { t } from '../i18n';

export function registerSyncHandlers(): void {
  safeHandle('sync:getStatus', () => syncService.getStatus());

  safeHandle('sync:getMeta', () => syncService.getMeta());

  safeHandle('sync:setAutoSyncEnabled', (_: IpcMainInvokeEvent, enabled: unknown) => {
    syncService.setAutoSyncEnabled(Boolean(enabled));
    return { success: true };
  });

  safeHandle('sync:check', async () => {
    await syncService.checkAndSync();
    return { success: true };
  });

  safeHandle('sync:upload', async () => {
    return syncService.manualUpload();
  });

  safeHandle('sync:download', async () => {
    return syncService.manualDownload();
  });

  safeHandle('sync:resolveConflict', async (_: IpcMainInvokeEvent, choice: unknown) => {
    if (choice !== 'use-local' && choice !== 'use-remote' && choice !== 'cancel') {
      throw new Error(t('main.sync.invalidChoice'));
    }
    return syncService.resolveConflict(choice);
  });
}
