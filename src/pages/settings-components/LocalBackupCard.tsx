import { useTranslation } from 'react-i18next';
import { FiCheck, FiDatabase, FiFolder, FiRefreshCw } from 'react-icons/fi';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatDateTime, formatFileSize } from '../../utils/formatters';
import { SettingsCard } from './SettingsCard';
import { BackupFileInfo } from './BackupFileInfo';
import type { BackupInfo } from './useLocalBackup';

interface LocalBackupCardProps {
  backupInfo: BackupInfo | null;
  creating: boolean;
  onCreate: () => void;
  onOpenFolder: () => void;
  onRestore: () => void;
  className?: string;
}

export function LocalBackupCard({
  backupInfo,
  creating,
  onCreate,
  onOpenFolder,
  onRestore,
  className,
}: LocalBackupCardProps) {
  const { t } = useTranslation();
  return (
    <SettingsCard
      title={t('settings.localBackup')}
      className={className}
      bodyClassName="h-[160px] flex flex-col"
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={FiFolder} onClick={onOpenFolder}>
            {t('settings.openFolder')}
          </Button>
          <Button size="sm" icon={FiDatabase} onClick={onCreate} loading={creating}>
            {t('settings.createBackup')}
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
        {t('settings.backupDescription')}
      </p>
      {backupInfo === null ? (
        <LoadingSpinner className="py-2" />
      ) : !backupInfo.exists ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 rounded-lg bg-gray-50 dark:bg-gray-700/50 px-4 py-2">
          <FiDatabase size={20} className="mb-1 opacity-50" />
          <p className="text-xs">{t('settings.noBackup')}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {t('settings.createFirstBackup')}
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center justify-between">
            <BackupFileInfo
              icon={FiCheck}
              iconSize={20}
              tone="green"
              title={t('settings.lastBackup')}
              detail={`${formatDateTime(backupInfo.date)} • ${formatFileSize(backupInfo.size)}`}
            />
            <Button variant="secondary" size="sm" icon={FiRefreshCw} onClick={onRestore}>
              {t('common.restore')}
            </Button>
          </div>
        </div>
      )}
    </SettingsCard>
  );
}
