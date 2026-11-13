import type { UseFormReturn } from 'react-hook-form';
import { formatDateForInput } from '../../../utils/formatters';
import type { ProjectFormInput, ProjectInput } from '../../../utils/schemas';
import type { ProjectWithSummary } from '../../../types';

export type ProjectForm = UseFormReturn<ProjectFormInput>;

export const PROJECT_DEFAULTS: ProjectFormInput = {
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

export function projectFormValues(project: ProjectWithSummary): ProjectFormInput {
  return {
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
  };
}

export function projectSaveInput(parsed: ProjectInput): ProjectFormInput {
  return {
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
}
