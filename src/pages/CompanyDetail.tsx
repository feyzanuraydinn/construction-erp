import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PrintPreviewModal } from '../components/modals/PrintPreviewModal';
import { CompanyPrintView } from '../components/shared/PrintView';
import { DetailLayout, DetailAside, DetailMain } from '../components/shared/DetailLayout';
import { TransactionPageActions } from '../components/transaction-list/TransactionListParts';
import { TransactionListDialogs } from '../components/transaction-list/TransactionListDialogs';
import { TransactionPrintOptions } from '../components/transaction-list/TransactionPrintOptions';
import { TransactionExportPreview } from '../components/transaction-list/TransactionExportPreview';
import { categoryOptions } from '../components/transaction-list/options';
import { TypeBadge, AccountTypeBadge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/LoadingSpinner';
import { useTransactionList } from '../hooks/useTransactionList';
import { calculateCompanyFinancials } from '../utils/financials';
import { TRANSACTION_TYPES } from '../utils/constants';
import { useIdParam } from '../hooks/useIdParam';
import { useLoadedData } from '../hooks/useLoadedData';
import { NO_ITEMS } from '../utils/emptyList';
import { useTranslatedOptions } from '../hooks/useTranslatedOptions';
import { PageHeader } from '../components/shared/PageHeader';
import { DetailNotFound } from '../components/shared/DetailFields';
import { CompanyFlowStats, CompanyBalanceStats } from './company-detail-components/CompanyStats';
import {
  CompanyContactCard,
  CompanyProfileCard,
} from './company-detail-components/CompanyInfoCards';
import { CompanyTransactionsCard } from './company-detail-components/CompanyTransactionsCard';

function CompanyDetail() {
  const id = useIdParam();
  const { t } = useTranslation();
  const typeOptions = useTranslatedOptions(TRANSACTION_TYPES);
  const loadCompany = useMemo(
    () =>
      id === null
        ? null
        : () =>
            Promise.all([
              window.electronAPI.company.getById(id),
              window.electronAPI.transaction.getByCompany(id),
              window.electronAPI.project.getAll(),
              window.electronAPI.category.getAll(),
            ]).then(([company, transactions, projects, categories]) => ({
              company: company ?? null,
              transactions,
              projects,
              categories,
            })),
    [id]
  );
  const { data, loading, reload } = useLoadedData(loadCompany, 'Company load error:');
  const company = data?.company ?? null;
  const transactions = data?.transactions ?? NO_ITEMS;
  const projects = data?.projects ?? NO_ITEMS;
  const categories = data?.categories ?? NO_ITEMS;

  const list = useTransactionList({
    transactions,
    loadData: reload,
    exportPrefix: company
      ? `${company.name}_${t('export.filenames.companyTransactions')}`
      : t('export.filenames.companyTransactions'),
  });
  const { ui, dispatch, printRef, printTransactions } = list;

  if (loading) {
    return <PageSpinner />;
  }

  if (!company) {
    return <DetailNotFound i18nPrefix="companyDetail" backTo="/companies" />;
  }

  const financials = calculateCompanyFinancials(transactions);
  const categoryChoices = categoryOptions(t, categories);

  return (
    <div className="page-container">
      <PageHeader
        backTo="/companies"
        title={company.name}
        badges={
          <>
            <TypeBadge type={company.type} />
            <AccountTypeBadge accountType={company.account_type} />
          </>
        }
        subtitle={company.type === 'person' ? company.profession : company.contact_person}
      >
        <TransactionPageActions list={list} printOptions />
      </PageHeader>

      <CompanyFlowStats financials={financials} />
      <CompanyBalanceStats financials={financials} />

      <DetailLayout>
        <DetailAside>
          <CompanyContactCard company={company} />
          <CompanyProfileCard company={company} />
        </DetailAside>
        <DetailMain>
          <CompanyTransactionsCard list={list} categoryChoices={categoryChoices} />
        </DetailMain>
      </DetailLayout>

      <TransactionListDialogs
        list={list}
        scope="cari"
        entityId={company.id}
        projects={projects}
        categories={categories}
      />

      <TransactionPrintOptions
        list={list}
        typeOptions={typeOptions}
        categoryOptions={categoryChoices}
      />

      <PrintPreviewModal
        isOpen={ui.printPreviewOpen}
        onClose={() => dispatch({ type: 'CLOSE_PRINT_PREVIEW' })}
      >
        <CompanyPrintView
          ref={printRef}
          company={company}
          transactions={printTransactions}
          filters={ui.printFilters}
          categories={categories}
        />
      </PrintPreviewModal>

      <TransactionExportPreview
        list={list}
        typeOptions={typeOptions}
        categoryOptions={categoryChoices}
      />
    </div>
  );
}

export default CompanyDetail;
