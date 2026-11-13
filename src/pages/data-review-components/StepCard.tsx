import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle } from 'react-icons/fi';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { MutedText } from '../../components/shared/DetailFields';
import { cn } from '../../utils/cn';
import type { ReviewStep } from './useDataReview';

interface StepHeaderProps {
  title: string;
  description: string;
  aside?: ReactNode;
  className?: string;
}

export function StepHeader({ title, description, aside, className }: StepHeaderProps) {
  const heading = (
    <>
      <h3 className="font-semibold">{title}</h3>
      <MutedText className="mt-1 text-sm">{description}</MutedText>
    </>
  );
  return (
    <CardHeader
      className={cn(aside !== undefined && 'flex items-start justify-between gap-4', className)}
    >
      {aside === undefined ? (
        heading
      ) : (
        <>
          <div>{heading}</div>
          {aside}
        </>
      )}
    </CardHeader>
  );
}

interface StepCardProps {
  number: number;
  title: string;
  description: string;
  done: boolean;
  children: ReactNode;
  className?: string;
}

export function StepCard({ number, title, description, done, children, className }: StepCardProps) {
  const { t } = useTranslation();
  return (
    <Card className={className}>
      <StepHeader
        title={`${number}. ${title}`}
        description={description}
        aside={
          done ? (
            <Badge variant="success">
              <FiCheckCircle className="mr-1" /> {t('dataReview.noIssues')}
            </Badge>
          ) : (
            <Badge variant="warning">{t('dataReview.needsReview')}</Badge>
          )
        }
      />
      {!done && <CardBody className="space-y-4">{children}</CardBody>}
    </Card>
  );
}

interface StepActionsProps {
  step: ReviewStep;
  busy: ReviewStep | null;
  label: string;
  onClick: () => void;
  blocked?: boolean;
  hint?: string;
  hintClassName?: string;
  className?: string;
}

export function StepActions({
  step,
  busy,
  label,
  onClick,
  blocked = false,
  hint,
  hintClassName,
  className,
}: StepActionsProps) {
  return (
    <div
      className={cn(
        hint === undefined ? 'flex justify-end' : 'flex items-center justify-between gap-4',
        className
      )}
    >
      {hint !== undefined && <MutedText className={cn('text-xs', hintClassName)}>{hint}</MutedText>}
      <Button loading={busy === step} disabled={busy !== null || blocked} onClick={onClick}>
        {label}
      </Button>
    </div>
  );
}
