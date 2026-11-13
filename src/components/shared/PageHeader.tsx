import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft } from 'react-icons/fi';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

export function BackButton({ to, className }: { to: string; className?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="icon"
      icon={FiArrowLeft}
      onClick={() => navigate(to)}
      aria-label={t('common.back')}
      className={className}
    />
  );
}

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: IconType;
  badges?: ReactNode;
  backTo?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  badges,
  backTo,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('page-header', className)}>
      <div className="flex items-center gap-4">
        {backTo && <BackButton to={backTo} />}
        <div>
          <div className="flex items-center gap-3">
            <h1 className={cn('page-title', Icon && 'flex items-center gap-2')}>
              {Icon && <Icon />}
              {title}
            </h1>
            {badges}
          </div>
          {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
