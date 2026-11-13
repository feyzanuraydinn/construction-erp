import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

const SELECTED_CLASS = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
const UNSELECTED_CLASS =
  'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600';

interface RadioCardProps {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
  selectedClassName?: string;
  cardClassName?: string;
  className?: string;
}

export function RadioCard({
  name,
  value,
  checked,
  onSelect,
  children,
  selectedClassName = SELECTED_CLASS,
  cardClassName,
  className,
}: RadioCardProps) {
  return (
    <label className={className}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only peer"
      />
      <div
        className={cn(
          'peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-gray-800 border-2 rounded-lg cursor-pointer transition-all',
          checked ? selectedClassName : UNSELECTED_CLASS,
          cardClassName
        )}
      >
        {children}
      </div>
    </label>
  );
}
