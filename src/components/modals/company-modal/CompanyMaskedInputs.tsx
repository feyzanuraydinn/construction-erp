import { useTranslation } from 'react-i18next';
import { Input } from '../../ui/Input';
import { normalizePhoneInput, removeLastPhoneDigit } from '../../../utils/phone';
import type { CompanyForm } from './companyFormValues';

const VALIDATE = { shouldValidate: true };

interface MaskedInputProps {
  form: CompanyForm;
  className?: string;
}

function formatIbanNumbers(numbers: string): string {
  if (numbers.length === 0) return '';
  let formatted = 'TR';
  for (let i = 0; i < numbers.length; i++) {
    if (i % 4 === 0) formatted += ' ';
    formatted += numbers[i];
  }
  return formatted;
}

export function TcNumberInput({ form, className }: MaskedInputProps) {
  const { t } = useTranslation();
  const tcNumber = form.watch('tc_number');

  return (
    <Input
      label={t('companies.form.tcNo')}
      value={tcNumber || ''}
      onChange={(e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 11);
        form.setValue('tc_number', value, VALIDATE);
      }}
      error={form.formState.errors.tc_number?.message}
      placeholder="12345678901"
      maxLength={11}
      className={className}
    />
  );
}

export function PhoneInput({ form, className }: MaskedInputProps) {
  const { t } = useTranslation();
  const phone = form.watch('phone');

  return (
    <Input
      label={t('companies.form.phone')}
      type="tel"
      value={phone || ''}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' && phone) {
          e.preventDefault();
          form.setValue('phone', removeLastPhoneDigit(phone), VALIDATE);
        }
      }}
      onChange={(e) => {
        form.setValue('phone', normalizePhoneInput(e.target.value), VALIDATE);
      }}
      error={form.formState.errors.phone?.message}
      placeholder={t('companies.form.phonePlaceholder')}
      maxLength={16}
      className={className}
    />
  );
}

export function IbanInput({ form, className }: MaskedInputProps) {
  const { t } = useTranslation();
  const iban = form.watch('iban');

  return (
    <Input
      label={t('companies.form.iban')}
      value={iban || ''}
      onKeyDown={(e) => {
        if (e.key === 'Backspace') {
          e.preventDefault();
          const currentNumbers = (iban || '').replace(/[^0-9]/g, '');
          if (currentNumbers.length > 0) {
            form.setValue('iban', formatIbanNumbers(currentNumbers.slice(0, -1)), VALIDATE);
          }
        }
      }}
      onChange={(e) => {
        const numbers = e.target.value
          .toUpperCase()
          .replace(/[^0-9]/g, '')
          .slice(0, 24);
        form.setValue('iban', formatIbanNumbers(numbers), VALIDATE);
      }}
      error={form.formState.errors.iban?.message}
      placeholder={t('companies.form.ibanPlaceholder')}
      maxLength={32}
      className={className}
    />
  );
}
