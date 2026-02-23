import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCRUDPage, getPaginationProps } from '../hooks';
import {
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiFolder,
  FiHome,
  FiUser,
  FiDownload,
} from 'react-icons/fi';
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  StatusBadge,
  Badge,
  BalanceBadge,
  EmptyState,
  ConfirmDialog,
  Pagination,
  LoadingSpinner,
  Divider,
  SelectAllCheckbox,
  RowCheckbox,
} from '../components/ui';
import { ProjectModal } from '../components/modals';
import { formatCurrency } from '../utils/formatters';
import { PROJECT_STATUSES, OWNERSHIP_TYPES } from '../utils/constants';
import { projectColumns } from '../utils/exportUtils';
import type {
  ProjectWithSummary,
  Company,
} from '../types';

function Projects() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [companies, setCompanies] = useState<Company[]>([]);

  const crud = useCRUDPage<ProjectWithSummary, { status: string; ownership: string }>({
    loadFn: async () => {
      const [projects, companiesData] = await Promise.all([
        window.electronAPI.project.getWithSummary(),
        window.electronAPI.company.getAll(),
      ]);
      return { projects, companies: companiesData };
    },
    dataKey: 'projects',
    onDataLoaded: (data) => {
      setCompanies(data.companies as Company[]);
    },
    deleteFn: (id) => window.electronAPI.project.delete(id),
    entityKey: 'projects',
    toastKeys: {
      create: 'projects.createSuccess',
      update: 'projects.updateSuccess',
      delete: 'projects.deleteSuccess',
    },
    initialFilters: { status: '', ownership: '' },
    filterFn: (items, search, filters) =>
      items.filter((project) => {
        const matchesSearch =
          project.name.toLowerCase().includes(search.toLowerCase()) ||
          project.code.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !filters.status || project.status === filters.status;
        const matchesOwnership = !filters.ownership || project.ownership_type === filters.ownership;
        return matchesSearch && matchesStatus && matchesOwnership;
      }),
    exportConfig: {
      filename: 'projeler',
      columns: projectColumns,
    },
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('projects.title')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('projects.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {crud.selectedIds.size > 0 && (
            <>
              <Button variant="ghost-danger" size="sm" icon={FiTrash2} onClick={() => crud.setBulkDeleteConfirm(true)}>
                {t('projects.bulkDeleteCount', { count: crud.selectedIds.size })}
              </Button>
              <Divider />
            </>
          )}
          <Button
            variant="secondary"
            icon={FiDownload}
            onClick={() => crud.handleExport()}
            title={t('common.exportToExcel')}
          >
            {t('common.exportToExcel')}
          </Button>
          <Button icon={FiPlus} onClick={() => crud.setModalOpen(true)}>
            {t('projects.newProject')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder={t('projects.searchPlaceholder')}
                icon={FiSearch}
                value={crud.search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => crud.setSearch(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                options={PROJECT_STATUSES.map((o) => ({ ...o, label: t(o.label) }))}
                value={crud.filters.status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  crud.setFilter('status', e.target.value)
                }
                placeholder={t('projects.form.filterStatus')}
              />
            </div>
            <div className="w-44">
              <Select
                options={OWNERSHIP_TYPES.map((o) => ({ ...o, label: t(o.label) }))}
                value={crud.filters.ownership}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  crud.setFilter('ownership', e.target.value)
                }
                placeholder={t('projects.form.filterOwnership')}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody className="p-0">
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
            <Table>
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead className="w-10">
                    <SelectAllCheckbox
                      itemIds={crud.paginatedData.map((p) => p.id)}
                      selectedIds={crud.selectedIds}
                      onSelectAll={crud.handleSelectAll}
                    />
                  </TableHead>
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
                {crud.paginatedData.map((project) => {
                  const totalExpenseVal = project.total_expense || 0;
                  const budgetUsed = project.estimated_budget
                    ? (totalExpenseVal / project.estimated_budget) * 100
                    : 0;
                  const projectProfit = (project.total_income || 0) - totalExpenseVal;
                  return (
                    <TableRow
                      key={project.id}
                      selected={crud.selectedIds.has(project.id)}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <RowCheckbox
                          id={project.id}
                          selectedIds={crud.selectedIds}
                          onSelectOne={crud.handleSelectOne}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{project.code}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{project.name}</span>
                        {project.client_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{project.client_name}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={project.ownership_type === 'own' ? 'info' : 'purple'}>
                          {project.ownership_type === 'own' ? (
                            <>
                              <FiHome size={12} className="mr-1" /> {t('projects.table.own')}
                            </>
                          ) : (
                            <>
                              <FiUser size={12} className="mr-1" /> {t('projects.table.client')}
                            </>
                          )}
                        </Badge>
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
                            <div className="flex-1 h-2 overflow-hidden bg-gray-200 dark:bg-gray-700 rounded-full">
                              <div
                                className={`h-full rounded-full ${
                                  budgetUsed > 90
                                    ? 'bg-red-500'
                                    : budgetUsed > 70
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                              />
                            </div>
                            <span className="w-10 text-xs text-gray-500 dark:text-gray-400">
                              {budgetUsed.toFixed(0)}%
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
                        <div
                          className="flex items-center justify-center gap-1"
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost-warning"
                            size="icon"
                            icon={FiEdit2}
                            onClick={() => {
                              crud.setEditingItem(project);
                              crud.setModalOpen(true);
                            }}
                            title={t('common.edit')}
                          />
                          <Button
                            variant="ghost-danger"
                            size="icon"
                            icon={FiTrash2}
                            onClick={() => crud.setDeleteConfirm(project)}
                            title={t('common.delete')}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {crud.filteredData.length > 0 && (
            <Pagination {...getPaginationProps(crud.pagination)} />
          )}
        </CardBody>
      </Card>

      {/* Project Modal */}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!crud.deleteConfirm}
        onClose={() => crud.setDeleteConfirm(null)}
        onConfirm={crud.handleDelete}
        title={t('projects.deleteTitle')}
        message={t('projects.deleteMessage', { name: crud.deleteConfirm?.name })}
        type="danger"
        confirmText={t('common.delete')}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={crud.bulkDeleteConfirm}
        onClose={() => crud.setBulkDeleteConfirm(false)}
        onConfirm={crud.handleBulkDelete}
        title={t('projects.bulkDeleteTitle')}
        message={t('projects.bulkDeleteMessage', { count: crud.selectedIds.size })}
        type="danger"
        confirmText={t('projects.bulkDeleteConfirm', { count: crud.selectedIds.size })}
      />
    </div>
  );
}

export default Projects;
