import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { companySchema } from '../../utils/schemas';
import type { CompanyInput } from '../../utils/schemas';
import type { CompanyFormData, CompanyWithBalance } from '../../types';
import { FiUser, FiUsers } from 'react-icons/fi';
import {
  Modal,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
} from '../ui';
import { ACCOUNT_TYPES } from '../../utils/constants';

// Form field type matches the Zod schema input (before transforms)
type CompanyFormFields = z.input<typeof companySchema>;

const companyDefaultValues: CompanyFormFields = {
  type: 'person',
  account_type: 'customer',
  name: '',
  tc_number: '',
  profession: '',
  tax_office: '',
  tax_number: '',
  trade_registry_no: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  bank_name: '',
  iban: '',
  notes: '',
};

export interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyWithBalance | null;
  onSave: (isNew: boolean) => void;
}

export function CompanyModal({ isOpen, onClose, company, onSave }: CompanyModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CompanyFormFields, unknown, CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: companyDefaultValues,
    mode: 'onBlur',
  });

  // Watch fields that need controlled behavior
  const type = watch('type');
  const accountType = watch('account_type');
  const phone = watch('phone');
  const iban = watch('iban');
  const tcNumber = watch('tc_number');

  useEffect(() => {
    if (company) {
      reset({
        type: company.type || 'person',
        account_type: company.account_type || 'customer',
        name: company.name || '',
        tc_number: company.tc_number || '',
        profession: company.profession || '',
        tax_office: company.tax_office || '',
        tax_number: company.tax_number || '',
        trade_registry_no: company.trade_registry_no || '',
        contact_person: company.contact_person || '',
        phone: company.phone || '',
        email: company.email || '',
        address: company.address || '',
        bank_name: company.bank_name || '',
        iban: company.iban || '',
        notes: company.notes || '',
      });
    } else {
      reset({ ...companyDefaultValues });
    }
  }, [company, isOpen, reset]);

  // Translated select options for modal
  const translatedAccountTypes = useMemo(() =>
    ACCOUNT_TYPES.map((opt) => ({ ...opt, label: t(opt.label) })),
    [t]
  );

  // Phone formatting helper
  const formatPhoneDigits = (digits: string): string => {
    let formatted = '';
    if (digits.length >= 1) formatted += digits[0];
    if (digits.length >= 2) formatted += '(' + digits[1];
    if (digits.length >= 3) formatted += digits[2];
    if (digits.length >= 4) formatted += digits[3] + ') ';
    if (digits.length >= 5) formatted += digits[4];
    if (digits.length >= 6) formatted += digits[5];
    if (digits.length >= 7) formatted += digits[6] + ' ';
    if (digits.length >= 8) formatted += digits[7];
    if (digits.length >= 9) formatted += digits[8] + ' ';
    if (digits.length >= 10) formatted += digits[9];
    if (digits.length >= 11) formatted += digits[10];
    return formatted;
  };

  // IBAN formatting helper
  const formatIbanNumbers = (numbers: string): string => {
    if (numbers.length === 0) return '';
    let formatted = 'TR';
    for (let i = 0; i < numbers.length; i++) {
      if (i % 4 === 0) formatted += ' ';
      formatted += numbers[i];
    }
    return formatted;
  };

  const onSubmit = async (data: CompanyInput) => {
    setLoading(true);
    try {
      // Clean up IBAN before saving
      const ibanText = (data.iban || '').replace(/\s/g, '');
      const isIbanEmpty = ibanText === '' || ibanText === 'TR';

      // Convert CompanyInput (null values) to CompanyFormData (undefined values)
      const dataToSave: CompanyFormData = {
        type: data.type,
        account_type: data.account_type,
        name: data.name,
        tc_number: data.tc_number ?? undefined,
        profession: data.profession ?? undefined,
        tax_office: data.tax_office ?? undefined,
        tax_number: data.tax_number ?? undefined,
        trade_registry_no: data.trade_registry_no ?? undefined,
        contact_person: data.contact_person ?? undefined,
        phone: data.phone ?? undefined,
        email: data.email ?? undefined,
        address: data.address ?? undefined,
        bank_name: data.bank_name ?? undefined,
        iban: isIbanEmpty ? '' : (data.iban ?? undefined),
        notes: data.notes ?? undefined,
      };

      if (company) {
        await window.electronAPI.company.update(company.id, dataToSave);
        onSave(false);
      } else {
        await window.electronAPI.company.create(dataToSave);
        onSave(true);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t('common.saveError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={company ? t('companies.editCompany') : t('companies.newCompanyTitle')}
      size="lg"
    >
      <form onSubmit={rhfHandleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <ModalBody className="space-y-6">
          {/* Type Selection */}
          <div className="flex gap-4">
            <label className="flex-1">
              <input
                type="radio"
                name="type"
                value="person"
                checked={type === 'person'}
                onChange={() => setValue('type', 'person')}
                className="sr-only"
              />
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  type === 'person'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FiUser
                    className={type === 'person' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}
                    size={24}
                  />
                  <div>
                    <p className="font-medium">{t('companies.form.person')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('companies.form.personDesc')}</p>
                  </div>
                </div>
              </div>
            </label>
            <label className="flex-1">
              <input
                type="radio"
                name="type"
                value="company"
                checked={type === 'company'}
                onChange={() => setValue('type', 'company')}
                className="sr-only"
              />
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  type === 'company'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FiUsers
                    className={type === 'company' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}
                    size={24}
                  />
                  <div>
                    <p className="font-medium">{t('companies.form.company')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('companies.form.companyDesc')}</p>
                  </div>
                </div>
              </div>
            </label>
          </div>

          {/* Account Type */}
          <Select
            label={t('companies.form.accountType')}
            options={translatedAccountTypes}
            value={accountType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setValue('account_type', e.target.value as CompanyInput['account_type'], { shouldValidate: true })
            }
            error={errors.account_type?.message}
            required
          />

          {/* Conditional Fields based on type */}
          {type === 'person' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('companies.form.fullName')}
                  {...register('name')}
                  error={errors.name?.message}
                  required
                />
                <Input
                  label={t('companies.form.tcNo')}
                  value={tcNumber || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setValue('tc_number', value, { shouldValidate: true });
                  }}
                  error={errors.tc_number?.message}
                  placeholder="12345678901"
                  maxLength={11}
                />
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
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('companies.form.taxOffice')}
                  {...register('tax_office')}
                  error={errors.tax_office?.message}
                />
                <Input
                  label={t('companies.form.taxNumber')}
                  {...register('tax_number')}
                  error={errors.tax_number?.message}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('companies.form.tradeRegistryNo')}
                  {...register('trade_registry_no')}
                  error={errors.trade_registry_no?.message}
                />
                <Input
                  label={t('companies.form.contactPerson')}
                  {...register('contact_person')}
                  error={errors.contact_person?.message}
                />
              </div>
            </>
          )}

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('companies.form.phone')}
              type="tel"
              value={phone || ''}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Backspace') {
                  e.preventDefault();
                  const currentDigits = (phone || '').replace(/\D/g, '');
                  if (currentDigits.length > 0) {
                    const newDigits = currentDigits.slice(0, -1);
                    if (newDigits.length === 0) {
                      setValue('phone', '', { shouldValidate: true });
                    } else {
                      setValue('phone', formatPhoneDigits(newDigits), { shouldValidate: true });
                    }
                  }
                }
              }}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const newDigits = e.target.value.replace(/\D/g, '');
                if (newDigits.length === 0) {
                  setValue('phone', '', { shouldValidate: true });
                  return;
                }

                let digits = newDigits;
                if (!digits.startsWith('0')) {
                  digits = '0' + digits;
                }
                if (digits.length > 1 && digits[1] !== '5') {
                  digits = '05' + digits.slice(2);
                }
                digits = digits.slice(0, 11);

                setValue('phone', formatPhoneDigits(digits), { shouldValidate: true });
              }}
              error={errors.phone?.message}
              placeholder={t('companies.form.phonePlaceholder')}
              maxLength={16}
            />
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

          {/* Bank Info */}
          <div className="pt-4 border-t dark:border-gray-700">
            <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">{t('companies.form.bankInfo')}</p>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('companies.form.bankName')}
                {...register('bank_name')}
                error={errors.bank_name?.message}
              />
              <Input
                label={t('companies.form.iban')}
                value={iban || ''}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Backspace') {
                    e.preventDefault();
                    const currentNumbers = (iban || '').replace(/[^0-9]/g, '');
                    if (currentNumbers.length > 0) {
                      const newNumbers = currentNumbers.slice(0, -1);
                      if (newNumbers.length === 0) {
                        setValue('iban', '', { shouldValidate: true });
                      } else {
                        setValue('iban', formatIbanNumbers(newNumbers), { shouldValidate: true });
                      }
                    }
                  }
                }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value.toUpperCase();
                  const numbers = value.replace(/[^0-9]/g, '').slice(0, 24);

                  if (numbers.length === 0) {
                    setValue('iban', '', { shouldValidate: true });
                    return;
                  }

                  setValue('iban', formatIbanNumbers(numbers), { shouldValidate: true });
                }}
                error={errors.iban?.message}
                placeholder={t('companies.form.ibanPlaceholder')}
                maxLength={32}
              />
            </div>
          </div>

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
            {company ? t('common.save') : t('common.save')}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
