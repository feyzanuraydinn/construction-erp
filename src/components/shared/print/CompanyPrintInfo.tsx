import { useTranslation } from 'react-i18next';
import type { Company } from '../../../types';
import { PrintInfoGrid, PrintInfoRow, PrintInfoSection } from './PrintInfoSection';

interface CompanyPrintInfoProps {
  company: Company;
  className?: string;
}

export function CompanyPrintInfo({ company, className }: CompanyPrintInfoProps) {
  const { t } = useTranslation();
  return (
    <PrintInfoGrid className={className}>
      <PrintInfoSection title={t('print.contactInfo')}>
        {company.phone && <PrintInfoRow label={t('print.phoneLine')}>{company.phone}</PrintInfoRow>}
        {company.email && <PrintInfoRow label={t('print.emailLine')}>{company.email}</PrintInfoRow>}
        {company.address && (
          <PrintInfoRow label={t('print.addressLine')}>{company.address}</PrintInfoRow>
        )}
      </PrintInfoSection>
      <PrintInfoSection title={t('print.taxInfo')}>
        {company.tax_office && (
          <PrintInfoRow label={t('print.taxOffice')}>{company.tax_office}</PrintInfoRow>
        )}
        {company.tax_number && (
          <PrintInfoRow label={t('print.taxNumber')}>{company.tax_number}</PrintInfoRow>
        )}
      </PrintInfoSection>
    </PrintInfoGrid>
  );
}
