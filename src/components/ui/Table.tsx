import React, { ReactNode, MouseEvent, memo } from 'react';

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
  /** Highlight row as selected (blue background) */
  selected?: boolean;
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLTableCellElement>) => void;
}

export const Table = memo(function Table({ children, className = '', 'aria-label': ariaLabel }: TableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full" aria-label={ariaLabel}>{children}</table>
    </div>
  );
});

export const TableHeader = memo(function TableHeader({ children }: { children: ReactNode }) {
  return <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">{children}</thead>;
});

export const TableBody = memo(function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-gray-100 dark:divide-gray-700">{children}</tbody>;
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
      className={`
        ${hover ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${selected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
        ${className}
      `}
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
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
});

export const TableCell = memo(function TableCell({
  children,
  className = '',
  onClick,
}: TableCellProps) {
  return (
    <td className={`px-4 py-3 text-sm text-gray-700 dark:text-gray-300 ${className}`} onClick={onClick}>
      {children}
    </td>
  );
});
