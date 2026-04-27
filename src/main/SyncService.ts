import { BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';
import type { DatabaseService } from '../database/DatabaseService';
import { googleDriveService } from './googleDrive';
import { mainLogger } from './logger';

export type SyncStatus =
  | 'disconnected' // Drive credentials not set or not authorized
  | 'offline' // No internet / Drive unreachable
  | 'synced' // Everything up to date
  | 'uploading' // Upload in progress
  | 'downloading' // Download in progress
  | 'pending' // Local has changes, waiting for next cycle
  | 'conflict' // Both local and remote changed since last sync — needs user
  | 'error'; // Last operation failed

export interface SyncMeta {
  remoteFileId: string | null;
  remoteModTimeAtLastSync: string | null; // ISO
  localSizeAtLastSync: number | null; // bytes
  localMtimeAtLastSync: string | null; // ISO — DB file mtime at the moment of the last sync
  lastSyncSuccess: string | null; // ISO
  autoSyncEnabled: boolean;
  lastSnapshotDate: string | null; // YYYY-MM-DD
}

export interface SyncStatusEvent {
  status: SyncStatus;
  message?: string;
  lastSyncSuccess?: string | null;
  nextCheckSeconds?: number | null;
  error?: string;
}

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const PING_INTERVAL_MS = 60 * 1000; // 1 minute offline check
const CLOSE_UPLOAD_TIMEOUT_MS = 10 * 1000; // 10 seconds
const SNAPSHOT_KEEP_COUNT = 4; // keep last 4 weekly snapshots
const SNAPSHOT_MIN_INTERVAL_DAYS = 7;

class SyncService {
  private dbService: DatabaseService | null = null;
  private mainWindow: BrowserWindow | null = null;
  private userDataPath: string = '';
  private metaPath: string = '';
  private meta: SyncMeta = {
    remoteFileId: null,
    remoteModTimeAtLastSync: null,
    localSizeAtLastSync: null,
    localMtimeAtLastSync: null,
    lastSyncSuccess: null,
    autoSyncEnabled: true,
    lastSnapshotDate: null,
  };
  private status: SyncStatus = 'disconnected';
  private lastError: string | null = null;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private pingHandle: ReturnType<typeof setInterval> | null = null;
  private isOnline = true;
  private isSyncing = false;

  init(dbService: DatabaseService, mainWindow: BrowserWindow, userDataPath: string): void {
    this.dbService = dbService;
    this.mainWindow = mainWindow;
    this.userDataPath = userDataPath;
    this.metaPath = path.join(userDataPath, 'sync-meta.json');
    this.loadMeta();
    this.recomputeStatus();
    this.emitStatus();
  }

  updateMainWindow(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
  }

  updateDbService(dbService: DatabaseService): void {
    this.dbService = dbService;
  }

  private loadMeta(): void {
    try {
      if (fs.existsSync(this.metaPath)) {
        const raw = fs.readFileSync(this.metaPath, 'utf-8');
        this.meta = { ...this.meta, ...JSON.parse(raw) };
      }
    } catch (error) {
      mainLogger.error('Sync meta load error', 'Sync', error);
    }
  }

  private saveMeta(): void {
    try {
      fs.writeFileSync(this.metaPath, JSON.stringify(this.meta, null, 2));
    } catch (error) {
      mainLogger.error('Sync meta save error', 'Sync', error);
    }
  }

  getMeta(): SyncMeta {
    return { ...this.meta };
  }

  setAutoSyncEnabled(enabled: boolean): void {
    this.meta.autoSyncEnabled = enabled;
    this.saveMeta();
    if (enabled) this.start();
    else this.stop();
  }

  getStatus(): SyncStatusEvent {
    return {
      status: this.status,
      lastSyncSuccess: this.meta.lastSyncSuccess,
      error: this.lastError || undefined,
    };
  }

  private recomputeStatus(): void {
    if (!googleDriveService.hasCredentials() || !googleDriveService.isConnected()) {
      this.status = 'disconnected';
      return;
    }
    if (!this.isOnline) {
      this.status = 'offline';
      return;
    }
    if (this.isSyncing) return; // stays as uploading/downloading
    if (this.dbService && this.dbService.isDirty()) {
      this.status = 'pending';
      return;
    }
    this.status = 'synced';
  }

  private emitStatus(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    const payload: SyncStatusEvent = {
      status: this.status,
      lastSyncSuccess: this.meta.lastSyncSuccess,
      error: this.lastError || undefined,
    };
    try {
      this.mainWindow.webContents.send('sync:status', payload);
    } catch {
      // window gone
    }
  }

  private setStatus(status: SyncStatus, error?: string): void {
    this.status = status;
    this.lastError = error || null;
    this.emitStatus();
  }

  start(): void {
    this.stop();
    if (!this.meta.autoSyncEnabled) {
      mainLogger.info('Auto sync disabled, not starting interval', 'Sync');
      return;
    }
    mainLogger.info('Starting sync service', 'Sync');

    // Kick off first check shortly after start
    setTimeout(() => void this.checkAndSync().catch(() => undefined), 5000);

    this.intervalHandle = setInterval(() => {
      void this.checkAndSync().catch(() => undefined);
    }, SYNC_INTERVAL_MS);

    this.pingHandle = setInterval(() => {
      void this.updateOnlineStatus().catch(() => undefined);
    }, PING_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    if (this.pingHandle) {
      clearInterval(this.pingHandle);
      this.pingHandle = null;
    }
  }

  private async updateOnlineStatus(): Promise<void> {
    if (!googleDriveService.isConnected()) return;
    const online = await googleDriveService.ping();
    if (online !== this.isOnline) {
      this.isOnline = online;
      this.recomputeStatus();
      this.emitStatus();
    }
  }

  /**
   * Single sync cycle:
   * 1. Check remote modifiedTime vs our last-known
   * 2. Check local dirty vs our last-known
   * 3. Decide action: upload / download / conflict / nothing
   */
  async checkAndSync(): Promise<void> {
    if (this.isSyncing) return;
    if (!this.dbService) return;
    if (!googleDriveService.hasCredentials() || !googleDriveService.isConnected()) {
      this.setStatus('disconnected');
      return;
    }

    this.isSyncing = true;
    try {
      const remote = await googleDriveService.getLatestFile();

      if (!remote) {
        // Remote empty — upload our DB
        this.isOnline = true;
        await this.performUpload();
        return;
      }

      this.isOnline = true;

      const remoteChanged =
        this.meta.remoteModTimeAtLastSync === null ||
        (remote.modifiedTime !== this.meta.remoteModTimeAtLastSync &&
          new Date(remote.modifiedTime).getTime() > new Date(this.meta.remoteModTimeAtLastSync).getTime());

      // Combines the in-memory dirty flag with a persisted DB-mtime check, so
      // changes made before a previous restart are still detected as "local
      // change pending upload" after the app re-launches.
      const localChanged = this.hasLocalChangesPending();

      if (localChanged && remoteChanged) {
        // CONFLICT — ask user
        this.setStatus('conflict');
        this.emitConflict(remote);
      } else if (localChanged && !remoteChanged) {
        await this.performUpload();
      } else if (!localChanged && remoteChanged) {
        await this.performDownload(remote.id);
      } else {
        // Both in sync
        this.setStatus('synced');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      mainLogger.error('Sync cycle error', 'Sync', error);
      this.setStatus('error', msg);
    } finally {
      this.isSyncing = false;
    }
  }

  private emitConflict(remote: { id: string; modifiedTime: string; size: string }): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    try {
      this.mainWindow.webContents.send('sync:conflict', {
        remoteModifiedTime: remote.modifiedTime,
        remoteSize: remote.size,
        lastSyncSuccess: this.meta.lastSyncSuccess,
      });
    } catch {
      // ignore
    }
  }

  async resolveConflict(choice: 'use-local' | 'use-remote' | 'cancel'): Promise<{ success: boolean; error?: string }> {
    if (!this.dbService) return { success: false, error: 'DB servisi başlatılmamış.' };

    if (choice === 'cancel') {
      this.setStatus('pending');
      return { success: true };
    }

    if (this.isSyncing) return { success: false, error: 'Senkronizasyon zaten devam ediyor.' };

    this.isSyncing = true;
    try {
      if (choice === 'use-local') {
        const result = await this.doUpload(true);
        return result;
      } else {
        const remote = await googleDriveService.getLatestFile();
        if (!remote) return { success: false, error: 'Buluttaki dosya bulunamadı.' };
        const result = await this.doDownload(remote.id);
        return result;
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async performUpload(): Promise<void> {
    const result = await this.doUpload(false);
    if (!result.success) {
      this.setStatus('error', result.error);
    }
  }

  private async performDownload(fileId: string): Promise<void> {
    const result = await this.doDownload(fileId);
    if (!result.success) {
      this.setStatus('error', result.error);
    }
  }

  private async doUpload(_forceOverride: boolean): Promise<{ success: boolean; error?: string }> {
    if (!this.dbService) return { success: false, error: 'DB servisi başlatılmamış.' };

    this.setStatus('uploading');
    try {
      // Ensure DB is persisted to disk before upload
      this.dbService.save();
      const dbPath = this.dbService.getDbPath();
      if (!dbPath || !fs.existsSync(dbPath)) {
        return { success: false, error: 'Veritabanı dosyası bulunamadı.' };
      }

      const uploadResult = await googleDriveService.uploadLatest(dbPath);
      if (!uploadResult.success) {
        this.setStatus('error', uploadResult.error);
        return { success: false, error: uploadResult.error };
      }

      // Update meta
      this.meta.remoteFileId = uploadResult.fileId || null;
      this.meta.remoteModTimeAtLastSync = uploadResult.modifiedTime || new Date().toISOString();
      this.meta.lastSyncSuccess = new Date().toISOString();
      const uploadedStat = fs.statSync(dbPath);
      this.meta.localSizeAtLastSync = uploadedStat.size;
      this.meta.localMtimeAtLastSync = uploadedStat.mtime.toISOString();
      this.saveMeta();

      // Clear dirty flag (data is now backed up)
      this.dbService.clearDirty();

      // Mirror the just-uploaded state into the local backup file so the
      // on-disk backup, the live DB and the cloud copy all match.
      try {
        const backupDir = path.join(this.userDataPath, 'backups');
        this.dbService.createBackup(backupDir);
        mainLogger.info('Local backup updated to match uploaded cloud copy', 'Sync');
      } catch (backupErr) {
        mainLogger.error('Post-upload backup mirror failed', 'Sync', backupErr);
      }

      // Weekly snapshot check
      await this.maybeSnapshot(dbPath);

      this.setStatus('synced');
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.setStatus('error', msg);
      return { success: false, error: msg };
    }
  }

  private async doDownload(fileId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.dbService) return { success: false, error: 'DB servisi başlatılmamış.' };

    this.setStatus('downloading');
    try {
      const tempDir = path.join(app.getPath('temp'), 'construction-erp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const tempPath = path.join(tempDir, 'drive-download.tmp.db');
      const result = await googleDriveService.downloadFile(fileId, tempPath);
      if (!result.success) {
        this.setStatus('error', result.error);
        return { success: false, error: result.error };
      }

      // Load into DB
      const buffer = fs.readFileSync(tempPath);
      await this.dbService.loadFromBuffer(buffer);
      this.dbService.save();
      this.dbService.clearDirty();

      // Mirror the freshly-downloaded state into the local backup file. This
      // guarantees the on-disk backup, the live DB, and the cloud copy all
      // hold the same content after a successful download.
      try {
        const backupDir = path.join(this.userDataPath, 'backups');
        this.dbService.createBackup(backupDir);
        mainLogger.info('Local backup updated to match downloaded cloud copy', 'Sync');
      } catch (backupErr) {
        mainLogger.error('Post-download backup mirror failed', 'Sync', backupErr);
      }

      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore
      }

      // Update meta from remote file's actual modifiedTime
      const remote = await googleDriveService.getLatestFile();
      this.meta.remoteFileId = remote?.id || fileId;
      this.meta.remoteModTimeAtLastSync = remote?.modifiedTime || new Date().toISOString();
      this.meta.lastSyncSuccess = new Date().toISOString();
      const dbPathNow = this.dbService.getDbPath();
      if (dbPathNow && fs.existsSync(dbPathNow)) {
        const downloadedStat = fs.statSync(dbPathNow);
        this.meta.localSizeAtLastSync = downloadedStat.size;
        this.meta.localMtimeAtLastSync = downloadedStat.mtime.toISOString();
      }
      this.saveMeta();

      this.setStatus('synced');

      // Notify renderer to reload data
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('sync:reload-required');
      }
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.setStatus('error', msg);
      return { success: false, error: msg };
    }
  }

  private async maybeSnapshot(dbPath: string): Promise<void> {
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (this.meta.lastSnapshotDate) {
        const last = new Date(this.meta.lastSnapshotDate);
        const days = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
        if (days < SNAPSHOT_MIN_INTERVAL_DAYS) return;
      }
      const result = await googleDriveService.uploadSnapshot(dbPath);
      if (result.success) {
        this.meta.lastSnapshotDate = today;
        this.saveMeta();
        await googleDriveService.rotateSnapshots(SNAPSHOT_KEEP_COUNT);
        mainLogger.info('Weekly snapshot uploaded', 'Sync');
      }
    } catch (error) {
      mainLogger.error('Snapshot error', 'Sync', error);
    }
  }

  /**
   * Returns true if there is locally-changed data that has not yet been
   * uploaded to the cloud. Combines the in-memory `dirty` flag with a
   * persisted DB-mtime comparison so the answer survives an app restart.
   */
  private hasLocalChangesPending(): boolean {
    if (!this.dbService) return false;
    if (this.dbService.isDirty()) return true;
    const dbPath = this.dbService.getDbPath();
    if (!dbPath || !fs.existsSync(dbPath)) return false;
    const stat = fs.statSync(dbPath);
    const lastMtime = this.meta.localMtimeAtLastSync
      ? new Date(this.meta.localMtimeAtLastSync).getTime()
      : 0;
    return stat.mtimeMs > lastMtime + 1000;
  }

  /**
   * Called on app close. If we have local changes that haven't been pushed
   * to the cloud, attempt an upload with a short timeout so the user is not
   * blocked waiting on a flaky network.
   */
  async beforeQuit(): Promise<{ canQuit: boolean; uploaded: boolean; error?: string }> {
    if (!this.dbService) return { canQuit: true, uploaded: false };
    if (!this.hasLocalChangesPending()) return { canQuit: true, uploaded: false };
    if (!googleDriveService.hasCredentials() || !googleDriveService.isConnected()) {
      return { canQuit: true, uploaded: false };
    }
    if (!this.meta.autoSyncEnabled) {
      return { canQuit: true, uploaded: false };
    }

    try {
      const uploadPromise = this.doUpload(false);
      const timeoutPromise = new Promise<{ success: boolean; error?: string }>((resolve) =>
        setTimeout(() => resolve({ success: false, error: 'timeout' }), CLOSE_UPLOAD_TIMEOUT_MS)
      );
      const result = await Promise.race([uploadPromise, timeoutPromise]);
      return {
        canQuit: result.success,
        uploaded: result.success,
        error: result.error,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { canQuit: false, uploaded: false, error: msg };
    }
  }

  /** Manual force upload (button in Settings) */
  async manualUpload(): Promise<{ success: boolean; error?: string }> {
    if (this.isSyncing) return { success: false, error: 'Senkronizasyon zaten devam ediyor.' };
    this.isSyncing = true;
    try {
      return await this.doUpload(true);
    } finally {
      this.isSyncing = false;
    }
  }

  /** Manual force download (button in Settings) */
  async manualDownload(): Promise<{ success: boolean; error?: string }> {
    if (this.isSyncing) return { success: false, error: 'Senkronizasyon zaten devam ediyor.' };
    const remote = await googleDriveService.getLatestFile();
    if (!remote) return { success: false, error: 'Buluttaki dosya bulunamadı.' };
    this.isSyncing = true;
    try {
      return await this.doDownload(remote.id);
    } finally {
      this.isSyncing = false;
    }
  }

  /** Resets meta — called after disconnect */
  resetMeta(): void {
    this.meta = {
      remoteFileId: null,
      remoteModTimeAtLastSync: null,
      localSizeAtLastSync: null,
      localMtimeAtLastSync: null,
      lastSyncSuccess: null,
      autoSyncEnabled: this.meta.autoSyncEnabled,
      lastSnapshotDate: null,
    };
    this.saveMeta();
    this.setStatus('disconnected');
  }
}

export const syncService = new SyncService();
export default syncService;

// Helper: get user data path for main to pass in
export function getSyncUserDataPath(): string {
  return app.getPath('userData');
}
