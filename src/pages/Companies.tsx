import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCRUDPage, getPaginationProps } from '../hooks';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiUsers, FiDownload } from 'react-icons/fi';
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
  TypeBadge,
  AccountTypeBadge,
  BalanceBadge,
  EmptyState,
  ConfirmDialog,
  Pagination,
  LoadingSpinner,
  Divider,
  SelectAllCheckbox,
  RowCheckbox,
} from '../components/ui';
import { CompanyModal } from '../components/modals';
import { formatCurrency } from '../utils/formatters';
import { COMPANY_TYPES, ACCOUNT_TYPES } from '../utils/constants';
import { companyColumns } from '../utils/exportUtils';
import type { CompanyWithBalance } from '../types';

function Companies() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Companies-specific state for related entity counts on delete
  const [deleteRelated, setDeleteRelated] = useState<{ transactionCount: number; projectCount: number } | null>(null);

  const crud = useCRUDPage<CompanyWithBalance, { type: string; accountType: string }>({
    loadFn: async () => {
      const companies = await window.electronAPI.company.getWithBalance();
      return { companies };
    },
    dataKey: 'companies',
    onDataLoaded: () => {},
    deleteFn: (id) => window.electronAPI.company.delete(id),
    entityKey: 'companies',
    toastKeys: {
      create: 'companies.createSuccess',
      update: 'companies.updateSuccess',
      delete: 'companies.deleteSuccess',
    },
    initialFilters: { type: '', accountType: '' },
    filterFn: (items, search, filters) => items.filter((company) => {
      const matchesSearch = company.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = !filters.type || company.type === filters.type;
      const matchesAccountType = !filters.accountType || company.account_type === filters.accountType;
      return matchesSearch && matchesType && matchesAccountType;
    }),
    exportConfig: {
      filename: 'cari_hesaplar',
      columns: companyColumns,
    },
  });

  // Translated select options
  const translatedCompanyTypes = useMemo(() =>
    COMPANY_TYPES.map((opt) => ({ ...opt, label: t(opt.label) })),
    [t]
  );
  const translatedAccountTypes = useMemo(() =>
    ACCOUNT_TYPES.map((opt) => ({ ...opt, label: t(opt.label) })),
    [t]
  );

  // Build delete confirmation message
  const deleteMessage = useMemo(() => {
    if (!crud.deleteConfirm) return '';
    let msg = t('companies.deleteMessage', { name: crud.deleteConfirm.name });
    if (deleteRelated && (deleteRelated.transactionCount > 0 || deleteRelated.projectCount > 0)) {
      const parts: string[] = [];
      if (deleteRelated.transactionCount > 0) {
        parts.push(t('companies.relatedTransactions', { count: deleteRelated.transactionCount }));
      }
      if (deleteRelated.projectCount > 0) {
        parts.push(t('companies.relatedProjects', { count: deleteRelated.projectCount }));
      }
      const details = parts.join(t('companies.relatedAnd'));
      msg += '\n\n' + t('companies.deleteRelatedMessage', { details });
    }
    msg += '\n\n' + t('companies.deleteUndoable');
    return msg;
  }, [crud.deleteConfirm, deleteRelated, t]);

  // Delete wrapper that also clears deleteRelated
  const handleDeleteWithRelated = async () => {
    await crud.handleDelete();
    setDeleteRelated(null);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('companies.title')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('companies.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {crud.selectedIds.size > 0 && (
            <>
              <Button variant="ghost-danger" size="sm" icon={FiTrash2} onClick={() => crud.setBulkDeleteConfirm(true)}>
                {t('companies.bulkDeleteCount', { count: crud.selectedIds.size })}
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
            {t('companies.newCompany')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder={t('companies.searchPlaceholder')}
                icon={FiSearch}
                value={crud.search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => crud.setSearch(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                options={translatedCompanyTypes}
                value={crud.filters.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  crud.setFilter('type', e.target.value)
                }
                placeholder={t('companies.table.type')}
              />
            </div>
            <div className="w-40">
              <Select
                options={translatedAccountTypes}
                value={crud.filters.accountType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  crud.setFilter('accountType', e.target.value)
                }
                placeholder={t('companies.table.accountType')}
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
              icon={FiUsers}
              title={t('companies.noCompanies')}
              description={t('companies.noCompaniesDesc')}
              action={() => crud.setModalOpen(true)}
              actionLabel={t('companies.addNew')}
              actionIcon={FiPlus}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead className="w-10">
                    <SelectAllCheckbox
                      itemIds={crud.paginatedData.map(c => c.id)}
                      selectedIds={crud.selectedIds}
                      onSelectAll={crud.handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>{t('companies.table.type')}</TableHead>
                  <TableHead>{t('companies.table.accountType')}</TableHead>
                  <TableHead>{t('companies.table.name')}</TableHead>
                  <TableHead>{t('companies.table.phone')}</TableHead>
                  <TableHead className="text-right">{t('companies.table.receivable')}</TableHead>
                  <TableHead className="text-right">{t('companies.table.payable')}</TableHead>
                  <TableHead className="text-right">{t('companies.table.balance')}</TableHead>
                  <TableHead className="text-center">{t('companies.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crud.paginatedData.map((company) => (
                  <TableRow
                    key={company.id}
                    selected={crud.selectedIds.has(company.id)}
                    onClick={() => navigate(`/companies/${company.id}`)}
                  >
                    <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <RowCheckbox
                        id={company.id}
                        selectedIds={crud.selectedIds}
                        onSelectOne={crud.handleSelectOne}
                      />
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={company.type} />
                    </TableCell>
                    <TableCell>
                      <AccountTypeBadge accountType={company.account_type} />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{company.name}</span>
                    </TableCell>
                    <TableCell>{company.phone || '-'}</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">
                      {formatCurrency(company.receivable)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400">
                      {formatCurrency(company.payable)}
                    </TableCell>
                    <TableCell className="text-right">
                      <BalanceBadge amount={company.balance} size="sm" />
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
                            crud.setEditingItem(company);
                            crud.setModalOpen(true);
                          }}
                          title={t('common.edit')}
                        />
                        <Button
                          variant="ghost-danger"
                          size="icon"
                          icon={FiTrash2}
                          onClick={async () => {
                            crud.setDeleteConfirm(company);
                            try {
                              const counts = await window.electronAPI.company.getRelatedCounts(company.id);
                              setDeleteRelated(counts);
                            } catch {
                              setDeleteRelated(null);
                            }
                          }}
                          title={t('common.delete')}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {crud.filteredData.length > 0 && (
            <Pagination {...getPaginationProps(crud.pagination)} />
          )}
        </CardBody>
      </Card>

      {/* Company Modal */}
      <CompanyModal
        isOpen={crud.modalOpen}
        onClose={() => {
          crud.setModalOpen(false);
          crud.setEditingItem(null);
        }}
        company={crud.editingItem}
        onSave={crud.handleSave}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!crud.deleteConfirm}
        onClose={() => { crud.setDeleteConfirm(null); setDeleteRelated(null); }}
        onConfirm={handleDeleteWithRelated}
        title={t('companies.deleteTitle')}
        message={deleteMessage}
        type="danger"
        confirmText={t('common.delete')}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={crud.bulkDeleteConfirm}
        onClose={() => crud.setBulkDeleteConfirm(false)}
        onConfirm={() => crud.handleBulkDelete()}
        title={t('companies.bulkDeleteTitle')}
        message={t('companies.bulkDeleteMessage', { count: crud.selectedIds.size })}
        type="danger"
        confirmText={t('companies.bulkDeleteConfirm', { count: crud.selectedIds.size })}
      />
    </div>
  );
}

export default Companies;
