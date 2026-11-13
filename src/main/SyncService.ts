import path from 'path';
import type { DatabaseService } from '../database/DatabaseService';
import { googleDriveService } from './googleDrive';
import { mainLogger } from './logger';
import { t } from './i18n';
import type { SyncConflictPayload, SyncStatusPayload } from '../types/sync';
import type { ConflictChoice } from '../utils/schemas';
import { errorText } from '../utils/errorText';
import { SyncMetaStore } from './sync/syncMetaStore';
import { SyncScheduler } from './sync/syncScheduler';
import { SyncTransfers, type QuitUploadResult, type TransferResult } from './sync/syncTransfers';
import { removeStaleTempFiles, syncErrorMessage } from './sync/syncHelpers';
import { SyncStatusReporter, isDriveReady } from './sync/syncStatusReporter';
import { planSync } from './sync/syncPlan';

export interface SyncMeta {
  remoteFileId: string | null;
  remoteModTimeAtLastSync: string | null;
  localSizeAtLastSync: number | null;
  localMtimeAtLastSync: string | null;
  localHashAtLastSync: string | null;
  lastSyncSuccess: string | null;
  autoSyncEnabled: boolean;
  lastSnapshotDate: string | null;
  driveLinked: boolean | null;
}

export interface SyncWindow {
  isDestroyed(): boolean;
  webContents: { send(channel: string, ...args: unknown[]): void };
}

export class SyncService {
  private dbService: DatabaseService | null = null;
  private mainWindow: SyncWindow | null = null;
  private userDataPath: string = '';
  private readonly metaStore = new SyncMetaStore();
  private readonly scheduler = new SyncScheduler();
  private readonly reporter = new SyncStatusReporter(this.metaStore, {
    isSyncing: () => this.isSyncing,
    isDirty: () => this.dbService !== null && this.dbService.isDirty(),
    send: (channel, payload, failureMessage) => this.sendToWindow(channel, payload, failureMessage),
  });
  private readonly transfers = new SyncTransfers(this.metaStore, {
    database: () => this.dbService,
    backupDir: () => path.join(this.userDataPath, 'backups'),
    setStatus: (status, error) => this.reporter.set(status, error),
    notifyReloadRequired: () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('sync:reload-required');
      }
    },
  });
  private unsubscribeAuthLost: (() => void) | null = null;
  private isSyncing = false;

  private get meta(): SyncMeta {
    return this.metaStore.meta;
  }

  init(dbService: DatabaseService, mainWindow: SyncWindow, userDataPath: string): void {
    this.dbService = dbService;
    this.mainWindow = mainWindow;
    this.userDataPath = userDataPath;
    this.metaStore.load(path.join(userDataPath, 'sync-meta.json'));
    if (this.meta.driveLinked === null) {
      this.meta.driveLinked =
        googleDriveService.isConnected() || this.meta.lastSyncSuccess !== null;
      if (this.meta.driveLinked) this.metaStore.save();
    }
    this.unsubscribeAuthLost?.();
    this.unsubscribeAuthLost = googleDriveService.onAuthLost(() => this.reporter.authLost());
    removeStaleTempFiles();
    this.reporter.refresh();
  }

  markConnected(): void {
    this.meta.driveLinked = true;
    this.metaStore.save();
    this.reporter.reconnected();
    this.runInBackground(this.checkAndSync(), 'Sync check failed');
  }

  updateMainWindow(mainWindow: SyncWindow): void {
    this.mainWindow = mainWindow;
  }

  updateDbService(dbService: DatabaseService): void {
    this.dbService = dbService;
  }

  getStatus(): SyncStatusPayload {
    return this.reporter.payload();
  }

  private sendToWindow(
    channel: string,
    payload: SyncStatusPayload | SyncConflictPayload,
    failureMessage: string
  ): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    try {
      this.mainWindow.webContents.send(channel, payload);
    } catch (error) {
      mainLogger.warn(failureMessage, 'Sync', errorText(error));
    }
  }

  start(): void {
    this.stop();
    if (!this.meta.autoSyncEnabled) {
      mainLogger.info('Auto sync disabled, not starting interval', 'Sync');
      return;
    }
    mainLogger.info('Starting sync service', 'Sync');
    this.scheduler.start(
      () => this.runInBackground(this.checkAndSync(), 'Sync check failed'),
      () => this.runInBackground(this.updateOnlineStatus(), 'Online check failed')
    );
  }

  private runInBackground(task: Promise<void>, failureMessage: string): void {
    task.catch((error: unknown) => mainLogger.error(failureMessage, 'Sync', error));
  }

  stop(): void {
    this.scheduler.stop();
  }

  private async updateOnlineStatus(): Promise<void> {
    if (!googleDriveService.isConnected()) return;
    this.reporter.updateOnline(await googleDriveService.ping());
  }

  async checkAndSync(): Promise<void> {
    if (this.isSyncing) return;
    if (!this.dbService) return;
    if (!isDriveReady()) {
      this.reporter.set('disconnected');
      return;
    }

    this.isSyncing = true;
    try {
      const remote = await googleDriveService.getLatestFile();
      this.reporter.markOnline();
      const step = planSync(remote, this.meta, () =>
        this.metaStore.hasLocalChanges(this.dbService)
      );

      if (step.action === 'conflict') {
        this.reporter.conflict(step.remote);
      } else if (step.action === 'upload') {
        this.reportFailure(await this.transfers.upload());
      } else if (step.action === 'download') {
        this.reportFailure(await this.transfers.download(step.remote));
      } else {
        this.reporter.set('synced');
      }
    } catch (error) {
      mainLogger.error('Sync cycle error', 'Sync', error);
      this.reporter.set('error', syncErrorMessage(error));
    } finally {
      this.isSyncing = false;
    }
  }

  private reportFailure(result: TransferResult): void {
    if (!result.success) {
      this.reporter.set('error', result.error);
    }
  }

  async resolveConflict(choice: ConflictChoice): Promise<TransferResult> {
    if (!this.dbService) return { success: false, error: t('main.sync.dbNotReady') };

    if (choice === 'cancel') {
      this.reporter.set('pending');
      return { success: true };
    }

    return this.runExclusive(async () => {
      try {
        if (choice === 'use-local') {
          return await this.transfers.upload();
        }
        return await this.transfers.downloadLatest();
      } catch (error) {
        return this.transfers.failed(error);
      }
    });
  }

  private async runExclusive(task: () => Promise<TransferResult>): Promise<TransferResult> {
    if (this.isSyncing) return { success: false, error: t('main.sync.busy') };
    this.isSyncing = true;
    try {
      return await task();
    } finally {
      this.isSyncing = false;
    }
  }

  async beforeQuit(): Promise<QuitUploadResult> {
    if (
      !this.dbService ||
      !this.metaStore.hasLocalChanges(this.dbService) ||
      !isDriveReady() ||
      !this.meta.autoSyncEnabled
    ) {
      return { canQuit: true, uploaded: false };
    }
    return this.transfers.uploadBeforeQuit();
  }

  async manualUpload(): Promise<TransferResult> {
    return this.runExclusive(() => this.transfers.upload());
  }

  resetMeta(): void {
    this.metaStore.reset();
    this.reporter.set('disconnected');
  }
}

export const syncService = new SyncService();
