import type { ReactNode } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { cn } from '../../utils/cn';

export const REVIEW_SELECT_CLASS =
  'px-2 py-1 text-sm bg-white border border-gray-200 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100';

interface ReviewPartProps {
  children: ReactNode;
  className?: string;
}

export function ReviewRow({ children, className }: ReviewPartProps) {
  return (
    <TableRow hover={false} className={className}>
      {children}
    </TableRow>
  );
}

export function ReviewCell({ children, className }: ReviewPartProps) {
  return <TableCell className={cn('py-2 align-top', className)}>{children}</TableCell>;
}

export function CellNote({ children, className }: ReviewPartProps) {
  return <span className={cn('block text-xs text-gray-500', className)}>{children}</span>;
}

export function ReviewTable({ head, children, className }: ReviewPartProps & { head: string[] }) {
  return (
    <Table className={cn('border border-gray-200 rounded-lg dark:border-gray-700', className)}>
      <TableHeader>
        <ReviewRow>
          {head.map((h, index) => (
            <TableHead key={index} className="py-2">
              {h}
            </TableHead>
          ))}
        </ReviewRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}
