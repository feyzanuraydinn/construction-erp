import crypto from 'crypto';
import fs from 'fs';
import { z } from 'zod';
import type { DatabaseService } from '../../database/DatabaseService';
import { mainLogger } from '../logger';

const syncMetaSchema = z.object({
  remoteFileId: z.string().nullable(),
  remoteModTimeAtLastSync: z.string().nullable(),
  localSizeAtLastSync: z.number().nullable(),
  localMtimeAtLastSync: z.string().nullable(),
  localHashAtLastSync: z.string().nullable(),
  lastSyncSuccess: z.string().nullable(),
  autoSyncEnabled: z.boolean(),
  lastSnapshotDate: z.string().nullable(),
  driveLinked: z.boolean().nullable(),
});

const syncMetaFileSchema = syncMetaSchema.partial();

type SyncMetaRecord = z.infer<typeof syncMetaSchema>;

const EMPTY_SYNC_META: SyncMetaRecord = {
  remoteFileId: null,
  remoteModTimeAtLastSync: null,
  localSizeAtLastSync: null,
  localMtimeAtLastSync: null,
  localHashAtLastSync: null,
  lastSyncSuccess: null,
  autoSyncEnabled: true,
  lastSnapshotDate: null,
  driveLinked: null,
};

function sha256(data: Uint8Array): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export class SyncMetaStore {
  meta: SyncMetaRecord = { ...EMPTY_SYNC_META };
  private metaPath: string = '';

  load(metaPath: string): void {
    this.metaPath = metaPath;
    try {
      if (fs.existsSync(this.metaPath)) {
        const raw = fs.readFileSync(this.metaPath, 'utf-8');
        const stored = syncMetaFileSchema.safeParse(JSON.parse(raw));
        if (stored.success) this.meta = { ...this.meta, ...stored.data };
        else mainLogger.warn('Sync meta file has an unexpected shape, using defaults', 'Sync');
      }
    } catch (error) {
      mainLogger.error('Sync meta load error', 'Sync', error);
    }
  }

  save(): void {
    try {
      fs.writeFileSync(this.metaPath, JSON.stringify(this.meta, null, 2));
    } catch (error) {
      mainLogger.error('Sync meta save error', 'Sync', error);
    }
  }

  reset(): void {
    this.meta = {
      ...EMPTY_SYNC_META,
      autoSyncEnabled: this.meta.autoSyncEnabled,
      driveLinked: this.meta.driveLinked,
    };
    this.save();
  }

  recordSync(
    remoteId: string | null,
    remoteModifiedTime: string | null | undefined,
    local: Buffer | null,
    localMtime: Date | null
  ): void {
    const now = new Date().toISOString();
    this.meta.remoteFileId = remoteId;
    this.meta.remoteModTimeAtLastSync = remoteModifiedTime || now;
    this.meta.lastSyncSuccess = now;
    if (local && localMtime) {
      this.meta.localSizeAtLastSync = local.length;
      this.meta.localMtimeAtLastSync = localMtime.toISOString();
      this.meta.localHashAtLastSync = sha256(local);
    }
    this.save();
  }

  hasLocalChanges(dbService: DatabaseService | null): boolean {
    if (!dbService) return false;
    const dbPath = dbService.getDbPath();
    if (!dbPath || !fs.existsSync(dbPath)) return dbService.isDirty();

    const stat = fs.statSync(dbPath);
    const lastMtime = this.meta.localMtimeAtLastSync
      ? new Date(this.meta.localMtimeAtLastSync).getTime()
      : 0;
    const looksChanged = dbService.isDirty() || stat.mtimeMs > lastMtime + 1000;
    if (!looksChanged) return false;

    if (!this.meta.localHashAtLastSync) return true;

    if (sha256(fs.readFileSync(dbPath)) !== this.meta.localHashAtLastSync) return true;

    dbService.clearDirty();
    this.meta.localMtimeAtLastSync = stat.mtime.toISOString();
    this.save();
    return false;
  }
}
