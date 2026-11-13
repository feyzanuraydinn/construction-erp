import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { FiUser, FiUsers } from 'react-icons/fi';
import { RadioCard } from '../../ui/RadioCard';
import type { CompanyType } from '../../../types';
import { cn } from '../../../utils/cn';

const COMPANY_TYPE_CARDS: { value: CompanyType; icon: IconType; descriptionKey: string }[] = [
  { value: 'person', icon: FiUser, descriptionKey: 'companies.form.personDesc' },
  { value: 'company', icon: FiUsers, descriptionKey: 'companies.form.companyDesc' },
];

interface CompanyTypeCardsProps {
  type: CompanyType;
  onSelect: (type: CompanyType) => void;
  className?: string;
}

export function CompanyTypeCards({ type, onSelect, className }: CompanyTypeCardsProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('flex gap-4', className)}>
      {COMPANY_TYPE_CARDS.map(({ value, icon: Icon, descriptionKey }) => (
        <RadioCard
          key={value}
          name="type"
          value={value}
          checked={type === value}
          onSelect={() => onSelect(value)}
          className="flex-1"
          cardClassName="p-4"
        >
          <div className="flex items-center gap-3">
            <Icon
              className={
                type === value
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500'
              }
              size={24}
            />
            <div>
              <p className="font-medium">{t(`enums.companyType.${value}`)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t(descriptionKey)}</p>
            </div>
          </div>
        </RadioCard>
      ))}
    </div>
  );
}
