import type { IconType } from 'react-icons';
import { useTranslation } from 'react-i18next';
import { FiCloudOff, FiLink, FiSettings, FiUploadCloud } from 'react-icons/fi';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import type { DriveSettings } from './useDriveSettings';

interface DriveAction {
  key: string;
  icon: IconType;
  label: string;
  onClick: () => void;
  secondary?: boolean;
  loading?: boolean;
}

interface DriveActionsProps {
  drive: DriveSettings;
  className?: string;
}

export function DriveActions({ drive, className }: DriveActionsProps) {
  const { t } = useTranslation();
  const changeCredentials: DriveAction = {
    key: 'credentials',
    icon: FiSettings,
    label: t('settings.changeCredentials'),
    onClick: drive.toggleCredentialsForm,
    secondary: true,
  };
  const actions: DriveAction[] = [
    ...(drive.hasCredentials === false
      ? [
          {
            key: 'configure',
            icon: FiSettings,
            label: t('settings.configure'),
            onClick: drive.toggleCredentialsForm,
          },
        ]
      : []),
    ...(drive.hasCredentials && !drive.connected
      ? [
          {
            key: 'connect',
            icon: FiLink,
            label: t('settings.connectGoogle'),
            onClick: drive.connect,
            loading: drive.loading,
          },
          changeCredentials,
        ]
      : []),
    ...(drive.connected
      ? [
          {
            key: 'upload',
            icon: FiUploadCloud,
            label: t('settings.cloudBackup'),
            onClick: drive.upload,
            loading: drive.loading,
          },
          changeCredentials,
          {
            key: 'disconnect',
            icon: FiCloudOff,
            label: t('settings.disconnect'),
            onClick: () => drive.setDisconnectConfirm(true),
            secondary: true,
          },
        ]
      : []),
  ];

  return (
    <div className={cn('flex gap-2', className)}>
      {actions.map((action) => (
        <Button
          key={action.key}
          variant={action.secondary ? 'secondary' : 'primary'}
          size="sm"
          icon={action.icon}
          onClick={action.onClick}
          loading={action.loading}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
