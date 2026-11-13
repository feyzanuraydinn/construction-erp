import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { companySchema, type CompanyInput, type CompanyFormInput } from '../../utils/schemas';
import type { CompanyWithBalance } from '../../types';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { ACCOUNT_TYPES } from '../../utils/constants';
import { pickOption } from '../../utils/typeGuards';
import { useTranslatedOptions } from '../../hooks/useTranslatedOptions';
import {
  COMPANY_DEFAULT_VALUES,
  companyFormValues,
  companySaveInput,
} from './company-modal/companyFormValues';
import { CompanyTypeCards } from './company-modal/CompanyTypeCards';
import { TcNumberInput, PhoneInput } from './company-modal/CompanyMaskedInputs';
import { CompanyBankFields } from './company-modal/CompanyBankFields';
import { useSaveAction } from '../../hooks/useSaveAction';

const BUSINESS_FIELD_ROWS = [
  [
    { name: 'tax_office', labelKey: 'companies.form.taxOffice' },
    { name: 'tax_number', labelKey: 'companies.form.taxNumber' },
  ],
  [
    { name: 'trade_registry_no', labelKey: 'companies.form.tradeRegistryNo' },
    { name: 'contact_person', labelKey: 'companies.form.contactPerson' },
  ],
] as const;

export interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyWithBalance | null;
  onSave: (isNew: boolean) => void;
  className?: string;
}

export function CompanyModal({ isOpen, onClose, company, onSave, className }: CompanyModalProps) {
  const { t } = useTranslation();
  const { saving: loading, runSave } = useSaveAction();
  const translatedAccountTypes = useTranslatedOptions(ACCOUNT_TYPES);

  const form = useForm<CompanyFormInput, unknown, CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: COMPANY_DEFAULT_VALUES,
    mode: 'onBlur',
  });
  const {
    register,
    handleSubmit: rhfHandleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = form;

  const type = watch('type');
  const accountType = watch('account_type');

  useEffect(() => {
    reset(company ? companyFormValues(company) : { ...COMPANY_DEFAULT_VALUES });
  }, [company, isOpen, reset]);

  const onSubmit = (data: CompanyInput) =>
    runSave(async () => {
      const dataToSave = companySaveInput(data);
      if (company) {
        await window.electronAPI.company.update(company.id, dataToSave);
        onSave(false);
      } else {
        await window.electronAPI.company.create(dataToSave);
        onSave(true);
      }
    });

  return (
    <Modal
      className={className}
      isOpen={isOpen}
      onClose={onClose}
      title={company ? t('companies.editCompany') : t('companies.newCompanyTitle')}
      size="lg"
    >
      <form
        onSubmit={rhfHandleSubmit(onSubmit)}
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        <ModalBody className="space-y-6">
          <CompanyTypeCards type={type} onSelect={(value) => setValue('type', value)} />

          <Select
            label={t('companies.form.accountType')}
            options={translatedAccountTypes}
            value={accountType}
            onChange={(e) => {
              const nextType = pickOption(ACCOUNT_TYPES, e.target.value);
              if (nextType) setValue('account_type', nextType, { shouldValidate: true });
            }}
            error={errors.account_type?.message}
            required
          />

          {type === 'person' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('companies.form.fullName')}
                  {...register('name')}
                  error={errors.name?.message}
                  required
                />
                <TcNumberInput form={form} />
              </div>
              <Input
                label={t('companies.form.profession')}
                {...register('profession')}
                error={errors.profession?.message}
              />
            </>
          ) : (
            <>
              <Input
                label={t('companies.form.companyName')}
                {...register('name')}
                error={errors.name?.message}
                required
              />
              {BUSINESS_FIELD_ROWS.map((row) => (
                <div key={row[0].name} className="grid grid-cols-2 gap-4">
                  {row.map(({ name, labelKey }) => (
                    <Input
                      key={name}
                      label={t(labelKey)}
                      {...register(name)}
                      error={errors[name]?.message}
                    />
                  ))}
                </div>
              ))}
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <PhoneInput form={form} />
            <Input
              label={t('companies.form.email')}
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder={t('companies.form.emailPlaceholder')}
            />
          </div>

          <Input
            label={t('companies.form.address')}
            {...register('address')}
            error={errors.address?.message}
          />

          <CompanyBankFields form={form} />

          <Input
            label={t('companies.form.notes')}
            {...register('notes')}
            error={errors.notes?.message}
          />
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose} type="button">
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {t('common.save')}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
