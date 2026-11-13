import type { ReactNode } from 'react';
import { Card, CardBody } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Pagination } from '../../components/ui/Pagination';
import { getPaginationProps, type UsePaginationReturn } from '../../hooks/usePagination';

interface StockListCardProps {
  loading: boolean;
  itemCount: number;
  pagination: UsePaginationReturn;
  emptyState: ReactNode;
  children: ReactNode;
  className?: string;
}

export function StockListCard({
  loading,
  itemCount,
  pagination,
  emptyState,
  children,
  className,
}: StockListCardProps) {
  return (
    <Card className={className}>
      <CardBody>
        {loading ? <LoadingSpinner /> : itemCount === 0 ? emptyState : children}
        {itemCount > 0 && <Pagination {...getPaginationProps(pagination)} />}
      </CardBody>
    </Card>
  );
}
