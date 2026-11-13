import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface DashboardListCardProps {
  title: string;
  viewAllTo: string;
  emptyText: string;
  isEmpty: boolean;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
}

export function DashboardListCard({
  title,
  viewAllTo,
  emptyText,
  isEmpty,
  children,
  bodyClassName,
  className,
}: DashboardListCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <Card className={className}>
      <CardHeader className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <Button variant="ghost" size="xs" onClick={() => navigate(viewAllTo)}>
          {t('dashboard.viewAll')}
        </Button>
      </CardHeader>
      <CardBody className={bodyClassName}>
        {isEmpty ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">{emptyText}</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">{children}</div>
        )}
      </CardBody>
    </Card>
  );
}
