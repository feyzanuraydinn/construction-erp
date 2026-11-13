import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StakeholderDetailModal } from './project-detail/StakeholderDetailModal';
import { ExpenseBreakdownChart } from './project-detail/ExpenseBreakdownChart';
import {
  ProjectResultStats,
  UnmatchedPaymentsNotice,
  ProjectBudgetStats,
} from './project-detail/ProjectStats';
import { ProjectInfoCard } from './project-detail/ProjectInfoCard';
import { ProjectActivityCard, type ProjectTab } from './project-detail/ProjectActivityCard';
import { collectStakeholders, type StakeholderRef } from './project-detail/projectStakeholders';
import { PrintPreviewModal } from '../components/modals/PrintPreviewModal';
import { ProjectPrintView } from '../components/shared/PrintView';
import { DetailLayout, DetailAside, DetailMain } from '../components/shared/DetailLayout';
import { TransactionPageActions } from '../components/transaction-list/TransactionListParts';
import { TransactionListDialogs } from '../components/transaction-list/TransactionListDialogs';
import { TransactionExportPreview } from '../components/transaction-list/TransactionExportPreview';
import { categoryOptions } from '../components/transaction-list/options';
import { StatusBadge, OwnershipBadge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/LoadingSpinner';
import { useTransactionList } from '../hooks/useTransactionList';
import { calculateProjectFinancials } from '../utils/financials';
import { TRANSACTION_TYPES } from '../utils/constants';
import { useIdParam } from '../hooks/useIdParam';
import { useLoadedData } from '../hooks/useLoadedData';
import { NO_ITEMS } from '../utils/emptyList';
import { useTranslatedOptions } from '../hooks/useTranslatedOptions';
import { PageHeader } from '../components/shared/PageHeader';
import { DetailNotFound } from '../components/shared/DetailFields';

function ProjectDetail() {
  const id = useIdParam();
  const { t } = useTranslation();
  const typeOptions = useTranslatedOptions(TRANSACTION_TYPES);

  const [activeTab, setActiveTab] = useState<ProjectTab>('transactions');
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [stakeholderDetailModal, setStakeholderDetailModal] = useState<StakeholderRef | null>(null);

  const loadProject = useMemo(
    () =>
      id === null
        ? null
        : () =>
            Promise.all([
              window.electronAPI.project.getById(id),
              window.electronAPI.transaction.getByProject(id),
              window.electronAPI.company.getAll(),
              window.electronAPI.category.getAll(),
              window.electronAPI.analytics.getProjectCategoryBreakdown(id),
            ]).then(([project, transactions, companies, categories, categoryBreakdown]) => ({
              project: project ?? null,
              transactions,
              companies,
              categories,
              categoryBreakdown,
            })),
    [id]
  );
  const { data, loading, reload } = useLoadedData(loadProject, 'Project load error:');
  const project = data?.project ?? null;
  const transactions = data?.transactions ?? NO_ITEMS;
  const companies = data?.companies ?? NO_ITEMS;
  const categories = data?.categories ?? NO_ITEMS;
  const categoryBreakdown = data?.categoryBreakdown ?? NO_ITEMS;

  const list = useTransactionList({
    transactions,
    loadData: reload,
    extraFilter: (tx) => {
      if (filterCompanyId && String(tx.company_id) !== filterCompanyId) return false;
      return true;
    },
    exportPrefix: project
      ? `${project.name}_${t('export.filenames.projectTransactions')}`
      : t('export.filenames.projectTransactions'),
  });
  const { ui, dispatch, printRef } = list;

  if (loading) {
    return <PageSpinner />;
  }

  if (!project) {
    return <DetailNotFound i18nPrefix="projectDetail" backTo="/projects" />;
  }

  const isClientProject = project.ownership_type === 'client';
  const categoryChoices = categoryOptions(t, categories);
  const financials = calculateProjectFinancials(
    transactions,
    project.ownership_type,
    project.estimated_budget
  );
  const stakeholders = collectStakeholders(transactions, companies);

  return (
    <div className="page-container">
      <PageHeader
        backTo="/projects"
        title={project.name}
        badges={
          <>
            <StatusBadge status={project.status} />
            <OwnershipBadge ownership={project.ownership_type} />
          </>
        }
        subtitle={
          <>
            {project.code}
            {project.client_name && (
              <span className="ml-2 text-purple-600 dark:text-purple-400 font-medium">
                • {t('projectDetail.clientLabel')}: {project.client_name}
              </span>
            )}
          </>
        }
      >
        <TransactionPageActions list={list} />
      </PageHeader>

      <ProjectResultStats financials={financials} isClientProject={isClientProject} />
      <UnmatchedPaymentsNotice financials={financials} />
      <ProjectBudgetStats
        financials={financials}
        isClientProject={isClientProject}
        estimatedBudget={project.estimated_budget}
      />

      <DetailLayout>
        <DetailAside>
          <ProjectInfoCard project={project} />
          <ExpenseBreakdownChart categoryBreakdown={categoryBreakdown} />
        </DetailAside>
        <DetailMain>
          <ProjectActivityCard
            list={list}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            stakeholders={stakeholders}
            categoryChoices={categoryChoices}
            filterCompanyId={filterCompanyId}
            onFilterCompanyChange={setFilterCompanyId}
            onStakeholderSelect={setStakeholderDetailModal}
          />
        </DetailMain>
      </DetailLayout>

      <TransactionListDialogs
        list={list}
        scope="project"
        entityId={project.id}
        companies={companies}
        categories={categories}
      />

      <StakeholderDetailModal
        stakeholder={stakeholderDetailModal}
        transactions={transactions}
        onClose={() => setStakeholderDetailModal(null)}
      />

      <PrintPreviewModal
        isOpen={ui.printPreviewOpen}
        onClose={() => dispatch({ type: 'CLOSE_PRINT_PREVIEW' })}
      >
        <ProjectPrintView
          ref={printRef}
          project={project}
          transactions={transactions}
          categoryBreakdown={categoryBreakdown}
          parties={stakeholders.map((s) => ({
            id: s.company_id,
            role: s.account_type,
            company_name: s.company_name,
            phone: s.phone,
            email: s.email,
          }))}
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

export default ProjectDetail;
