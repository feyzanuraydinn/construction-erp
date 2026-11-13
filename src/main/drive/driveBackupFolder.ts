import type { drive_v3 } from '@googleapis/drive';

const BACKUP_FOLDER_NAME = 'ConstructionERP_Backups';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const DRIVE_FILE_FIELDS = 'files(id, name, size, createdTime, modifiedTime)';

export interface DriveFile {
  id: string;
  name: string;
  size: string;
  createdTime: string;
  modifiedTime: string;
}

function toDriveFile(f: drive_v3.Schema$File): DriveFile {
  return {
    id: f.id || '',
    name: f.name || '',
    size: f.size || '0',
    createdTime: f.createdTime || '',
    modifiedTime: f.modifiedTime || '',
  };
}

export async function backupFolderId(drive: drive_v3.Drive): Promise<string> {
  const searchResponse = await drive.files.list({
    q: `name='${BACKUP_FOLDER_NAME}' and mimeType='${FOLDER_MIME_TYPE}' and trashed=false`,
    spaces: 'drive',
    fields: 'files(id, name)',
  });

  const existingId = searchResponse.data.files?.[0]?.id;
  if (existingId) return existingId;

  const createResponse = await drive.files.create({
    requestBody: { name: BACKUP_FOLDER_NAME, mimeType: FOLDER_MIME_TYPE },
    fields: 'id',
  });
  const createdId = createResponse.data.id;
  if (!createdId) throw new Error('Drive did not return an ID for the backup folder');
  return createdId;
}

export async function listInBackupFolder(
  drive: drive_v3.Drive,
  condition: string,
  orderBy: string,
  pageSize: number,
  knownFolderId?: string
): Promise<DriveFile[]> {
  const folderId = knownFolderId ?? (await backupFolderId(drive));
  const response = await drive.files.list({
    q: `'${folderId}' in parents${condition ? ` and ${condition}` : ''} and trashed=false`,
    spaces: 'drive',
    fields: DRIVE_FILE_FIELDS,
    orderBy,
    pageSize,
  });
  return (response.data.files || []).map(toDriveFile);
}
