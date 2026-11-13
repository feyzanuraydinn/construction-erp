import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCRUDPage } from '../hooks/useCRUDPage';
import { getPaginationProps } from '../hooks/usePagination';
import { FiPlus, FiUsers } from 'react-icons/fi';
import { Card, CardBody } from '../components/ui/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/Table';
import { TypeBadge, AccountTypeBadge, BalanceBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { SelectAllHeadCell, RowCheckboxCell } from '../components/ui/SelectAllCheckbox';
import { CompanyModal } from '../components/modals/CompanyModal';
import { formatCurrency, matchesSearchText } from '../utils/formatters';
import { COMPANY_TYPES, ACCOUNT_TYPES } from '../utils/constants';
import { getCompanyColumns, buildCompanySummary } from '../utils/exportUtils';
import type { CompanyWithBalance } from '../types';
import { PageActions, BulkDeleteAction } from '../components/shared/PageActions';
import { ListFilterBar } from '../components/shared/ListFilterBar';
import { CrudListDialogs } from '../components/shared/CrudListDialogs';
import { RowActions } from '../components/ui/RowActions';
import { useRelatedDeleteConfirm } from '../hooks/useRelatedDeleteConfirm';
import { useTranslatedOptions } from '../hooks/useTranslatedOptions';
import { PageHeader } from '../components/shared/PageHeader';

type CompanyFilters = { type: string; accountType: string };

function filterCompanies(
  items: CompanyWithBalance[],
  search: string,
  filters: CompanyFilters
): CompanyWithBalance[] {
  return items.filter((company) => {
    const matchesSearch = matchesSearchText(search, company.name);
    const matchesType = !filters.type || company.type === filters.type;
    const matchesAccountType = !filters.accountType || company.account_type === filters.accountType;
    return matchesSearch && matchesType && matchesAccountType;
  });
}

function Companies() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const companyTypeOptions = useTranslatedOptions(COMPANY_TYPES);
  const accountTypeOptions = useTranslatedOptions(ACCOUNT_TYPES);

  const i18nCompanyColumns = useMemo(() => getCompanyColumns(t), [t]);

  const crud = useCRUDPage<CompanyWithBalance, CompanyFilters>({
    loadFn: async () => {
      const companies = await window.electronAPI.company.getWithBalance();
      return { items: companies };
    },
    deleteFn: (id) => window.electronAPI.company.delete(id),
    entityKey: 'companies',
    toastKeys: {
      create: 'companies.createSuccess',
      update: 'companies.updateSuccess',
      delete: 'companies.deleteSuccess',
    },
    initialFilters: { type: '', accountType: '' },
    filterFn: filterCompanies,
    exportConfig: {
      filename: t('export.filenames.companies'),
      columns: i18nCompanyColumns,
      summaryBuilder: (records) => buildCompanySummary(records, t),
    },
  });

  const deletion = useRelatedDeleteConfirm(crud, (id) =>
    window.electronAPI.company.getRelatedCounts(id)
  );
  const deleteRelated = deletion.related;

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

  return (
    <div className="page-container">
      <PageHeader title={t('companies.title')} subtitle={t('companies.subtitle')}>
        <PageActions
          leading={
            <BulkDeleteAction
              count={crud.selectedIds.size}
              label={t('companies.bulkDeleteCount', { count: crud.selectedIds.size })}
              onClick={() => crud.setBulkDeleteConfirm(true)}
              divider="after"
            />
          }
          onExport={() => crud.prepareExportPreview()}
          onShare={() => crud.handleShare()}
          onNew={() => crud.setModalOpen(true)}
          newLabel={t('companies.newCompany')}
        />
      </PageHeader>

      <ListFilterBar
        search={crud.search}
        onSearch={crud.setSearch}
        searchPlaceholder={t('companies.searchPlaceholder')}
        filters={[
          {
            value: crud.filters.type,
            onChange: (value) => crud.setFilter('type', value),
            options: companyTypeOptions,
            placeholder: t('companies.table.type'),
          },
          {
            value: crud.filters.accountType,
            onChange: (value) => crud.setFilter('accountType', value),
            options: accountTypeOptions,
            placeholder: t('companies.table.accountType'),
          },
        ]}
      />

      <Card>
        <CardBody>
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
                  <SelectAllHeadCell
                    itemIds={crud.paginatedData.map((c) => c.id)}
                    selectedIds={crud.selectedIds}
                    onSelectAll={crud.handleSelectAll}
                  />
                  <TableHead>{t('companies.table.code')}</TableHead>
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
                    <RowCheckboxCell
                      id={company.id}
                      selectedIds={crud.selectedIds}
                      onSelectOne={crud.handleSelectOne}
                    />
                    <TableCell>
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {company.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={company.type} />
                    </TableCell>
                    <TableCell>
                      <AccountTypeBadge accountType={company.account_type} />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {company.name}
                      </span>
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
                      <RowActions
                        onEdit={() => {
                          crud.setEditingItem(company);
                          crud.setModalOpen(true);
                        }}
                        onDelete={() => deletion.ask(company)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {crud.filteredData.length > 0 && <Pagination {...getPaginationProps(crud.pagination)} />}
        </CardBody>
      </Card>

      <CompanyModal
        isOpen={crud.modalOpen}
        onClose={() => {
          crud.setModalOpen(false);
          crud.setEditingItem(null);
        }}
        company={crud.editingItem}
        onSave={crud.handleSave}
      />

      <CrudListDialogs
        crud={crud}
        keyPrefix="companies"
        deleteMessage={deleteMessage}
        onCancelDelete={deletion.cancel}
        onConfirmDelete={deletion.confirm}
      />
    </div>
  );
}

export default Companies;
