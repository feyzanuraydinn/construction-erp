import { useTranslation } from 'react-i18next';
import { Input } from '../../ui/Input';
import { FormSection } from '../../ui/FormSection';
import { IbanInput } from './CompanyMaskedInputs';
import type { CompanyForm } from './companyFormValues';

export function CompanyBankFields({ form, className }: { form: CompanyForm; className?: string }) {
  const { t } = useTranslation();

  return (
    <FormSection title={t('companies.form.bankInfo')} className={className}>
      <Input
        label={t('companies.form.bankName')}
        {...form.register('bank_name')}
        error={form.formState.errors.bank_name?.message}
      />
      <IbanInput form={form} />
    </FormSection>
  );
}
