import { ipcMain, IpcMainInvokeEvent, dialog, shell, BrowserWindow } from 'electron';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { DatabaseService, InvalidDatabaseError } from '../../database/DatabaseService';
import { syncService } from '../SyncService';
import { validateBackupPath, sanitizeError } from '../../utils/security';
import { mainLogger } from '../logger';
import { t } from '../i18n';

export function registerBackupHandlers(
  getDbService: () => DatabaseService,
  getMainWindow: () => BrowserWindow | null
): void {
  ipcMain.handle('backup:create', async () => {
    const backupDir = path.join(app.getPath('userData'), 'backups');
    mainLogger.info(`Creating backup in: ${backupDir}`, 'Backup');

    try {
      const backupPath = getDbService().createBackup(backupDir);
      mainLogger.info(`Local backup created: ${backupPath}`, 'Backup');

      // Bring the cloud copy up to date through the normal sync cycle. It
      // detects conflicts with other devices instead of overwriting, and never
      // touches the weekly snapshots. Runs in the background; progress is
      // reported through sync status events.
      void syncService.checkAndSync().catch((error) => {
        mainLogger.error('Sync after manual backup failed', 'Backup', error);
      });

      return backupPath;
    } catch (error) {
      mainLogger.error('Backup creation failed', 'Backup', error);
      throw new Error(sanitizeError(error));
    }
  });

  ipcMain.handle('backup:list', () => {
    try {
      const backupDir = path.join(app.getPath('userData'), 'backups');
      if (!fs.existsSync(backupDir)) {
        return [];
      }
      const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.endsWith('.db'))
        .map((name) => {
          const filePath = path.join(backupDir, name);
          const stats = fs.statSync(filePath);
          return {
            name,
            path: filePath,
            size: stats.size,
            date: stats.mtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return files;
    } catch (error) {
      mainLogger.error('Backup list error', 'Backup', error);
      throw new Error(sanitizeError(error));
    }
  });

  ipcMain.handle('backup:restore', async (_: IpcMainInvokeEvent, backupPath: unknown) => {
    try {
      const backupDir = path.join(app.getPath('userData'), 'backups');
      if (typeof backupPath !== 'string' || !validateBackupPath(backupDir, backupPath)) {
        return { success: false, error: t('error.backup.invalidPath') };
      }

      if (!fs.existsSync(backupPath)) {
        return { success: false, error: t('error.backup.fileNotFound') };
      }

      const dbService = getDbService();
      // Keep the current state so a wrong restore can be undone.
      dbService.createSafetyCopy(backupDir, 'pre-restore');
      // Validates the backup and migrates it before swapping it in; on failure
      // the current database is left untouched and stays open.
      await dbService.loadFromBuffer(fs.readFileSync(backupPath));

      mainLogger.info(`Backup restored from: ${backupPath}`, 'Backup');
      return { success: true };
    } catch (error) {
      mainLogger.error('Backup restore failed', 'Backup', error);
      if (error instanceof InvalidDatabaseError) {
        return { success: false, error: t('error.db.databaseCorrupted') };
      }
      return { success: false, error: sanitizeError(error) };
    }
  });

  ipcMain.handle('backup:selectFolder', async () => {
    try {
      const mainWindow = getMainWindow();
      if (!mainWindow) return null;
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Backup Folder',
      });
      return result.canceled ? null : result.filePaths[0];
    } catch (error) {
      mainLogger.error('Backup select folder error', 'Backup', error);
      throw new Error(sanitizeError(error));
    }
  });

  ipcMain.handle('backup:openFolder', async () => {
    try {
      const backupDir = path.join(app.getPath('userData'), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      shell.openPath(backupDir);
    } catch (error) {
      mainLogger.error('Backup open folder error', 'Backup', error);
      throw new Error(sanitizeError(error));
    }
  });
}
