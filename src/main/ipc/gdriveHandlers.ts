import { IpcMainInvokeEvent } from 'electron';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { DatabaseService } from '../../database/DatabaseService';
import { googleDriveService } from '../googleDrive';
import { gdriveCredentialsSchema, validateInput } from '../../utils/schemas';
import { validateBackupPath } from '../../utils/security';
import { safeHandle } from './safeHandle';
import { t } from '../i18n';

export function registerGdriveHandlers(getDbService: () => DatabaseService): void {
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
    return googleDriveService.startAuth();
  });

  safeHandle('gdrive:disconnect', async () => {
    await googleDriveService.disconnect();
    return { success: true };
  });

  safeHandle('gdrive:listBackups', async () => {
    return googleDriveService.listBackups();
  });

  safeHandle('gdrive:uploadBackup', async () => {
    const backupDir = path.join(app.getPath('userData'), 'backups');
    const backupPath = getDbService().createBackup(backupDir);
    return googleDriveService.uploadBackup(backupPath);
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
