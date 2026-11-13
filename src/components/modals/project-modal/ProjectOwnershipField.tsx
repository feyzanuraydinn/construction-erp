import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { FiHome, FiUser } from 'react-icons/fi';
import { FieldLabel } from '../../ui/Input';
import { RadioCard } from '../../ui/RadioCard';
import type { OwnershipType } from '../../../types';
import type { ProjectForm } from './projectFormValues';

const OWNERSHIP_CARDS: { value: OwnershipType; icon: IconType; selectedClassName: string }[] = [
  {
    value: 'own',
    icon: FiHome,
    selectedClassName: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
  },
  {
    value: 'client',
    icon: FiUser,
    selectedClassName: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
  },
];

export function ProjectOwnershipField({
  form,
  className,
}: {
  form: ProjectForm;
  className?: string;
}) {
  const { t } = useTranslation();
  const ownershipType = form.watch('ownership_type');
  const error = form.formState.errors.ownership_type;

  return (
    <div className={className}>
      <FieldLabel label={t('projects.form.ownership')} />
      <div className="flex gap-4">
        {OWNERSHIP_CARDS.map(({ value, icon: Icon, selectedClassName }) => (
          <RadioCard
            key={value}
            name="ownership"
            value={value}
            checked={ownershipType === value}
            onSelect={() => {
              form.setValue('ownership_type', value, { shouldValidate: true });
              if (value === 'own') form.setValue('client_company_id', '');
            }}
            selectedClassName={selectedClassName}
            className="flex-1"
            cardClassName="p-3 text-center"
          >
            <Icon className="mx-auto mb-1" />
            <span className="text-sm font-medium">{t(`enums.ownershipType.${value}`)}</span>
          </RadioCard>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error.message}</p>}
    </div>
  );
}
