import { isRemoteNewer } from './syncHelpers';
import type { SyncMetaStore } from './syncMetaStore';
import type { RemoteFile } from './syncTransfers';

export type SyncStep =
  | { action: 'upload' }
  | { action: 'download'; remote: RemoteFile }
  | { action: 'conflict'; remote: RemoteFile }
  | { action: 'none' };

type SyncedRemoteState = Pick<SyncMetaStore['meta'], 'remoteFileId' | 'remoteModTimeAtLastSync'>;

export function planSync(
  remote: RemoteFile | null,
  synced: SyncedRemoteState,
  hasLocalChanges: () => boolean
): SyncStep {
  if (!remote) return { action: 'upload' };
  if (synced.remoteFileId !== null && remote.id !== synced.remoteFileId) {
    return { action: 'conflict', remote };
  }

  const remoteChanged = isRemoteNewer(remote.modifiedTime, synced.remoteModTimeAtLastSync);
  const localChanged = hasLocalChanges();

  if (localChanged && remoteChanged) return { action: 'conflict', remote };
  if (localChanged) return { action: 'upload' };
  if (remoteChanged) return { action: 'download', remote };
  return { action: 'none' };
}
