import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

interface PrintInfoGridProps {
  children: ReactNode;
  className?: string;
}

export function PrintInfoGrid({ children, className }: PrintInfoGridProps) {
  return <div className={cn('mb-6 grid grid-cols-2 gap-4', className)}>{children}</div>;
}

interface PrintInfoSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function PrintInfoSection({ title, children, className }: PrintInfoSectionProps) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-gray-800 mb-2">{title}</h3>
      <table className="text-sm">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

interface PrintInfoRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function PrintInfoRow({ label, children, className }: PrintInfoRowProps) {
  return (
    <tr className={className}>
      <td className="pr-4 py-1 text-gray-900">{label}</td>
      <td>{children}</td>
    </tr>
  );
}
