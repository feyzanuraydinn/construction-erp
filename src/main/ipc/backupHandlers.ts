import { ipcMain, IpcMainInvokeEvent, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { DatabaseService, InvalidDatabaseError } from '../../database/DatabaseService';
import { syncService } from '../SyncService';
import { validateBackupPath } from '../../utils/security';
import { backupPathSchema } from '../../utils/schemas';
import { mainLogger } from '../logger';
import { t } from '../i18n';
import { safeHandle, toUserMessage } from './safeHandle';
import { backupDirectory, ensureBackupDirectory } from '../appPaths';

export function registerBackupHandlers(getDbService: () => DatabaseService): void {
  safeHandle(
    'backup:create',
    async () => {
      const backupDir = backupDirectory();
      mainLogger.info(`Creating backup in: ${backupDir}`, 'Backup');
      const backupPath = getDbService().createBackup(backupDir);
      mainLogger.info(`Local backup created: ${backupPath}`, 'Backup');

      void syncService.checkAndSync().catch((error) => {
        mainLogger.error('Sync after manual backup failed', 'Backup', error);
      });

      return backupPath;
    },
    { message: 'Backup creation failed', scope: 'Backup' }
  );

  safeHandle(
    'backup:list',
    () => {
      const backupDir = backupDirectory();
      if (!fs.existsSync(backupDir)) {
        return [];
      }
      return fs
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
    },
    { message: 'Backup list error', scope: 'Backup' }
  );

  ipcMain.handle('backup:restore', async (_: IpcMainInvokeEvent, rawBackupPath: unknown) => {
    try {
      const backupDir = backupDirectory();
      const parsedPath = backupPathSchema.safeParse(rawBackupPath);
      if (!parsedPath.success || !validateBackupPath(backupDir, parsedPath.data)) {
        return { success: false, error: t('error.backup.invalidPath') };
      }
      const backupPath = parsedPath.data;

      if (!fs.existsSync(backupPath)) {
        return { success: false, error: t('error.backup.fileNotFound') };
      }

      const dbService = getDbService();
      dbService.createSafetyCopy(backupDir, 'pre-restore');
      await dbService.loadFromBuffer(fs.readFileSync(backupPath));

      mainLogger.info(`Backup restored from: ${backupPath}`, 'Backup');
      return { success: true };
    } catch (error) {
      mainLogger.error('Backup restore failed', 'Backup', error);
      if (error instanceof InvalidDatabaseError) {
        return { success: false, error: t('error.db.databaseCorrupted') };
      }
      return { success: false, error: toUserMessage(error) };
    }
  });

  safeHandle(
    'backup:openFolder',
    () => {
      void shell.openPath(ensureBackupDirectory());
    },
    { message: 'Backup open folder error', scope: 'Backup' }
  );
}
