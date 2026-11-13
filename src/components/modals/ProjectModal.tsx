import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { AmountField } from '../ui/AmountField';
import { PROJECT_STATUSES, PROJECT_TYPES } from '../../utils/constants';
import { projectSchema, type ProjectFormInput } from '../../utils/schemas';
import type { ProjectWithSummary, Company } from '../../types';
import { pickOption } from '../../utils/typeGuards';
import { useTranslatedOptions } from '../../hooks/useTranslatedOptions';
import {
  PROJECT_DEFAULTS,
  projectFormValues,
  projectSaveInput,
} from './project-modal/projectFormValues';
import { ProjectOwnershipField } from './project-modal/ProjectOwnershipField';
import { ProjectDateFields } from './project-modal/ProjectDateFields';
import { useSaveAction } from '../../hooks/useSaveAction';

export interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectWithSummary | null;
  companies: Company[];
  onSave: (isNew: boolean) => void;
  className?: string;
}

export function ProjectModal({
  isOpen,
  onClose,
  project,
  companies,
  onSave,
  className,
}: ProjectModalProps) {
  const { t } = useTranslation();
  const statusOptions = useTranslatedOptions(PROJECT_STATUSES);
  const typeOptions = useTranslatedOptions(PROJECT_TYPES);
  const { saving: loading, runSave } = useSaveAction();

  const form = useForm<ProjectFormInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: PROJECT_DEFAULTS,
    mode: 'onBlur',
  });
  const {
    register,
    control,
    handleSubmit: rhfHandleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = form;

  useEffect(() => {
    const initForm = async () => {
      if (project) {
        reset(projectFormValues(project));
      } else {
        const code = await window.electronAPI.project.generateCode();
        reset({ ...PROJECT_DEFAULTS, code });
      }
    };
    if (isOpen) initForm();
  }, [project, isOpen, reset]);

  const onSubmit = (formValues: ProjectFormInput) =>
    runSave(async () => {
      const data = projectSaveInput(projectSchema.parse(formValues));
      if (project) {
        await window.electronAPI.project.update(project.id, data);
        onSave(false);
      } else {
        await window.electronAPI.project.create(data);
        onSave(true);
      }
    });

  const ownershipType = watch('ownership_type');
  const status = watch('status');
  const projectType = watch('project_type');
  const clientCompanyId = watch('client_company_id');

  return (
    <Modal
      className={className}
      isOpen={isOpen}
      onClose={onClose}
      title={project ? t('projects.editProject') : t('projects.newProject')}
      size="lg"
    >
      <form
        onSubmit={rhfHandleSubmit(onSubmit)}
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        <ModalBody className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('projects.form.projectCode')}
              {...register('code')}
              error={errors.code?.message}
              disabled={!!project}
            />
            <Select
              label={t('projects.form.status')}
              options={statusOptions}
              value={status}
              onChange={(e) => {
                const nextStatus = pickOption(PROJECT_STATUSES, e.target.value);
                if (nextStatus) setValue('status', nextStatus, { shouldValidate: true });
              }}
              error={errors.status?.message}
              required
            />
          </div>

          <Input
            label={t('projects.form.projectName')}
            {...register('name')}
            error={errors.name?.message}
            required
          />

          <ProjectOwnershipField form={form} />

          {ownershipType === 'client' && (
            <Select
              label={t('projects.form.relatedCompany')}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
              value={clientCompanyId ?? ''}
              onChange={(e) =>
                setValue('client_company_id', e.target.value, { shouldValidate: true })
              }
              error={errors.client_company_id?.message}
              placeholder={t('projects.form.selectCompany')}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t('projects.form.projectType')}
              options={typeOptions}
              value={projectType ?? ''}
              onChange={(e) =>
                setValue('project_type', pickOption(PROJECT_TYPES, e.target.value), {
                  shouldValidate: true,
                })
              }
              error={errors.project_type?.message}
              required
            />
            <AmountField
              control={control}
              name="estimated_budget"
              label={t('projects.form.estimatedBudget')}
              error={errors.estimated_budget?.message}
            />
          </div>

          <Input
            label={t('projects.form.location')}
            {...register('location')}
            error={errors.location?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <AmountField
              control={control}
              name="total_area"
              label={t('projects.form.totalArea')}
              error={errors.total_area?.message}
            />
            <Input
              label={t('projects.form.unitCount')}
              type="number"
              {...register('unit_count')}
              error={errors.unit_count?.message}
              placeholder={t('projects.form.unitCountPlaceholder')}
            />
          </div>

          <ProjectDateFields form={form} />

          <Textarea
            label={t('projects.form.description')}
            {...register('description')}
            error={errors.description?.message}
            rows={2}
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
