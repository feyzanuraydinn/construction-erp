import { ReactNode, MouseEvent, memo } from 'react';
import { cn } from '../../utils/cn';

interface TableProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLTableRowElement>) => void;
  hover?: boolean;
  selected?: boolean;
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
  colSpan?: number;
  onClick?: (e: MouseEvent<HTMLTableCellElement>) => void;
}

export const Table = memo(function Table({
  children,
  className = '',
  'aria-label': ariaLabel,
}: TableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full" aria-label={ariaLabel}>
        {children}
      </table>
    </div>
  );
});

export const TableHeader = memo(function TableHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <thead
      className={cn(
        'bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {children}
    </thead>
  );
});

export const TableBody = memo(function TableBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tbody className={cn('divide-y divide-gray-100 dark:divide-gray-700', className)}>
      {children}
    </tbody>
  );
});

export const TableRow = memo(function TableRow({
  children,
  className = '',
  onClick,
  hover = true,
  selected = false,
}: TableRowProps) {
  return (
    <tr
      className={cn(
        hover ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors' : '',
        onClick ? 'cursor-pointer' : '',
        selected ? 'bg-blue-50 dark:bg-blue-900/20' : '',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
});

export const TableHead = memo(function TableHead({ children, className = '' }: TableCellProps) {
  return (
    <th
      scope="col"
      className={cn(
        'px-3 2xl:px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider',
        className
      )}
    >
      {children}
    </th>
  );
});

export const TableCell = memo(function TableCell({
  children,
  className = '',
  colSpan,
  onClick,
}: TableCellProps) {
  const hasCustomColor = /\btext-(?!sm|xs|lg|xl|right|left|center)/.test(className);
  return (
    <td
      className={cn(
        'px-3 2xl:px-4 py-3 text-sm',
        hasCustomColor ? '' : 'text-gray-700 dark:text-gray-300',
        className
      )}
      colSpan={colSpan}
      onClick={onClick}
    >
      {children}
    </td>
  );
});
