export type SyncStatusValue =
  | 'disconnected'
  | 'offline'
  | 'synced'
  | 'uploading'
  | 'downloading'
  | 'pending'
  | 'conflict'
  | 'error';

export interface SyncStatusPayload {
  status: SyncStatusValue;
  message?: string;
  lastSyncSuccess?: string | null;
  nextCheckSeconds?: number | null;
  error?: string;
  driveRequired?: boolean;
  reason?: 'expired';
}

export interface SyncConflictPayload {
  remoteModifiedTime: string;
  remoteSize: string;
  lastSyncSuccess: string | null;
}
