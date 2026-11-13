import type { UseFormReturn } from 'react-hook-form';
import type { CompanyInput, CompanyFormInput } from '../../../utils/schemas';
import type { CompanyWithBalance } from '../../../types';

export type CompanyForm = UseFormReturn<CompanyFormInput, unknown, CompanyInput>;

export const COMPANY_DEFAULT_VALUES: CompanyFormInput = {
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

export function companyFormValues(company: CompanyWithBalance): CompanyFormInput {
  return {
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
  };
}

export function companySaveInput(data: CompanyInput): CompanyFormInput {
  const ibanText = (data.iban || '').replace(/\s/g, '');
  const isIbanEmpty = ibanText === '' || ibanText === 'TR';

  return {
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
}
