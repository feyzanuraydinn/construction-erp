import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

interface PrintCellProps {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}

export function PrintTh({ children, className, colSpan }: PrintCellProps) {
  return (
    <th colSpan={colSpan} className={cn('border border-gray-300 px-2 py-1.5 text-left', className)}>
      {children}
    </th>
  );
}

export function PrintTd({ children, className, colSpan }: PrintCellProps) {
  return (
    <td colSpan={colSpan} className={cn('border border-gray-300 px-2 py-1', className)}>
      {children}
    </td>
  );
}

interface PrintTableSectionProps {
  title: string;
  head: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PrintTableSection({ title, head, children, className }: PrintTableSectionProps) {
  return (
    <div className={cn('mb-6', className)}>
      <h3 className="text-lg font-semibold mb-3 text-gray-800">{title}</h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">{head}</tr>
        </thead>
        {children}
      </table>
    </div>
  );
}
