import type { drive_v3 } from '@googleapis/drive';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { mainLogger } from '../logger';
import { toLocalDateString } from '../../utils/dates';
import { errorText } from '../../utils/errorText';
import { backupFolderId, listInBackupFolder, type DriveFile } from './driveBackupFolder';

const LATEST_FILE_NAME = 'latest_backup.db';
const SNAPSHOT_PREFIX = 'snapshot-';
const DB_MIME_TYPE = 'application/octet-stream';

export interface UploadedFile {
  fileId?: string;
  modifiedTime?: string;
}

export async function findLatestFile(drive: drive_v3.Drive): Promise<DriveFile | null> {
  const files = await listInBackupFolder(
    drive,
    `name='${LATEST_FILE_NAME}'`,
    'modifiedTime desc',
    1
  );
  return files[0] ?? null;
}

export async function uploadLatestFile(
  drive: drive_v3.Drive,
  filePath: string,
  findExisting: () => Promise<DriveFile | null>
): Promise<UploadedFile> {
  const folderId = await backupFolderId(drive);
  const existing = await findExisting();
  const media = { mimeType: DB_MIME_TYPE, body: fs.createReadStream(filePath) };
  const response = existing
    ? await drive.files.update({ fileId: existing.id, media, fields: 'id, modifiedTime' })
    : await drive.files.create({
        requestBody: { name: LATEST_FILE_NAME, parents: [folderId] },
        media,
        fields: 'id, modifiedTime',
      });
  return {
    fileId: response.data.id || undefined,
    modifiedTime: response.data.modifiedTime || undefined,
  };
}

export async function uploadSnapshotFile(drive: drive_v3.Drive, filePath: string): Promise<void> {
  const name = `${SNAPSHOT_PREFIX}${toLocalDateString()}.db`;
  const folderId = await backupFolderId(drive);
  const existing = await listInBackupFolder(
    drive,
    `name='${name}'`,
    'modifiedTime desc',
    1,
    folderId
  );
  if (existing.length > 0) return;

  await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType: DB_MIME_TYPE, body: fs.createReadStream(filePath) },
    fields: 'id',
  });
}

export async function deleteOldSnapshots(drive: drive_v3.Drive, keep: number): Promise<void> {
  const snapshots = await listInBackupFolder(
    drive,
    `name contains '${SNAPSHOT_PREFIX}'`,
    'name desc',
    50
  );
  for (const snapshot of snapshots.slice(keep)) {
    if (!snapshot.id) continue;
    try {
      await drive.files.delete({ fileId: snapshot.id });
    } catch (error) {
      mainLogger.warn(
        `Could not delete old snapshot ${snapshot.name}`,
        'GoogleDrive',
        errorText(error)
      );
    }
  }
}

export async function downloadToFile(
  drive: drive_v3.Drive,
  fileId: string,
  destPath: string
): Promise<void> {
  const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
  await pipeline(response.data, fs.createWriteStream(destPath));
}
