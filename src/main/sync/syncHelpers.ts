import fs from 'fs';
import path from 'path';
import { InvalidDatabaseError } from '../../database/DatabaseService';
import { mainLogger } from '../logger';
import { t } from '../i18n';
import { UserFacingError } from '../../utils/userFacingError';
import { tempDirectory } from '../appPaths';
import { errorText } from '../../utils/errorText';

const TEMP_FILE_PATTERN = /^(upload|download)-.*\.db$/;

export function syncErrorMessage(error: unknown): string {
  if (error instanceof InvalidDatabaseError) return t('error.db.databaseCorrupted');
  if (error instanceof UserFacingError) return error.message;
  return t('error.unexpected');
}

export function isRemoteNewer(
  remoteModifiedTime: string,
  modTimeAtLastSync: string | null
): boolean {
  return (
    modTimeAtLastSync === null ||
    (remoteModifiedTime !== modTimeAtLastSync &&
      new Date(remoteModifiedTime).getTime() > new Date(modTimeAtLastSync).getTime())
  );
}

export function removeStaleTempFiles(): void {
  try {
    const dir = tempDirectory();
    for (const name of fs.readdirSync(dir)) {
      if (TEMP_FILE_PATTERN.test(name)) fs.rmSync(path.join(dir, name), { force: true });
    }
  } catch (error) {
    mainLogger.warn(`Could not clean sync temp files: ${errorText(error)}`, 'Sync');
  }
}
