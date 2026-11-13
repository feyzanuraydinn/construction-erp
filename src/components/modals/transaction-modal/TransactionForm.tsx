import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalFooter } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useToast } from '../../../contexts/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import { MONEY_TOLERANCE } from '../../../utils/money';
import { invoiceTypeFor, isPaymentType } from '../../../utils/transactionKinds';
import type {
  Category,
  Company,
  ExchangeRates,
  Project,
  TransactionScope,
  TransactionWithDetails,
} from '../../../types';
import { amountInTry } from './formState';
import type { MatchAmounts } from './matchAmounts';
import { buildTransactionInput } from './saveTransaction';
import { useTransactionFields } from './useTransactionFields';
import { useMatchCandidates } from './useMatchCandidates';
import { useRestChoice } from './useRestChoice';
import { useTransactionSave } from './useTransactionSave';
import { useTypeChangeGuard } from './useTypeChangeGuard';
import { TransactionFormFields } from './TransactionFormFields';

export interface TransactionFormProps {
  onClose: () => void;
  transaction: TransactionWithDetails | null;
  categories: Category[];
  onSave: (isNew: boolean) => void;
  scope: TransactionScope;
  entityId?: number;
  companies?: Company[];
  projects?: Project[];
  mode?: 'full' | 'simple';
  currentRates: ExchangeRates | null;
  className?: string;
}

export function TransactionForm({
  onClose,
  transaction,
  categories,
  onSave,
  scope,
  entityId,
  companies = [],
  projects = [],
  mode = 'full',
  currentRates,
  className,
}: TransactionFormProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const isSimple = mode === 'simple';
  const enableMatching = !isSimple;
  const fields = useTransactionFields(transaction, isSimple, currentRates);
  const { formData } = fields;
  const isPayment = isPaymentType(formData.type);
  const poolCompanyId =
    scope === 'cari'
      ? (entityId ?? null)
      : formData.company_id
        ? Number(formData.company_id)
        : null;
  const poolProjectId = scope === 'project' ? (entityId ?? null) : null;
  const targetAmount = amountInTry(formData.amount, fields.exchangeRate);
  const matching = useMatchCandidates({
    enabled: enableMatching,
    type: formData.type,
    companyId: poolCompanyId,
    projectId: poolProjectId,
    selfId: transaction?.id ?? null,
    savedType: transaction?.type ?? null,
    targetAmount,
  });
  const rest = useRestChoice({
    initial: transaction ? 'advance' : null,
    advanceAllowed: poolCompanyId !== null,
    categories,
    documentType: invoiceTypeFor(formData.type) ?? 'invoice_in',
  });
  const { saving, save } = useTransactionSave(onSave);
  const [advancePromptOpen, setAdvancePromptOpen] = useState(false);
  const typeChange = useTypeChangeGuard(transaction, (type) => {
    fields.changeType(type);
    matching.clear();
    rest.reset();
  });

  const restOpen = targetAmount > 0 && matching.unmatched > MONEY_TOLERANCE;
  const needsRestChoice = enableMatching && isPayment && restOpen;
  const needsAdvancePrompt =
    enableMatching &&
    !isPayment &&
    matching.ready &&
    restOpen &&
    matching.unusedAdvance > MONEY_TOLERANCE;
  const showMatchPanel =
    enableMatching &&
    (isPayment ||
      matching.candidates.length > 0 ||
      matching.matchedTotal > 0 ||
      matching.outsideMatches.length > 0);

  const persist = (toSave: MatchAmounts) =>
    save({
      transaction,
      data: buildTransactionInput({
        form: formData,
        transaction,
        scope,
        entityId,
        isSimple,
        exchangeRate: fields.exchangeRate,
      }),
      withMatching: enableMatching,
      matches: matching.ready ? toSave : null,
      isPayment,
      remainderCategoryId:
        needsRestChoice && rest.choice === 'document' ? Number(rest.categoryId) : null,
    });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fields.validateRate()) return;
    if (enableMatching && matching.matchedTotal > targetAmount + MONEY_TOLERANCE) {
      toast.error(
        t('transactionModal.allocationExceedsPayment', {
          allocated: formatCurrency(matching.matchedTotal),
          payment: formatCurrency(targetAmount),
        })
      );
      return;
    }
    if (!rest.validate(needsRestChoice)) return;
    if (needsAdvancePrompt) {
      setAdvancePromptOpen(true);
      return;
    }
    await persist(matching.matches);
  };

  const saveWithAutoMatch = () => {
    const filled = matching.fillRest();
    setAdvancePromptOpen(false);
    void persist(filled);
  };

  const saveWithoutMatching = () => {
    setAdvancePromptOpen(false);
    void persist(matching.matches);
  };

  const newTitle =
    scope === 'project'
      ? t('transactionModal.newProjectTransaction')
      : scope === 'company'
        ? t('transactionModal.companyIncomeExpense')
        : t('transactionModal.newTransaction');

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={transaction ? t('transactionModal.editTitle') : newTitle}
        size={showMatchPanel ? 'lg' : 'md'}
        className={className}
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <TransactionFormFields
            fields={fields}
            matching={matching}
            rest={rest}
            isSimple={isSimple}
            scope={scope}
            categories={categories}
            companies={companies}
            projects={projects}
            targetAmount={targetAmount}
            poolProjectId={poolProjectId}
            showMatchPanel={showMatchPanel}
            showNoCompanyHint={scope === 'project' && poolCompanyId === null && isPayment}
            needsRestChoice={needsRestChoice}
            onTypeChange={typeChange.request}
          />

          <ModalFooter>
            <Button variant="secondary" onClick={onClose} type="button">
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={saving} disabled={matching.loading}>
              {transaction ? t('common.update') : t('common.save')}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={typeChange.pending !== null}
        onClose={typeChange.cancel}
        onConfirm={typeChange.confirm}
        title={t('transactionModal.typeChangeWarningTitle')}
        message={t('transactionModal.typeChangeWarningMessage', {
          count: typeChange.pending?.count ?? 0,
          total: formatCurrency(typeChange.pending?.total ?? 0),
        })}
        type="warning"
        confirmText={t('transactionModal.removeAllocations')}
        cancelText={t('common.cancel')}
      />
      <ConfirmDialog
        isOpen={advancePromptOpen}
        onClose={() => setAdvancePromptOpen(false)}
        onConfirm={saveWithAutoMatch}
        onAlternative={saveWithoutMatching}
        title={t('transactionModal.openAdvanceTitle')}
        message={t(
          formData.type === 'invoice_out'
            ? 'transactionModal.openAdvanceMessageSale'
            : 'transactionModal.openAdvanceMessage',
          {
            amount: formatCurrency(matching.unusedAdvance),
            open: formatCurrency(matching.unmatched),
          }
        )}
        type="warning"
        confirmText={t('transactionModal.openAdvanceAutoMatch')}
        alternativeText={t('transactionModal.openAdvanceSkip')}
        cancelText={t('transactionModal.openAdvanceBack')}
        loading={saving}
      />
    </>
  );
}
