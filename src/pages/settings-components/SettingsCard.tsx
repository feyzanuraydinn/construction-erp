import type { ReactNode } from 'react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';

interface SettingsCardProps {
  title: string;
  actions?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsCard({
  title,
  actions,
  bodyClassName,
  children,
  className,
}: SettingsCardProps) {
  return (
    <Card className={className}>
      <CardHeader
        className={actions === undefined ? undefined : 'flex items-center justify-between'}
      >
        <h3 className="font-semibold">{title}</h3>
        {actions}
      </CardHeader>
      <CardBody className={bodyClassName}>{children}</CardBody>
    </Card>
  );
}
