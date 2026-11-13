import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OwnershipBadge, BalanceBadge } from '../../components/ui/Badge';
import { BudgetBar } from '../../components/ui/BudgetBar';
import { formatPercent } from '../../utils/formatters';
import { budgetUsedPercent } from '../../utils/budget';
import type { ProjectWithSummary } from '../../types';
import { cn } from '../../utils/cn';
import { DashboardListCard } from './DashboardListCard';

interface ActiveProjectsCardProps {
  projects: ProjectWithSummary[];
  className?: string;
}

export function ActiveProjectsCard({ projects, className }: ActiveProjectsCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <DashboardListCard
      title={t('dashboard.activeProjects')}
      viewAllTo="/projects"
      emptyText={t('dashboard.noActiveProjects')}
      isEmpty={projects.length === 0}
      className={cn('overflow-hidden', className)}
      bodyClassName="overflow-hidden"
    >
      {projects.map((project) => {
        const budgetUsed = budgetUsedPercent(project.total_expense || 0, project.estimated_budget);
        return (
          <button
            key={project.id}
            type="button"
            className="w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {project.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{project.code}</p>
              </div>
              <OwnershipBadge ownership={project.ownership_type} short className="flex-shrink-0" />
            </div>
            <div className="flex items-center gap-4">
              {project.estimated_budget ? (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>{t('dashboard.budgetUsage')}</span>
                    <span>{formatPercent(budgetUsed)}</span>
                  </div>
                  <BudgetBar percent={budgetUsed} className="w-full" />
                </div>
              ) : (
                <div className="flex-1" />
              )}
              <div className="text-right flex-shrink-0">
                <BalanceBadge
                  amount={(project.total_income || 0) - (project.total_expense || 0)}
                  size="sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('dashboard.projectProfit')}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </DashboardListCard>
  );
}
