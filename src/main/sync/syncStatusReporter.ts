import { googleDriveService } from '../googleDrive';
import { mainLogger } from '../logger';
import type { SyncConflictPayload, SyncStatusPayload, SyncStatusValue } from '../../types/sync';
import type { SyncMetaStore } from './syncMetaStore';
import type { RemoteFile } from './syncTransfers';

export interface SyncStatusHost {
  isSyncing(): boolean;
  isDirty(): boolean;
  send(
    channel: string,
    payload: SyncStatusPayload | SyncConflictPayload,
    failureMessage: string
  ): void;
}

export function isDriveReady(): boolean {
  return googleDriveService.hasCredentials() && googleDriveService.isConnected();
}

export class SyncStatusReporter {
  private status: SyncStatusValue = 'disconnected';
  private lastError: string | null = null;
  private authExpired = false;
  private online = true;

  constructor(
    private readonly metaStore: SyncMetaStore,
    private readonly host: SyncStatusHost
  ) {}

  payload(): SyncStatusPayload {
    return {
      status: this.status,
      lastSyncSuccess: this.metaStore.meta.lastSyncSuccess,
      error: this.lastError || undefined,
      driveRequired: this.metaStore.meta.driveLinked === true,
      reason: this.status === 'disconnected' && this.authExpired ? 'expired' : undefined,
    };
  }

  private recompute(): void {
    if (!isDriveReady()) {
      this.status = 'disconnected';
      return;
    }
    if (!this.online) {
      this.status = 'offline';
      return;
    }
    if (this.host.isSyncing()) return;
    if (this.host.isDirty()) {
      this.status = 'pending';
      return;
    }
    this.status = 'synced';
  }

  private emit(): void {
    this.host.send('sync:status', this.payload(), 'Could not send the sync status to the window');
  }

  refresh(): void {
    this.recompute();
    this.emit();
  }

  set(status: SyncStatusValue, error?: string): void {
    const disconnected = status === 'error' && !googleDriveService.isConnected();
    this.status = disconnected ? 'disconnected' : status;
    this.lastError = disconnected ? null : error || null;
    this.emit();
  }

  conflict(remote: RemoteFile): void {
    this.set('conflict');
    const payload = {
      remoteModifiedTime: remote.modifiedTime,
      remoteSize: remote.size,
      lastSyncSuccess: this.metaStore.meta.lastSyncSuccess,
    };
    this.host.send('sync:conflict', payload, 'Could not send the sync conflict to the window');
  }

  authLost(): void {
    this.authExpired = true;
    mainLogger.warn('Google Drive sign-in expired or was revoked', 'Sync');
    this.set('disconnected');
  }

  reconnected(): void {
    this.authExpired = false;
    this.online = true;
    this.refresh();
  }

  markOnline(): void {
    this.online = true;
  }

  updateOnline(online: boolean): void {
    if (online === this.online) return;
    this.online = online;
    this.refresh();
  }
}
