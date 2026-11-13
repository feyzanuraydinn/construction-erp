import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { mainLogger } from './logger';
import { errorText } from '../utils/errorText';

function ensureDirectory(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function backupDirectory(): string {
  return path.join(app.getPath('userData'), 'backups');
}

export function ensureBackupDirectory(): string {
  return ensureDirectory(backupDirectory());
}

export function tempDirectory(): string {
  return ensureDirectory(path.join(app.getPath('temp'), 'construction-erp'));
}

export function tempFilePath(fileName: string): string {
  return path.join(tempDirectory(), fileName);
}

export function removeLater(filePath: string, delayMs: number): void {
  setTimeout(() => {
    try {
      fs.rmSync(filePath, { force: true });
    } catch (error) {
      mainLogger.warn(`Could not remove temporary file ${filePath}`, 'Files', errorText(error));
    }
  }, delayMs);
}
