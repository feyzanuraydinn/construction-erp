import { useTranslation } from 'react-i18next';
import { FiPhone, FiMail, FiMapPin, FiCreditCard } from 'react-icons/fi';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { DetailNote, DetailRow, InfoRow, MutedText } from '../../components/shared/DetailFields';
import type { Company } from '../../types';

const CONTACT_FIELDS = [
  { key: 'phone', icon: FiPhone },
  { key: 'email', icon: FiMail },
  { key: 'address', icon: FiMapPin },
] as const;

interface ProfileSection {
  titleKey: string;
  emptyKey: string;
  fields: {
    key: 'tc_number' | 'profession' | 'tax_office' | 'tax_number' | 'trade_registry_no';
    labelKey: string;
  }[];
}

const PERSON_SECTION: ProfileSection = {
  titleKey: 'companyDetail.personInfo',
  emptyKey: 'companyDetail.noPersonInfo',
  fields: [
    { key: 'tc_number', labelKey: 'companyDetail.fields.tcNumber' },
    { key: 'profession', labelKey: 'companyDetail.fields.profession' },
  ],
};

const COMPANY_SECTION: ProfileSection = {
  titleKey: 'companyDetail.companyInfo',
  emptyKey: 'companyDetail.noCompanyInfo',
  fields: [
    { key: 'tax_office', labelKey: 'companyDetail.fields.taxOffice' },
    { key: 'tax_number', labelKey: 'companyDetail.fields.taxNumber' },
    { key: 'trade_registry_no', labelKey: 'companyDetail.fields.tradeRegistry' },
  ],
};

interface CompanyCardProps {
  company: Company;
  className?: string;
}

export function CompanyContactCard({ company, className }: CompanyCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={className}>
      <CardHeader>
        <h3 className="font-semibold">{t('companyDetail.contactInfo')}</h3>
      </CardHeader>
      <CardBody className="space-y-3 text-sm">
        {CONTACT_FIELDS.map(({ key, icon }) => {
          const value = company[key];
          return value ? (
            <InfoRow key={key} icon={icon}>
              {value}
            </InfoRow>
          ) : null;
        })}
        {company.bank_name && (
          <InfoRow icon={FiCreditCard}>
            <p>{company.bank_name}</p>
            {company.iban && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{company.iban}</p>
            )}
          </InfoRow>
        )}
        {CONTACT_FIELDS.every(({ key }) => !company[key]) && (
          <MutedText>{t('companyDetail.noContactInfo')}</MutedText>
        )}
      </CardBody>
    </Card>
  );
}

export function CompanyProfileCard({ company, className }: CompanyCardProps) {
  const { t } = useTranslation();
  const section = company.type === 'person' ? PERSON_SECTION : COMPANY_SECTION;

  return (
    <Card className={className}>
      <CardHeader>
        <h3 className="font-semibold">{t(section.titleKey)}</h3>
      </CardHeader>
      <CardBody className="space-y-3 text-sm">
        {section.fields.map(({ key, labelKey }) => {
          const value = company[key];
          return value ? (
            <DetailRow key={key} label={t(labelKey)}>
              {value}
            </DetailRow>
          ) : null;
        })}
        {section.fields.every(({ key }) => !company[key]) && (
          <MutedText>{t(section.emptyKey)}</MutedText>
        )}
        {company.notes && (
          <DetailNote label={t('companyDetail.fields.notes')}>{company.notes}</DetailNote>
        )}
      </CardBody>
    </Card>
  );
}
