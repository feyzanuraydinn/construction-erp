import { IpcMainInvokeEvent, BrowserWindow } from 'electron';
import path from 'path';
import { googleDriveService } from '../googleDrive';
import { syncService } from '../SyncService';
import { gdriveCredentialsSchema, driveDownloadSchema, parseInput } from '../../utils/schemas';
import { validateBackupPath } from '../../utils/security';
import { safeHandle } from './safeHandle';
import { t } from '../i18n';
import { ensureBackupDirectory } from '../appPaths';
import { UserFacingError } from '../../utils/userFacingError';

export function registerGdriveHandlers(): void {
  safeHandle('gdrive:hasCredentials', () => googleDriveService.hasCredentials());
  safeHandle('gdrive:isConnected', () => googleDriveService.isConnected());

  safeHandle(
    'gdrive:saveCredentials',
    (_: IpcMainInvokeEvent, clientId: unknown, clientSecret: unknown) => {
      const credentials = parseInput(gdriveCredentialsSchema, { clientId, clientSecret });
      googleDriveService.saveCredentials(credentials.clientId, credentials.clientSecret);
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
    syncService.resetMeta();
    return { success: true };
  });

  safeHandle('gdrive:listBackups', async () => {
    return googleDriveService.listBackups();
  });

  safeHandle('gdrive:uploadBackup', async () => {
    return syncService.manualUpload();
  });

  safeHandle(
    'gdrive:downloadBackup',
    async (_: IpcMainInvokeEvent, rawFileId: unknown, rawFileName: unknown) => {
      const { fileId, fileName } = parseInput(driveDownloadSchema, {
        fileId: rawFileId,
        fileName: rawFileName,
      });
      const backupDir = ensureBackupDirectory();
      const destPath = path.join(backupDir, fileName);
      if (!validateBackupPath(backupDir, destPath)) {
        throw new UserFacingError(t('main.gdrive.invalidFilePath'));
      }
      return googleDriveService.downloadFile(fileId, destPath);
    }
  );
}
