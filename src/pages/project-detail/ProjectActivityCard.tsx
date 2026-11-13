import { useTranslation } from 'react-i18next';
import {
  TransactionBulkDelete,
  TransactionQuickFilters,
} from '../../components/transaction-list/TransactionListParts';
import { TransactionTable } from '../../components/transaction-list/TransactionTable';
import { TransactionFilterPanel } from '../../components/transaction-list/TransactionFilterPanel';
import type { OptionList } from '../../components/transaction-list/options';
import { Card, CardBody } from '../../components/ui/Card';
import { Select } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { TabGroup } from '../../components/ui/TabGroup';
import { getPaginationProps } from '../../hooks/usePagination';
import type { TransactionList } from '../../hooks/useTransactionList';
import { StakeholdersTable } from './StakeholdersTable';
import type { Stakeholder, StakeholderRef } from './projectStakeholders';

export type ProjectTab = 'transactions' | 'parties';

interface ProjectActivityCardProps {
  list: TransactionList;
  activeTab: ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
  stakeholders: Stakeholder[];
  categoryChoices: OptionList;
  filterCompanyId: string;
  onFilterCompanyChange: (companyId: string) => void;
  onStakeholderSelect: (stakeholder: StakeholderRef) => void;
  className?: string;
}

export function ProjectActivityCard({
  list,
  activeTab,
  onTabChange,
  stakeholders,
  categoryChoices,
  filterCompanyId,
  onFilterCompanyChange,
  onStakeholderSelect,
  className,
}: ProjectActivityCardProps) {
  const { t } = useTranslation();
  const { filteredTransactions, pagination } = list;
  const showTransactions = activeTab === 'transactions';

  return (
    <Card className={className}>
      <div className="border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 min-h-[56px]">
          <div className="flex items-center">
            <TabGroup
              tabs={[
                { key: 'transactions', label: t('projectDetail.transactionsTab') },
                { key: 'parties', label: t('projectDetail.partiesTab') },
              ]}
              activeTab={activeTab}
              onChange={onTabChange}
            />
            {showTransactions && (
              <div className="flex items-center gap-2 ml-3">
                <TransactionBulkDelete list={list} />
              </div>
            )}
          </div>
          {showTransactions && (
            <TransactionQuickFilters list={list}>
              <Select
                options={stakeholders.map((s) => ({
                  value: s.company_id,
                  label: s.company_name,
                }))}
                value={filterCompanyId}
                onChange={(e) => onFilterCompanyChange(e.target.value)}
                placeholder={t('shared.filters.allCompanies')}
                className="w-44"
              />
            </TransactionQuickFilters>
          )}
        </div>
        {showTransactions && (
          <TransactionFilterPanel
            list={list}
            categoryOptions={categoryChoices}
            extraActive={!!filterCompanyId}
            onClear={() => onFilterCompanyChange('')}
            className="px-6"
          />
        )}
      </div>

      <CardBody>
        {showTransactions &&
          (filteredTransactions.length === 0 ? (
            <EmptyState title={t('shared.transactionNotFound')} />
          ) : (
            <>
              <TransactionTable list={list} counterpart="company" />
              <Pagination {...getPaginationProps(pagination)} />
            </>
          ))}

        {activeTab === 'parties' &&
          (stakeholders.length === 0 ? (
            <EmptyState
              title={t('projectDetail.stakeholders.notFound')}
              description={t('projectDetail.stakeholders.noTransactions')}
            />
          ) : (
            <StakeholdersTable stakeholders={stakeholders} onSelect={onStakeholderSelect} />
          ))}
      </CardBody>
    </Card>
  );
}
