import { t } from '../i18n';
import { UserFacingError } from '../../utils/userFacingError';

export function formatDriveError(error: unknown): string {
  const errorStr = String(error);
  if (errorStr.includes('API has not been used') || errorStr.includes('it is disabled')) {
    return t('main.gdrive.apiNotEnabled');
  }
  if (errorStr.includes('invalid_grant')) {
    return t('main.gdrive.sessionExpired');
  }
  if (errorStr.includes('insufficient permissions')) {
    return t('main.gdrive.insufficientPermissions');
  }
  if (error instanceof UserFacingError) return error.message;
  return t('error.unexpected');
}
