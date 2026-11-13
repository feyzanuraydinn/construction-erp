import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';
import { cn } from '../../utils/cn';

export interface DriveCredentials {
  clientId: string;
  clientSecret: string;
}

export const EMPTY_DRIVE_CREDENTIALS: DriveCredentials = { clientId: '', clientSecret: '' };

export function trimmedDriveCredentials(value: DriveCredentials): DriveCredentials | null {
  const clientId = value.clientId.trim();
  const clientSecret = value.clientSecret.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

interface DriveCredentialsFieldsProps {
  value: DriveCredentials;
  onChange: (value: DriveCredentials) => void;
  className?: string;
}

export function DriveCredentialsFields({
  value,
  onChange,
  className,
}: DriveCredentialsFieldsProps) {
  const { t } = useTranslation();
  return (
    <div className={cn('space-y-3', className)}>
      <Input
        label={t('settings.clientId')}
        value={value.clientId}
        onChange={(e) => onChange({ ...value, clientId: e.target.value })}
        placeholder="xxxx.apps.googleusercontent.com"
      />
      <Input
        label={t('settings.clientSecret')}
        type="password"
        value={value.clientSecret}
        onChange={(e) => onChange({ ...value, clientSecret: e.target.value })}
        placeholder="GOCSPX-..."
      />
    </div>
  );
}
