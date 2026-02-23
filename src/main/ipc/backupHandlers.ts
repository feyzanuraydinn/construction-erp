import { ipcMain, IpcMainInvokeEvent, dialog, shell, BrowserWindow } from 'electron';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { DatabaseService } from '../../database/DatabaseService';
import { googleDriveService } from '../googleDrive';
import { validateBackupPath, sanitizeError } from '../../utils/security';
import { mainLogger } from '../logger';

export function registerBackupHandlers(
  getDbService: () => DatabaseService,
  setDbService: (s: DatabaseService) => void,
  getMainWindow: () => BrowserWindow | null,
  checkInternetConnection: () => Promise<boolean>
): void {
  ipcMain.handle('backup:create', async () => {
    const backupDir = path.join(app.getPath('userData'), 'backups');
    mainLogger.info(`Creating backup in: ${backupDir}`, 'Backup');

    try {
      const backupPath = getDbService().createBackup(backupDir);
      mainLogger.info(`Local backup created: ${backupPath}`, 'Backup');

      // Cloud sync if connected
      if (googleDriveService.hasCredentials() && googleDriveService.isConnected()) {
        const hasInternet = await checkInternetConnection();
        if (hasInternet) {
          try {
            await googleDriveService.uploadBackup(backupPath);
            mainLogger.info('Backup synced to Google Drive', 'Backup');
          } catch (cloudError) {
            mainLogger.error('Cloud sync failed', 'Backup', cloudError);
          }
        } else {
          mainLogger.info('No internet - local backup only', 'Backup');
        }
      } else {
        mainLogger.info('Google Drive not connected - local backup only', 'Backup');
      }

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

  ipcMain.handle('backup:restore', async (_: IpcMainInvokeEvent, backupPath: string) => {
    try {
      const backupDir = path.join(app.getPath('userData'), 'backups');
      if (!validateBackupPath(backupDir, backupPath)) {
        return { success: false, error: 'error.backup.invalidPath' };
      }

      if (!fs.existsSync(backupPath)) {
        return { success: false, error: 'error.backup.fileNotFound' };
      }

      // Close current database connection
      getDbService().close();

      // Copy backup file to database location
      const dbDir = path.join(app.getPath('userData'), 'data');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      const dbPath = path.join(dbDir, 'insaat-erp.db');
      fs.copyFileSync(backupPath, dbPath);

      // Reinitialize database
      const newDbService = new DatabaseService();
      await newDbService.init(app.getPath('userData'));
      setDbService(newDbService);

      return { success: true };
    } catch (error) {
      mainLogger.error('Backup restore failed', 'Backup', error);
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
