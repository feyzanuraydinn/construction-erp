import React, { memo } from 'react';

interface DividerProps {
  /** Orientation: vertical (default) or horizontal */
  direction?: 'vertical' | 'horizontal';
  className?: string;
}

export const Divider = memo(function Divider({ direction = 'vertical', className = '' }: DividerProps) {
  return direction === 'vertical' ? (
    <div className={`w-px h-6 bg-gray-300 dark:bg-gray-600 ${className}`} />
  ) : (
    <div className={`h-px w-full bg-gray-200 dark:bg-gray-700 ${className}`} />
  );
});
