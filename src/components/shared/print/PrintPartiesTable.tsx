import { useTranslation } from 'react-i18next';
import type { ProjectPartyWithDetails } from '../../../types';
import { PrintTableSection, PrintTd, PrintTh } from './PrintTable';

export type PrintParty = Pick<
  ProjectPartyWithDetails,
  'id' | 'role' | 'company_name' | 'phone' | 'email'
>;

interface PrintPartiesTableProps {
  parties?: PrintParty[];
  className?: string;
}

export function PrintPartiesTable({ parties, className }: PrintPartiesTableProps) {
  const { t } = useTranslation();
  if (!parties || parties.length === 0) return null;
  return (
    <PrintTableSection
      title={t('print.stakeholders')}
      className={className}
      head={
        <>
          <PrintTh>{t('print.role')}</PrintTh>
          <PrintTh>{t('print.company')}</PrintTh>
          <PrintTh>{t('print.phone')}</PrintTh>
          <PrintTh>{t('print.email')}</PrintTh>
        </>
      }
    >
      <tbody>
        {parties.map((party) => (
          <tr key={party.id}>
            <PrintTd>{t(`enums.accountType.${party.role}`, party.role)}</PrintTd>
            <PrintTd>{party.company_name}</PrintTd>
            <PrintTd>{party.phone || '-'}</PrintTd>
            <PrintTd>{party.email || '-'}</PrintTd>
          </tr>
        ))}
      </tbody>
    </PrintTableSection>
  );
}
