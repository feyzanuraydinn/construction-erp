import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface FormSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, children, className }: FormSectionProps) {
  return (
    <div className={cn('pt-4 border-t dark:border-gray-700', className)}>
      <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}
