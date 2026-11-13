import { useTranslation } from 'react-i18next';
import { FiMapPin, FiGrid, FiDollarSign, FiUser } from 'react-icons/fi';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { DetailNote, DetailRow, InfoRow, MutedText } from '../../components/shared/DetailFields';
import { formatArea, formatCurrency, formatDate } from '../../utils/formatters';
import type { ProjectWithClient } from '../../types';
import { cn } from '../../utils/cn';

const DATE_FIELDS = [
  { key: 'planned_start', labelKey: 'projectDetail.fields.plannedStart' },
  { key: 'planned_end', labelKey: 'projectDetail.fields.plannedEnd' },
  { key: 'actual_start', labelKey: 'projectDetail.fields.actualStart' },
] as const;

function hasProjectInfo(project: ProjectWithClient): boolean {
  return (
    !!(project.location || project.total_area || project.estimated_budget || project.description) ||
    DATE_FIELDS.some(({ key }) => project[key])
  );
}

function ProjectDates({ project, className }: { project: ProjectWithClient; className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn('pt-2 space-y-2 border-t dark:border-gray-700', className)}>
      {DATE_FIELDS.map(({ key, labelKey }) => {
        const value = project[key];
        return value ? (
          <DetailRow key={key} label={t(labelKey)}>
            {formatDate(value)}
          </DetailRow>
        ) : null;
      })}
    </div>
  );
}

export function ProjectInfoCard({
  project,
  className,
}: {
  project: ProjectWithClient;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <Card className={className}>
      <CardHeader>
        <h3 className="font-semibold">{t('projectDetail.projectInfo')}</h3>
      </CardHeader>
      <CardBody className="space-y-3 text-sm">
        {!hasProjectInfo(project) ? (
          <MutedText>{t('projectDetail.noProjectInfo')}</MutedText>
        ) : (
          <>
            {project.client_name && (
              <InfoRow icon={FiUser} iconClassName="text-purple-500 dark:text-purple-500">
                <span className="text-gray-500 dark:text-gray-400 text-xs">
                  {t('projectDetail.fields.client')}
                </span>
                <p className="font-medium text-purple-700 dark:text-purple-400">
                  {project.client_name}
                </p>
              </InfoRow>
            )}
            {project.location && (
              <InfoRow icon={FiMapPin} className="items-start" iconClassName="mt-0.5">
                {project.location}
              </InfoRow>
            )}
            {project.total_area ? (
              <InfoRow icon={FiGrid}>
                {formatArea(project.total_area)} - {project.unit_count || '-'}{' '}
                {t('projectDetail.fields.units')}
              </InfoRow>
            ) : null}
            {project.estimated_budget ? (
              <InfoRow icon={FiDollarSign}>
                {t('projectDetail.fields.budget')}: {formatCurrency(project.estimated_budget)}
              </InfoRow>
            ) : null}
            {DATE_FIELDS.some(({ key }) => project[key]) && <ProjectDates project={project} />}
            {project.description && (
              <DetailNote label={t('projectDetail.fields.description')}>
                {project.description}
              </DetailNote>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
