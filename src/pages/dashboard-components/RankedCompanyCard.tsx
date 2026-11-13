import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { BalanceBadge } from '../../components/ui/Badge';
import { cn } from '../../utils/cn';
import type { DebtorCreditor } from '../../types';

const RANK_TONES = {
  green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

interface RankedCompanyCardProps {
  title: string;
  subtitle: string;
  emptyText: string;
  companies: DebtorCreditor[];
  tone: keyof typeof RANK_TONES;
  balanceOf: (company: DebtorCreditor) => number;
  className?: string;
}

export function RankedCompanyCard({
  title,
  subtitle,
  emptyText,
  companies,
  tone,
  balanceOf,
  className,
}: RankedCompanyCardProps) {
  const navigate = useNavigate();
  return (
    <Card className={className}>
      <CardHeader>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
      </CardHeader>
      <CardBody>
        {companies.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            {emptyText}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {companies.map((company, index) => (
              <button
                key={company.id}
                type="button"
                className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => navigate(`/companies/${company.id}`)}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium',
                      RANK_TONES[tone]
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">{company.name}</span>
                </div>
                <BalanceBadge amount={balanceOf(company)} size="sm" showIcon={false} />
              </button>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
