import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiHome, FiUser } from 'react-icons/fi';
import {
  Modal,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  Textarea,
} from '../ui';
import { formatDateForInput } from '../../utils/formatters';
import { PROJECT_STATUSES, PROJECT_TYPES } from '../../utils/constants';
import { projectSchema } from '../../utils/schemas';
import type { ProjectInput, ProjectFormInput } from '../../utils/schemas';
import type { ProjectWithSummary, Company } from '../../types';

export interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectWithSummary | null;
  companies: Company[];
  onSave: (isNew: boolean) => void;
}

export function ProjectModal({ isOpen, onClose, project, companies, onSave }: ProjectModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const defaultValues: ProjectFormInput = {
    code: '',
    name: '',
    ownership_type: 'own',
    client_company_id: '',
    status: 'planned',
    project_type: undefined,
    location: '',
    total_area: '',
    unit_count: '',
    estimated_budget: '',
    planned_start: '',
    planned_end: '',
    actual_start: '',
    actual_end: '',
    description: '',
  };

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProjectFormInput>({
    resolver: zodResolver(projectSchema),
    defaultValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    const initForm = async () => {
      if (project) {
        reset({
          code: project.code || '',
          name: project.name || '',
          ownership_type: project.ownership_type || 'own',
          client_company_id: project.client_company_id ? String(project.client_company_id) : '',
          status: project.status || 'planned',
          project_type: project.project_type || undefined,
          location: project.location || '',
          total_area: project.total_area ? String(project.total_area) : '',
          unit_count: project.unit_count ? String(project.unit_count) : '',
          estimated_budget: project.estimated_budget ? String(project.estimated_budget) : '',
          planned_start: formatDateForInput(project.planned_start) || '',
          planned_end: formatDateForInput(project.planned_end) || '',
          actual_start: formatDateForInput(project.actual_start) || '',
          actual_end: formatDateForInput(project.actual_end) || '',
          description: project.description || '',
        });
      } else {
        const code = await window.electronAPI.project.generateCode();
        reset({ ...defaultValues, code });
      }
    };
    if (isOpen) initForm();
  }, [project, isOpen, reset]);

  const onSubmit = async (formValues: ProjectFormInput) => {
    setLoading(true);
    try {
      const parsed = projectSchema.parse(formValues);

      const data = {
        ...parsed,
        client_company_id:
          parsed.ownership_type === 'client' && parsed.client_company_id
            ? parsed.client_company_id
            : undefined,
        project_type: parsed.project_type ?? undefined,
        location: parsed.location ?? undefined,
        total_area: parsed.total_area ?? undefined,
        unit_count: parsed.unit_count ?? undefined,
        estimated_budget: parsed.estimated_budget ?? undefined,
        planned_start: parsed.planned_start ?? undefined,
        planned_end: parsed.planned_end ?? undefined,
        actual_start: parsed.actual_start ?? undefined,
        actual_end: parsed.actual_end ?? undefined,
        description: parsed.description ?? undefined,
      };

      if (project) {
        await window.electronAPI.project.update(project.id, data);
        onSave(false);
      } else {
        await window.electronAPI.project.create(data);
        onSave(true);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t('common.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const ownershipType = watch('ownership_type');
  const status = watch('status');
  const projectType = watch('project_type');
  const clientCompanyId = watch('client_company_id');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? t('projects.editProject') : t('projects.newProject')}
      size="lg"
    >
      <form onSubmit={rhfHandleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <ModalBody className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('projects.form.projectCode')}
              {...register('code')}
              error={errors.code?.message}
              disabled={!!project}
            />
            <Select
              label={t('projects.form.status')}
              options={PROJECT_STATUSES.map((o) => ({ ...o, label: t(o.label) }))}
              value={status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setValue('status', e.target.value as ProjectInput['status'], { shouldValidate: true })
              }
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

          {/* Ownership Type */}
          <div>
            <label className="label">{t('projects.form.ownership')}</label>
            <div className="flex gap-4">
              <label className="flex-1">
                <input
                  type="radio"
                  name="ownership"
                  value="own"
                  checked={ownershipType === 'own'}
                  onChange={() => {
                    setValue('ownership_type', 'own', { shouldValidate: true });
                    setValue('client_company_id', '');
                  }}
                  className="sr-only"
                />
                <div
                  className={`p-3 border-2 rounded-lg cursor-pointer text-center transition-all ${
                    ownershipType === 'own'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <FiHome className="mx-auto mb-1" />
                  <span className="text-sm font-medium">{t('projects.form.ownProject')}</span>
                </div>
              </label>
              <label className="flex-1">
                <input
                  type="radio"
                  name="ownership"
                  value="client"
                  checked={ownershipType === 'client'}
                  onChange={() =>
                    setValue('ownership_type', 'client', { shouldValidate: true })
                  }
                  className="sr-only"
                />
                <div
                  className={`p-3 border-2 rounded-lg cursor-pointer text-center transition-all ${
                    ownershipType === 'client'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <FiUser className="mx-auto mb-1" />
                  <span className="text-sm font-medium">{t('projects.form.clientProject')}</span>
                </div>
              </label>
            </div>
            {errors.ownership_type && (
              <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.ownership_type.message}</p>
            )}
          </div>

          {ownershipType === 'client' && (
            <Select
              label={t('projects.form.relatedCompany')}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
              value={clientCompanyId ?? ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setValue('client_company_id', e.target.value, { shouldValidate: true })
              }
              error={errors.client_company_id?.message}
              placeholder={t('projects.form.selectCompany')}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t('projects.form.projectType')}
              options={PROJECT_TYPES.map((o) => ({ ...o, label: t(o.label) }))}
              value={projectType ?? ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setValue('project_type', (e.target.value || undefined) as ProjectInput['project_type'], { shouldValidate: true })
              }
              error={errors.project_type?.message}
              required
            />
            <Input
              label={t('projects.form.estimatedBudget')}
              type="number"
              {...register('estimated_budget')}
              error={errors.estimated_budget?.message}
            />
          </div>

          <Input
            label={t('projects.form.location')}
            {...register('location')}
            error={errors.location?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('projects.form.totalArea')}
              type="number"
              {...register('total_area')}
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

          {/* Dates */}
          <div className="pt-4 border-t dark:border-gray-700">
            <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">{t('projects.form.dates')}</p>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('projects.form.plannedStart')}
                type="date"
                {...register('planned_start')}
                error={errors.planned_start?.message}
              />
              <Input
                label={t('projects.form.plannedEnd')}
                type="date"
                {...register('planned_end')}
                error={errors.planned_end?.message}
              />
              <Input
                label={t('projects.form.actualStart')}
                type="date"
                {...register('actual_start')}
                error={errors.actual_start?.message}
              />
              <Input
                label={t('projects.form.actualEnd')}
                type="date"
                {...register('actual_end')}
                error={errors.actual_end?.message}
              />
            </div>
          </div>

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
            {project ? t('common.save') : t('common.save')}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
