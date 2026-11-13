import { useTranslation } from 'react-i18next';
import { Input } from '../../ui/Input';
import { FormSection } from '../../ui/FormSection';
import type { ProjectForm } from './projectFormValues';

const DATE_FIELDS = [
  { name: 'planned_start', labelKey: 'projects.form.plannedStart' },
  { name: 'planned_end', labelKey: 'projects.form.plannedEnd' },
  { name: 'actual_start', labelKey: 'projects.form.actualStart' },
  { name: 'actual_end', labelKey: 'projects.form.actualEnd' },
] as const;

export function ProjectDateFields({ form, className }: { form: ProjectForm; className?: string }) {
  const { t } = useTranslation();
  const { errors } = form.formState;

  return (
    <FormSection title={t('projects.form.dates')} className={className}>
      {DATE_FIELDS.map(({ name, labelKey }) => (
        <Input
          key={name}
          label={t(labelKey)}
          type="date"
          {...form.register(name)}
          error={errors[name]?.message}
        />
      ))}
    </FormSection>
  );
}
