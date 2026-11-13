import { useTranslation } from 'react-i18next';
import { FiCheck, FiCloud, FiDownload } from 'react-icons/fi';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatDateTime, formatFileSize } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { BackupFileInfo } from './BackupFileInfo';
import { DriveActions } from './DriveActions';
import { DriveCredentialsForm } from './DriveCredentialsForm';
import type { DriveSettings } from './useDriveSettings';

interface DriveMessageProps {
  title: string;
  description: string;
  className?: string;
}

function DriveMessage({ title, description, className }: DriveMessageProps) {
  return (
    <div className={cn('py-8 text-center text-gray-500 dark:text-gray-400', className)}>
      <FiCloud size={32} className="mx-auto mb-2 opacity-50" />
      <p className="text-sm">{title}</p>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{description}</p>
    </div>
  );
}

function DriveBackupList({ drive, className }: { drive: DriveSettings; className?: string }) {
  const { t } = useTranslation();
  const { backups, backupsLoading, loading, download } = drive;
  return (
    <div className={cn('p-3', className)}>
      {backupsLoading || backups === null ? (
        <LoadingSpinner className="py-4" />
      ) : backups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-gray-500 dark:text-gray-400">
          <FiCloud size={24} className="mb-1 opacity-50" />
          <p className="text-sm">{t('settings.noCloudBackup')}</p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <BackupFileInfo
            icon={FiCloud}
            iconSize={18}
            tone="blue"
            title={t('settings.cloudBackup')}
            detail={`${formatFileSize(Number(backups[0].size))} • ${formatDateTime(backups[0].modifiedTime)}`}
          />
          <Button
            variant="secondary"
            size="sm"
            icon={FiDownload}
            onClick={() => download(backups[0])}
            loading={loading}
          >
            {t('common.restore')}
          </Button>
        </div>
      )}
    </div>
  );
}

interface DriveBackupCardProps {
  drive: DriveSettings;
  initialLoading: boolean;
  className?: string;
}

export function DriveBackupCard({ drive, initialLoading, className }: DriveBackupCardProps) {
  const { t } = useTranslation();
  const ready = !initialLoading;
  return (
    <Card className={className}>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiCloud
            className={drive.connected ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'}
          />
          <h3 className="font-semibold">{t('settings.googleDrive')}</h3>
          {drive.connected && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-full">
              <FiCheck size={12} />
              {t('settings.connected')}
            </span>
          )}
        </div>
        {ready && <DriveActions drive={drive} />}
      </CardHeader>
      <CardBody className={drive.showCredentialsForm ? 'h-auto' : 'h-[160px]'}>
        {initialLoading && <LoadingSpinner className="h-full" />}

        {ready && drive.showCredentialsForm && <DriveCredentialsForm drive={drive} />}

        {ready && drive.hasCredentials === false && !drive.showCredentialsForm && (
          <DriveMessage
            title={t('settings.driveNotConfigured')}
            description={t('settings.driveNotConfiguredDesc')}
          />
        )}

        {ready && drive.hasCredentials && !drive.connected && !drive.showCredentialsForm && (
          <DriveMessage
            title={t('settings.driveNotConnected')}
            description={t('settings.driveNotConnectedDesc')}
          />
        )}

        {ready && drive.connected && <DriveBackupList drive={drive} />}
      </CardBody>
    </Card>
  );
}
