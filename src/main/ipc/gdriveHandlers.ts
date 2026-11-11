import { IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { googleDriveService } from '../googleDrive';
import { syncService } from '../SyncService';
import { gdriveCredentialsSchema, validateInput } from '../../utils/schemas';
import { validateBackupPath } from '../../utils/security';
import { safeHandle } from './safeHandle';
import { t } from '../i18n';

export function registerGdriveHandlers(): void {
  safeHandle('gdrive:hasCredentials', () => googleDriveService.hasCredentials());
  safeHandle('gdrive:isConnected', () => googleDriveService.isConnected());

  safeHandle(
    'gdrive:saveCredentials',
    (_: IpcMainInvokeEvent, clientId: unknown, clientSecret: unknown) => {
      const validation = validateInput(gdriveCredentialsSchema, { clientId, clientSecret });
      if (!validation.success) throw new Error(validation.error);
      googleDriveService.saveCredentials(validation.data!.clientId, validation.data!.clientSecret);
      return { success: true };
    }
  );

  safeHandle('gdrive:connect', async () => {
    const result = await googleDriveService.startAuth();
    if (result.success) {
      syncService.markConnected();
      for (const window of BrowserWindow.getAllWindows()) {
        if (window.isMinimized()) window.restore();
        window.focus();
      }
    }
    return result;
  });

  safeHandle('gdrive:disconnect', async () => {
    await googleDriveService.disconnect();
    // The next connection may be a different Drive account (or new
    // credentials). Forget what we knew about the old cloud copy, so the first
    // sync compares from scratch and asks on a mismatch instead of silently
    // overwriting the other account's file.
    syncService.resetMeta();
    return { success: true };
  });

  safeHandle('gdrive:listBackups', async () => {
    return googleDriveService.listBackups();
  });

  // Uploads the live database as the cloud copy (latest_backup.db). Goes
  // through the sync service so the sync state stays consistent, a local
  // backup is written afterwards, and the weekly snapshots are left alone.
  safeHandle('gdrive:uploadBackup', async () => {
    return syncService.manualUpload();
  });

  safeHandle(
    'gdrive:downloadBackup',
    async (_: IpcMainInvokeEvent, fileId: unknown, fileName: unknown) => {
      if (typeof fileId !== 'string' || !fileId) throw new Error(t('main.gdrive.invalidFileId'));
      if (typeof fileName !== 'string' || !fileName) throw new Error(t('main.gdrive.invalidFileName'));
      const backupDir = path.join(app.getPath('userData'), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const destPath = path.join(backupDir, fileName);
      if (!validateBackupPath(backupDir, destPath)) {
        throw new Error(t('main.gdrive.invalidFilePath'));
      }
      return googleDriveService.downloadBackup(fileId, destPath);
    }
  );

  safeHandle('gdrive:deleteBackup', async (_: IpcMainInvokeEvent, fileId: unknown) => {
    if (typeof fileId !== 'string' || !fileId) throw new Error(t('main.gdrive.invalidFileId'));
    return googleDriveService.deleteBackup(fileId);
  });
}
