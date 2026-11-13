import { useTranslation } from 'react-i18next';
import { ModalBody } from '../../ui/Modal';
import { Input, Select, Textarea } from '../../ui/Input';
import { AmountInput } from '../../ui/AmountInput';
import { useTranslatedOptions } from '../../../hooks/useTranslatedOptions';
import { CURRENCIES } from '../../../utils/constants';
import { pickOption } from '../../../utils/typeGuards';
import { categoryLabel } from '../../../utils/categories';
import { cn } from '../../../utils/cn';
import type { Category, Company, Project, TransactionScope, TransactionType } from '../../../types';
import { getFilteredCategories } from './formState';
import type { TransactionFieldsState } from './useTransactionFields';
import type { MatchCandidatesState } from './useMatchCandidates';
import type { RestChoiceState } from './useRestChoice';
import { TransactionTypePicker } from './TransactionTypePicker';
import { ExchangeRateBox } from './ExchangeRateBox';
import { MatchPanel } from './MatchPanel';
import { RestChoiceFields } from './RestChoiceFields';
import { DocumentNoInput } from './DocumentNoInput';

interface TransactionFormFieldsProps {
  fields: TransactionFieldsState;
  matching: MatchCandidatesState;
  rest: RestChoiceState;
  isSimple: boolean;
  scope: TransactionScope;
  categories: Category[];
  companies: Company[];
  projects: Project[];
  targetAmount: number;
  poolProjectId: number | null;
  showMatchPanel: boolean;
  showNoCompanyHint: boolean;
  needsRestChoice: boolean;
  onTypeChange: (type: TransactionType) => void;
  className?: string;
}

export function TransactionFormFields({
  fields,
  matching,
  rest,
  isSimple,
  scope,
  categories,
  companies,
  projects,
  targetAmount,
  poolProjectId,
  showMatchPanel,
  showNoCompanyHint,
  needsRestChoice,
  onTypeChange,
  className,
}: TransactionFormFieldsProps) {
  const { t } = useTranslation();
  const currencyOptions = useTranslatedOptions(CURRENCIES);
  const { formData, updateField } = fields;
  const enableCurrency = !isSimple;

  return (
    <ModalBody className={cn('space-y-4', className)}>
      <TransactionTypePicker isSimple={isSimple} value={formData.type} onChange={onTypeChange} />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={`${t('common.date')} *`}
          type="date"
          value={formData.date}
          onChange={(e) => updateField('date', e.target.value)}
          required
        />
        <Select
          label={`${t('common.category')} *`}
          options={getFilteredCategories(categories, formData.type).map((c) => ({
            value: c.id,
            label: categoryLabel(t, c.name),
          }))}
          value={formData.category_id}
          onChange={(e) => updateField('category_id', e.target.value)}
          required
        />
      </div>

      <Input
        label={`${t('common.description')} *`}
        value={formData.description}
        onChange={(e) => updateField('description', e.target.value)}
        placeholder={isSimple ? t('transactions.form.descriptionPlaceholder') : undefined}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <AmountInput
          label={isSimple ? `${t('transactionModal.amountTL')} *` : `${t('common.amount')} *`}
          value={formData.amount}
          onValueChange={(value) => updateField('amount', value)}
          required
        />
        {enableCurrency ? (
          <Select
            label={t('common.currency')}
            options={currencyOptions}
            value={formData.currency}
            onChange={(e) => {
              const currency = pickOption(CURRENCIES, e.target.value);
              if (currency) fields.changeCurrency(currency);
            }}
          />
        ) : (
          <DocumentNoInput
            value={formData.document_no}
            onChange={(value) => updateField('document_no', value)}
            placeholder={t('transactionModal.invoiceNo')}
          />
        )}
      </div>

      {enableCurrency && formData.currency !== 'TRY' && (
        <ExchangeRateBox
          currency={formData.currency}
          rate={fields.rateText}
          currentRate={fields.currentRate}
          amount={formData.amount}
          error={fields.rateError}
          onRateChange={fields.changeRate}
          onApplyCurrentRate={fields.applyCurrentRate}
        />
      )}

      {scope === 'project' && companies.length > 0 && (
        <Select
          label={t('transactionModal.companyOptional')}
          options={companies.map((c) => ({ value: c.id, label: c.name }))}
          value={formData.company_id}
          onChange={(e) => updateField('company_id', e.target.value)}
          placeholder={t('transactionModal.selectCompany')}
        />
      )}

      {scope === 'cari' && projects.length > 0 && (
        <Select
          label={t('transactionModal.projectOptional')}
          options={projects.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
          value={formData.project_id}
          onChange={(e) => updateField('project_id', e.target.value)}
          placeholder={t('transactionModal.selectProject')}
        />
      )}

      {showMatchPanel && (
        <MatchPanel
          matching={matching}
          type={formData.type}
          targetAmount={targetAmount}
          poolProjectId={poolProjectId}
          showNoCompanyHint={showNoCompanyHint}
        >
          {needsRestChoice && (
            <RestChoiceFields
              rest={rest}
              unmatched={matching.unmatched}
              isIncome={formData.type === 'payment_in'}
            />
          )}
        </MatchPanel>
      )}

      {enableCurrency && (
        <DocumentNoInput
          value={formData.document_no}
          onChange={(value) => updateField('document_no', value)}
          placeholder={t('transactionModal.invoiceWaybillNo')}
        />
      )}

      <Textarea
        label={t('common.notes')}
        value={formData.notes}
        onChange={(e) => updateField('notes', e.target.value)}
        rows={2}
      />
    </ModalBody>
  );
}
