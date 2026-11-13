import { useTranslation } from 'react-i18next';
import { Card, CardBody } from '../../components/ui/Card';
import { cn } from '../../utils/cn';

interface AppVersionCardProps {
  version: string;
  className?: string;
}

export function AppVersionCard({ version, className }: AppVersionCardProps) {
  const { t } = useTranslation();
  return (
    <div className={cn('lg:col-span-2', className)}>
      <Card>
        <CardBody className="py-3">
          <div className="flex flex-wrap items-center justify-center text-sm text-gray-500 dark:text-gray-400 gap-x-8 gap-y-2">
            <span>
              <strong className="text-gray-700 dark:text-gray-300">{t('app.title')}</strong> v
              {version || '...'}
            </span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
