import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCRUDPage } from '../hooks/useCRUDPage';
import { getPaginationProps } from '../hooks/usePagination';
import { FiPlus, FiFolder } from 'react-icons/fi';
import { Card, CardBody } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ProjectModal } from '../components/modals/ProjectModal';
import { matchesSearchText } from '../utils/formatters';
import { PROJECT_STATUSES, OWNERSHIP_TYPES } from '../utils/constants';
import { getProjectColumns } from '../utils/exportUtils';
import type { ProjectWithSummary, Company } from '../types';
import { PageActions, BulkDeleteAction } from '../components/shared/PageActions';
import { ListFilterBar } from '../components/shared/ListFilterBar';
import { CrudListDialogs } from '../components/shared/CrudListDialogs';
import { useRelatedDeleteConfirm } from '../hooks/useRelatedDeleteConfirm';
import { useTranslatedOptions } from '../hooks/useTranslatedOptions';
import { PageHeader } from '../components/shared/PageHeader';
import { NO_ITEMS } from '../utils/emptyList';
import { ProjectsTable } from './projects-components/ProjectsTable';

type ProjectFilters = { status: string; ownership: string };

function filterProjects(
  items: ProjectWithSummary[],
  search: string,
  filters: ProjectFilters
): ProjectWithSummary[] {
  return items.filter((project) => {
    const matchesSearch = matchesSearchText(search, project.name, project.code);
    const matchesStatus = !filters.status || project.status === filters.status;
    const matchesOwnership = !filters.ownership || project.ownership_type === filters.ownership;
    return matchesSearch && matchesStatus && matchesOwnership;
  });
}

function Projects() {
  const { t } = useTranslation();
  const statusOptions = useTranslatedOptions(PROJECT_STATUSES);
  const ownershipOptions = useTranslatedOptions(OWNERSHIP_TYPES);

  const crud = useCRUDPage<
    ProjectWithSummary,
    ProjectFilters,
    { items: ProjectWithSummary[]; companies: Company[] }
  >({
    loadFn: async () => {
      const [projects, companiesData] = await Promise.all([
        window.electronAPI.project.getWithSummary(),
        window.electronAPI.company.getAll(),
      ]);
      return { items: projects, companies: companiesData };
    },
    deleteFn: (id) => window.electronAPI.project.delete(id),
    entityKey: 'projects',
    toastKeys: {
      create: 'projects.createSuccess',
      update: 'projects.updateSuccess',
      delete: 'projects.deleteSuccess',
    },
    initialFilters: { status: '', ownership: '' },
    filterFn: filterProjects,
    exportConfig: {
      filename: t('export.filenames.projects'),
      columns: getProjectColumns(t),
    },
  });

  const companies = crud.loaded?.companies ?? NO_ITEMS;
  const deletion = useRelatedDeleteConfirm(crud, (id) =>
    window.electronAPI.project.getRelatedCounts(id)
  );
  const deleteRelated = deletion.related;
  const deleteMessage = useMemo(() => {
    if (!crud.deleteConfirm) return '';
    let msg = t('projects.deleteMessage', { name: crud.deleteConfirm.name });
    if (deleteRelated && deleteRelated.transactionCount > 0) {
      msg +=
        '\n\n' + t('projects.deleteRelatedTransactions', { count: deleteRelated.transactionCount });
    }
    if (deleteRelated && deleteRelated.linkedTransactionCount > 0) {
      msg +=
        '\n\n' +
        t('projects.deleteUnlinkedTransactions', { count: deleteRelated.linkedTransactionCount });
    }
    msg += '\n\n' + t('projects.deleteRestorable');
    return msg;
  }, [crud.deleteConfirm, deleteRelated, t]);

  return (
    <div className="page-container">
      <PageHeader title={t('projects.title')} subtitle={t('projects.subtitle')}>
        <PageActions
          leading={
            <BulkDeleteAction
              count={crud.selectedIds.size}
              label={t('projects.bulkDeleteCount', { count: crud.selectedIds.size })}
              onClick={() => crud.setBulkDeleteConfirm(true)}
              divider="after"
            />
          }
          onExport={() => crud.prepareExportPreview()}
          onShare={() => crud.handleShare()}
          onNew={() => crud.setModalOpen(true)}
          newLabel={t('projects.newProject')}
        />
      </PageHeader>

      <ListFilterBar
        search={crud.search}
        onSearch={crud.setSearch}
        searchPlaceholder={t('projects.searchPlaceholder')}
        filters={[
          {
            value: crud.filters.status,
            onChange: (value) => crud.setFilter('status', value),
            options: statusOptions,
            placeholder: t('projects.form.filterStatus'),
          },
          {
            value: crud.filters.ownership,
            onChange: (value) => crud.setFilter('ownership', value),
            options: ownershipOptions,
            placeholder: t('projects.form.filterOwnership'),
            className: 'w-44',
          },
        ]}
      />

      <Card>
        <CardBody>
          {crud.loading ? (
            <LoadingSpinner />
          ) : crud.filteredData.length === 0 ? (
            <EmptyState
              icon={FiFolder}
              title={t('projects.noProjects')}
              description={t('projects.noProjectsDesc')}
              action={() => crud.setModalOpen(true)}
              actionLabel={t('projects.newProject')}
              actionIcon={FiPlus}
            />
          ) : (
            <ProjectsTable
              projects={crud.paginatedData}
              selectedIds={crud.selectedIds}
              onSelectAll={crud.handleSelectAll}
              onSelectOne={crud.handleSelectOne}
              onEdit={(project) => {
                crud.setEditingItem(project);
                crud.setModalOpen(true);
              }}
              onDelete={(project) => deletion.ask(project)}
            />
          )}
          {crud.filteredData.length > 0 && <Pagination {...getPaginationProps(crud.pagination)} />}
        </CardBody>
      </Card>

      <ProjectModal
        isOpen={crud.modalOpen}
        onClose={() => {
          crud.setModalOpen(false);
          crud.setEditingItem(null);
        }}
        project={crud.editingItem}
        companies={companies}
        onSave={crud.handleSave}
      />

      <CrudListDialogs
        crud={crud}
        keyPrefix="projects"
        deleteMessage={deleteMessage}
        onCancelDelete={deletion.cancel}
        onConfirmDelete={deletion.confirm}
      />
    </div>
  );
}

export default Projects;
