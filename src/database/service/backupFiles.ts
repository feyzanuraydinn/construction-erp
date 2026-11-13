import path from 'path';
import fs from 'fs';
import type { ContextLogger } from '../../utils/logger';
import { writeFileAtomic, fileTimestamp, pruneBackupFiles } from '../fileUtils';
import { toLocalDateString } from '../../utils/dates';

const LATEST_BACKUP_FILE = 'latest_backup.db';

const DAILY_ARCHIVE_DIR = 'daily';
const DAILY_ARCHIVE_PREFIX = 'daily-';
const DAILY_ARCHIVE_KEEP = 14;

const SAFETY_COPY_DIR = 'safety';
const SAFETY_COPY_KEEP = 10;

function archiveDaily(backupDir: string, data: Uint8Array, log: ContextLogger): void {
  try {
    const archiveDir = path.join(backupDir, DAILY_ARCHIVE_DIR);
    const archivePath = path.join(archiveDir, `${DAILY_ARCHIVE_PREFIX}${toLocalDateString()}.db`);
    if (fs.existsSync(archivePath)) return;
    fs.mkdirSync(archiveDir, { recursive: true });
    writeFileAtomic(archivePath, data);
    pruneBackupFiles(archiveDir, DAILY_ARCHIVE_PREFIX, DAILY_ARCHIVE_KEEP);
    log.info(`Daily archive created: ${archivePath}`);
  } catch (error) {
    log.error('Daily archive failed', error);
  }
}

export function writeLatestBackup(
  backupDir: string,
  exportData: () => Uint8Array,
  log: ContextLogger
): string {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, LATEST_BACKUP_FILE);
  const data = exportData();
  writeFileAtomic(backupPath, data);

  archiveDaily(backupDir, data, log);

  log.info(`Backup created: ${backupPath}`);
  return backupPath;
}

export function writeSafetyCopy(
  backupDir: string,
  label: string,
  exportData: () => Uint8Array,
  log: ContextLogger
): string {
  const safetyDir = path.join(backupDir, SAFETY_COPY_DIR);
  fs.mkdirSync(safetyDir, { recursive: true });
  const prefix = `${label}-`;
  const copyPath = path.join(safetyDir, `${prefix}${fileTimestamp()}.db`);
  writeFileAtomic(copyPath, exportData());
  pruneBackupFiles(safetyDir, prefix, SAFETY_COPY_KEEP);
  log.info(`Safety copy created: ${copyPath}`);
  return copyPath;
}
