import type { ReactNode } from 'react';
import { MutedText } from '../../components/shared/DetailFields';
import { cn } from '../../utils/cn';

interface ReviewSectionProps {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function ReviewSection({ title, hint, children, className }: ReviewSectionProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-sm font-medium">{title}</h4>
      {hint !== undefined && <MutedText className="text-sm">{hint}</MutedText>}
      {children}
    </div>
  );
}
