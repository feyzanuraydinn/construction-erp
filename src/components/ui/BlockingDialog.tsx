import { useId, useRef, type ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { useModalLayer } from './Modal';
import { cn } from '../../utils/cn';

interface DialogShellProps {
  open: boolean;
  onDismiss: () => void;
  labelledBy: string;
  describedBy?: string;
  children: ReactNode;
  overlayClassName?: string;
  className?: string;
}

export function DialogShell({
  open,
  onDismiss,
  labelledBy,
  describedBy,
  children,
  overlayClassName,
  className,
}: DialogShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalLayer(open, onDismiss, dialogRef);
  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4',
        overlayClassName
      )}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={cn('w-full overflow-hidden bg-white dark:bg-gray-800 shadow-2xl', className)}
      >
        {children}
      </div>
    </div>
  );
}

interface BlockingDialogProps {
  open: boolean;
  onDismiss: () => void;
  icon: IconType;
  title: string;
  subtitle?: string;
  size?: 'md' | 'lg';
  children: ReactNode;
  className?: string;
}

export function BlockingDialog({
  open,
  onDismiss,
  icon: Icon,
  title,
  subtitle,
  size = 'md',
  children,
  className,
}: BlockingDialogProps) {
  const titleId = useId();
  const large = size === 'lg';

  return (
    <DialogShell
      open={open}
      onDismiss={onDismiss}
      labelledBy={titleId}
      className={cn('rounded-xl', large ? 'max-w-lg' : 'max-w-md', className)}
    >
      <div className="p-5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center gap-3">
        <div
          className={cn(
            'bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center flex-shrink-0',
            large ? 'w-12 h-12' : 'w-10 h-10'
          )}
        >
          <Icon size={large ? 24 : 20} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2
            id={titleId}
            className={cn(
              'font-bold text-gray-900 dark:text-white',
              large ? 'text-lg' : 'text-base'
            )}
          >
            {title}
          </h2>
          {subtitle && <p className="text-xs text-gray-600 dark:text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </DialogShell>
  );
}
