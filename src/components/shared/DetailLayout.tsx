import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface SlotProps {
  children: ReactNode;
  className?: string;
}

export function DetailLayout({ children, className = '' }: SlotProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-6 min-[1600px]:grid-cols-3', className)}>
      {children}
    </div>
  );
}

export function DetailAside({ children, className = '' }: SlotProps) {
  return (
    <div
      className={cn(
        'grid content-start grid-cols-1 gap-6 md:grid-cols-2 min-[1600px]:grid-cols-1',
        className
      )}
    >
      {children}
    </div>
  );
}

export function DetailMain({ children, className = '' }: SlotProps) {
  return <div className={cn('min-[1600px]:col-span-2', className)}>{children}</div>;
}
