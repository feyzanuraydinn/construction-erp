import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { StatusBadge, OwnershipBadge, BalanceBadge } from '../../components/ui/Badge';
import { SelectAllHeadCell, RowCheckboxCell } from '../../components/ui/SelectAllCheckbox';
import { BudgetBar } from '../../components/ui/BudgetBar';
import { RowActions } from '../../components/ui/RowActions';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { budgetUsedPercent } from '../../utils/budget';
import type { ProjectWithSummary } from '../../types';

interface ProjectsTableProps {
  projects: ProjectWithSummary[];
  selectedIds: Set<number>;
  onSelectAll: (ids: number[], checked: boolean) => void;
  onSelectOne: (id: number, checked: boolean) => void;
  onEdit: (project: ProjectWithSummary) => void;
  onDelete: (project: ProjectWithSummary) => void;
  className?: string;
}

export function ProjectsTable({
  projects,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onEdit,
  onDelete,
  className,
}: ProjectsTableProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow hover={false}>
          <SelectAllHeadCell
            itemIds={projects.map((p) => p.id)}
            selectedIds={selectedIds}
            onSelectAll={onSelectAll}
          />
          <TableHead>{t('projects.table.code')}</TableHead>
          <TableHead>{t('projects.table.name')}</TableHead>
          <TableHead>{t('projects.table.ownership')}</TableHead>
          <TableHead>{t('projects.table.status')}</TableHead>
          <TableHead className="text-right">{t('projects.table.budget')}</TableHead>
          <TableHead className="text-right">{t('projects.table.expense')}</TableHead>
          <TableHead className="text-center">{t('projects.table.progress')}</TableHead>
          <TableHead className="text-right">{t('projects.table.profit')}</TableHead>
          <TableHead className="text-center">{t('projects.table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => {
          const totalExpenseVal = project.total_expense || 0;
          const budgetUsed = budgetUsedPercent(totalExpenseVal, project.estimated_budget);
          const projectProfit = (project.total_income || 0) - totalExpenseVal;
          return (
            <TableRow
              key={project.id}
              selected={selectedIds.has(project.id)}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <RowCheckboxCell
                id={project.id}
                selectedIds={selectedIds}
                onSelectOne={onSelectOne}
              />
              <TableCell>
                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                  {project.code}
                </span>
              </TableCell>
              <TableCell>
                <span className="font-medium text-gray-900 dark:text-gray-100">{project.name}</span>
                {project.client_name && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{project.client_name}</p>
                )}
              </TableCell>
              <TableCell>
                <OwnershipBadge ownership={project.ownership_type} short withIcon />
              </TableCell>
              <TableCell>
                <StatusBadge status={project.status} />
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(project.estimated_budget) || '-'}
              </TableCell>
              <TableCell className="text-right text-red-600 dark:text-red-400">
                {formatCurrency(project.total_expense || 0)}
              </TableCell>
              <TableCell className="text-center">
                {project.estimated_budget ? (
                  <div className="flex items-center gap-2">
                    <BudgetBar percent={budgetUsed} className="flex-1" />
                    <span className="w-10 text-xs text-gray-500 dark:text-gray-400">
                      {formatPercent(budgetUsed)}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <BalanceBadge amount={projectProfit} size="sm" />
              </TableCell>
              <TableCell>
                <RowActions onEdit={() => onEdit(project)} onDelete={() => onDelete(project)} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
