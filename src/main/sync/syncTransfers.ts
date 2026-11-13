import fs from 'fs';
import { InvalidDatabaseError, type DatabaseService } from '../../database/DatabaseService';
import { googleDriveService } from '../googleDrive';
import { mainLogger } from '../logger';
import { t } from '../i18n';
import type { SyncStatusValue } from '../../types/sync';
import { tempFilePath } from '../appPaths';
import { toLocalDateString } from '../../utils/dates';
import { syncErrorMessage } from './syncHelpers';
import type { SyncMetaStore } from './syncMetaStore';

const CLOSE_UPLOAD_TIMEOUT_MS = 10 * 1000;
const SNAPSHOT_KEEP_COUNT = 4;
const SNAPSHOT_MIN_INTERVAL_DAYS = 7;

export interface RemoteFile {
  id: string;
  modifiedTime: string;
  size: string;
}

export interface TransferResult {
  success: boolean;
  error?: string;
}

export interface QuitUploadResult {
  canQuit: boolean;
  uploaded: boolean;
  error?: string;
}

export interface SyncTransferHost {
  database(): DatabaseService | null;
  backupDir(): string;
  setStatus(status: SyncStatusValue, error?: string): void;
  notifyReloadRequired(): void;
}

export class SyncTransfers {
  constructor(
    private readonly metaStore: SyncMetaStore,
    private readonly host: SyncTransferHost
  ) {}

  private mirrorBackup(direction: 'upload' | 'download'): void {
    const dbService = this.host.database();
    if (!dbService) return;
    try {
      dbService.createBackup(this.host.backupDir());
      mainLogger.info(`Local backup updated to match the cloud copy (${direction})`, 'Sync');
    } catch (error) {
      mainLogger.error(`Post-${direction} backup mirror failed`, 'Sync', error);
    }
  }

  failed(error: unknown): { success: false; error: string } {
    mainLogger.error('Sync transfer failed', 'Sync', error);
    const msg = syncErrorMessage(error);
    this.host.setStatus('error', msg);
    return { success: false, error: msg };
  }

  async downloadLatest(): Promise<TransferResult> {
    const remote = await googleDriveService.getLatestFile();
    if (!remote) return { success: false, error: t('main.sync.remoteNotFound') };
    return this.download(remote);
  }

  async upload(): Promise<TransferResult> {
    const dbService = this.host.database();
    if (!dbService) return { success: false, error: t('main.sync.dbNotReady') };

    this.host.setStatus('uploading');
    let uploadPath: string | null = null;
    try {
      dbService.save();
      const dbPath = dbService.getDbPath();
      if (!dbPath || !fs.existsSync(dbPath)) {
        const error = t('main.sync.dbFileMissing');
        this.host.setStatus('error', error);
        return { success: false, error };
      }

      const bytes = fs.readFileSync(dbPath);
      const stat = fs.statSync(dbPath);
      uploadPath = tempFilePath(`upload-${process.pid}-${Date.now()}.db`);
      fs.writeFileSync(uploadPath, bytes);

      const uploadResult = await googleDriveService.uploadLatest(uploadPath);
      if (!uploadResult.success) {
        this.host.setStatus('error', uploadResult.error);
        return { success: false, error: uploadResult.error };
      }

      this.metaStore.recordSync(
        uploadResult.fileId || null,
        uploadResult.modifiedTime,
        bytes,
        stat.mtime
      );
      dbService.clearDirty();
      this.mirrorBackup('upload');

      await this.maybeSnapshot(uploadPath);

      this.host.setStatus('synced');
      return { success: true };
    } catch (error) {
      return this.failed(error);
    } finally {
      if (uploadPath) fs.rmSync(uploadPath, { force: true });
    }
  }

  async download(remote: RemoteFile): Promise<TransferResult> {
    const dbService = this.host.database();
    if (!dbService) return { success: false, error: t('main.sync.dbNotReady') };

    this.host.setStatus('downloading');
    const tempPath = tempFilePath(`download-${process.pid}-${Date.now()}.db`);
    try {
      const result = await googleDriveService.downloadFile(remote.id, tempPath);
      if (!result.success) {
        this.host.setStatus('error', result.error);
        return { success: false, error: result.error };
      }

      const buffer = fs.readFileSync(tempPath);
      const expectedSize = Number(remote.size);
      if (Number.isFinite(expectedSize) && expectedSize > 0 && buffer.length !== expectedSize) {
        throw new InvalidDatabaseError(
          `downloaded ${buffer.length} bytes, cloud copy has ${expectedSize}`
        );
      }

      dbService.createSafetyCopy(this.host.backupDir(), 'pre-download');

      await dbService.loadFromBuffer(buffer);
      dbService.clearDirty();
      this.mirrorBackup('download');

      const dbPathNow = dbService.getDbPath();
      const savedLocally = dbPathNow !== null && fs.existsSync(dbPathNow);
      this.metaStore.recordSync(
        remote.id,
        remote.modifiedTime,
        savedLocally ? fs.readFileSync(dbPathNow) : null,
        savedLocally ? fs.statSync(dbPathNow).mtime : null
      );

      this.host.setStatus('synced');
      this.host.notifyReloadRequired();
      return { success: true };
    } catch (error) {
      return this.failed(error);
    } finally {
      fs.rmSync(tempPath, { force: true });
    }
  }

  async uploadBeforeQuit(): Promise<QuitUploadResult> {
    try {
      const uploadPromise = this.upload();
      const timeoutPromise = new Promise<TransferResult>((resolve) =>
        setTimeout(() => resolve({ success: false, error: 'timeout' }), CLOSE_UPLOAD_TIMEOUT_MS)
      );
      const result = await Promise.race([uploadPromise, timeoutPromise]);
      return {
        canQuit: result.success,
        uploaded: result.success,
        error: result.error,
      };
    } catch (error) {
      mainLogger.error('Upload before quit failed', 'Sync', error);
      return { canQuit: false, uploaded: false, error: syncErrorMessage(error) };
    }
  }

  private async maybeSnapshot(filePath: string): Promise<void> {
    try {
      const today = toLocalDateString();
      if (this.metaStore.meta.lastSnapshotDate) {
        const last = new Date(this.metaStore.meta.lastSnapshotDate);
        const days = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
        if (days < SNAPSHOT_MIN_INTERVAL_DAYS) return;
      }
      const result = await googleDriveService.uploadSnapshot(filePath);
      if (result.success) {
        this.metaStore.meta.lastSnapshotDate = today;
        this.metaStore.save();
        await googleDriveService.rotateSnapshots(SNAPSHOT_KEEP_COUNT);
        mainLogger.info('Weekly snapshot uploaded', 'Sync');
      }
    } catch (error) {
      mainLogger.error('Snapshot error', 'Sync', error);
    }
  }
}
