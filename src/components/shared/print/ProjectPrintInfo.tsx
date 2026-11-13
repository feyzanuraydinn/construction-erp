import { useTranslation } from 'react-i18next';
import { formatArea, formatCurrency, formatDate } from '../../../utils/formatters';
import type { Project } from '../../../types';
import { PrintInfoGrid, PrintInfoRow, PrintInfoSection } from './PrintInfoSection';

interface ProjectPrintInfoProps {
  project: Project;
  className?: string;
}

export function ProjectPrintInfo({ project, className }: ProjectPrintInfoProps) {
  const { t } = useTranslation();
  return (
    <PrintInfoGrid className={className}>
      <PrintInfoSection title={t('print.projectInfo')}>
        {project.location && (
          <PrintInfoRow label={t('print.location')}>{project.location}</PrintInfoRow>
        )}
        {project.total_area ? (
          <PrintInfoRow label={t('print.area')}>{formatArea(project.total_area)}</PrintInfoRow>
        ) : null}
        {project.unit_count ? (
          <PrintInfoRow label={t('print.unitCount')}>{project.unit_count}</PrintInfoRow>
        ) : null}
        {project.estimated_budget ? (
          <PrintInfoRow label={t('print.estimatedBudget')}>
            {formatCurrency(project.estimated_budget)}
          </PrintInfoRow>
        ) : null}
      </PrintInfoSection>
      <PrintInfoSection title={t('print.dates')}>
        {project.planned_start && (
          <PrintInfoRow label={t('print.plannedStart')}>
            {formatDate(project.planned_start)}
          </PrintInfoRow>
        )}
        {project.planned_end && (
          <PrintInfoRow label={t('print.plannedEnd')}>
            {formatDate(project.planned_end)}
          </PrintInfoRow>
        )}
        {project.actual_start && (
          <PrintInfoRow label={t('print.actualStart')}>
            {formatDate(project.actual_start)}
          </PrintInfoRow>
        )}
      </PrintInfoSection>
    </PrintInfoGrid>
  );
}
