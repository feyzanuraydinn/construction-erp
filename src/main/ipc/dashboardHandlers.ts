import { IpcMainInvokeEvent } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import { parseId, validateId } from '../../utils/schemas';
import { safeHandle } from './safeHandle';

const DEFAULT_TOP_LIMIT = 5;

function positiveIntOr(value: unknown, fallback: number): number {
  const validation = validateId(value);
  return validation.success ? validation.data : fallback;
}

const yearOrCurrent = (year: unknown) => positiveIntOr(year, new Date().getFullYear());

export function registerDashboardHandlers(getDbService: () => DatabaseService): void {
  safeHandle('dashboard:getStats', () => getDbService().analytics.getDashboardStats());

  safeHandle('dashboard:getTopDebtors', (_: IpcMainInvokeEvent, limit: unknown) =>
    getDbService().analytics.getTopDebtors(positiveIntOr(limit, DEFAULT_TOP_LIMIT))
  );

  safeHandle('dashboard:getTopCreditors', (_: IpcMainInvokeEvent, limit: unknown) =>
    getDbService().analytics.getTopCreditors(positiveIntOr(limit, DEFAULT_TOP_LIMIT))
  );

  safeHandle('analytics:getMonthlyStats', (_: IpcMainInvokeEvent, year: unknown) =>
    getDbService().analytics.getMonthlyStats(yearOrCurrent(year))
  );

  safeHandle('analytics:getProjectCategoryBreakdown', (_: IpcMainInvokeEvent, projectId: unknown) =>
    getDbService().analytics.getProjectCategoryBreakdown(parseId(projectId))
  );

  safeHandle(
    'analytics:getCompanyMonthlyStats',
    (_: IpcMainInvokeEvent, companyId: unknown, year: unknown) => {
      const id = parseId(companyId);
      return getDbService().analytics.getCompanyMonthlyStats(id, yearOrCurrent(year));
    }
  );

  safeHandle('analytics:getCashFlowReport', (_: IpcMainInvokeEvent, year: unknown) =>
    getDbService().analytics.getCashFlowReport(yearOrCurrent(year))
  );

  safeHandle('analytics:getAgingReceivables', () => getDbService().analytics.getAgingReceivables());
}
