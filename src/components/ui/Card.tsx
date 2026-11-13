import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface CardSectionProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardSectionProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardSectionProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-100 dark:border-gray-700', className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: CardSectionProps) {
  return <div className={cn('p-6', className)}>{children}</div>;
}
