import { memo } from 'react';
import { cn } from '../../utils/cn';

export const Divider = memo(function Divider({ className }: { className?: string }) {
  return <div className={cn('w-px h-6 bg-gray-300 dark:bg-gray-600', className)} />;
});
