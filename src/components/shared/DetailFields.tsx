import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../utils/cn';

interface InfoRowProps {
  icon: IconType;
  children: ReactNode;
  iconClassName?: string;
  className?: string;
}

export function InfoRow({ icon: Icon, children, iconClassName, className }: InfoRowProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Icon className={cn('flex-shrink-0 text-gray-400 dark:text-gray-500', iconClassName)} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

interface LabelledProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function DetailRow({ label, children, className }: LabelledProps) {
  return (
    <div className={cn('flex justify-between gap-4', className)}>
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export function DetailNote({ label, children, className }: LabelledProps) {
  return (
    <div className={cn('pt-2 border-t dark:border-gray-700', className)}>
      <p className="mb-1 text-gray-500 dark:text-gray-400">{label}</p>
      <p>{children}</p>
    </div>
  );
}

export function DetailField({
  label,
  children,
  wide = false,
  className,
}: LabelledProps & { wide?: boolean }) {
  return (
    <div className={cn(wide && 'col-span-2', className)}>
      <p className="text-gray-500 dark:text-gray-400">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  );
}

export function MutedText({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-gray-500 dark:text-gray-400', className)}>{children}</p>;
}

interface DetailNotFoundProps {
  i18nPrefix: string;
  backTo: string;
  className?: string;
}

export function DetailNotFound({ i18nPrefix, backTo, className }: DetailNotFoundProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className={cn('page-container', className)}>
      <EmptyState
        title={t(`${i18nPrefix}.notFound.title`)}
        description={t(`${i18nPrefix}.notFound.description`)}
        action={() => navigate(backTo)}
        actionLabel={t(`${i18nPrefix}.notFound.actionLabel`)}
      />
    </div>
  );
}
