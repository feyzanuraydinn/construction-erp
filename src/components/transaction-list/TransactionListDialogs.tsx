import { TransactionModal } from '../modals/TransactionModal';
import { TransactionDetailView } from '../shared/TransactionDetailView';
import { TransactionDeleteDialogs } from './TransactionDeleteDialogs';
import type { TransactionList } from '../../hooks/useTransactionList';
import type { Category, Company, Project, TransactionScope } from '../../types';

interface TransactionListDialogsProps {
  list: TransactionList;
  scope: TransactionScope;
  entityId?: number;
  categories: Category[];
  companies?: Company[];
  projects?: Project[];
  mode?: 'full' | 'simple';
}

export function TransactionListDialogs({
  list,
  scope,
  entityId,
  categories,
  companies,
  projects,
  mode,
}: TransactionListDialogsProps) {
  const { ui, dispatch } = list;
  return (
    <>
      <TransactionModal
        isOpen={ui.modalOpen}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        transaction={ui.editingTransaction}
        scope={scope}
        entityId={entityId}
        companies={companies}
        projects={projects}
        categories={categories}
        onSave={list.handleSaveTransaction}
        mode={mode}
      />
      <TransactionDeleteDialogs deletion={list.deletion} />
      <TransactionDetailView
        transaction={ui.viewingTransaction}
        allocations={list.viewingAllocations}
        onClose={() => dispatch({ type: 'CLOSE_VIEW' })}
        onEdit={(tx) => {
          dispatch({ type: 'EDIT_TRANSACTION', transaction: tx });
          dispatch({ type: 'CLOSE_VIEW' });
        }}
      />
    </>
  );
}
