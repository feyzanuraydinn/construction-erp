import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { MutedText } from '../../components/shared/DetailFields';
import { DriveCredentialsFields } from '../../components/shared/DriveCredentialsFields';
import { DRIVE_REDIRECT_URI } from '../../utils/constants';
import { cn } from '../../utils/cn';
import type { DriveSettings } from './useDriveSettings';

interface DriveCredentialsFormProps {
  drive: DriveSettings;
  className?: string;
}

export function DriveCredentialsForm({ drive, className }: DriveCredentialsFormProps) {
  const { t } = useTranslation();
  return (
    <div className={cn('p-4 bg-gray-50 dark:bg-gray-700/50', className)}>
      <MutedText className="mb-3 text-xs">{t('settings.credentialsDesc')}</MutedText>
      <MutedText className="mb-3 text-xs">
        {t('settings.redirectUri')}{' '}
        <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] break-all">
          {DRIVE_REDIRECT_URI}
        </code>
      </MutedText>
      <div className="space-y-3">
        <DriveCredentialsFields value={drive.credentials} onChange={drive.setCredentials} />
        <div className="flex gap-2">
          <Button size="sm" onClick={drive.saveCredentials} loading={drive.loading}>
            {t('common.save')}
          </Button>
          <Button size="sm" variant="secondary" onClick={drive.cancelCredentials}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
