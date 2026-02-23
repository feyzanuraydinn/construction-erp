import { IpcMainInvokeEvent } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import { validateId } from '../../utils/schemas';
import { safeHandle } from './safeHandle';

export function registerDashboardHandlers(getDbService: () => DatabaseService): void {
  // Dashboard
  safeHandle('dashboard:getStats', () => getDbService().analytics.getDashboardStats());

  safeHandle('dashboard:getRecentTransactions', (_: IpcMainInvokeEvent, limit: unknown) => {
    const validation = validateId(limit);
    if (!validation.success) return getDbService().transactions.getRecent(10);
    return getDbService().transactions.getRecent(validation.data!);
  });

  safeHandle('dashboard:getTopDebtors', (_: IpcMainInvokeEvent, limit: unknown, startDate?: unknown) => {
    const validation = validateId(limit);
    const lim = validation.success ? validation.data! : 5;
    const sd = typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : undefined;
    return getDbService().analytics.getTopDebtors(lim, sd);
  });

  safeHandle('dashboard:getTopCreditors', (_: IpcMainInvokeEvent, limit: unknown, startDate?: unknown) => {
    const validation = validateId(limit);
    const lim = validation.success ? validation.data! : 5;
    const sd = typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : undefined;
    return getDbService().analytics.getTopCreditors(lim, sd);
  });

  // Analytics
  safeHandle('analytics:getMonthlyStats', (_: IpcMainInvokeEvent, year: unknown) => {
    const validation = validateId(year);
    if (!validation.success) return getDbService().analytics.getMonthlyStats(new Date().getFullYear());
    return getDbService().analytics.getMonthlyStats(validation.data!);
  });

  safeHandle(
    'analytics:getProjectCategoryBreakdown',
    (_: IpcMainInvokeEvent, projectId: unknown) => {
      const validation = validateId(projectId);
      if (!validation.success) throw new Error(validation.error);
      return getDbService().analytics.getProjectCategoryBreakdown(validation.data!);
    }
  );

  safeHandle(
    'analytics:getCompanyMonthlyStats',
    (_: IpcMainInvokeEvent, companyId: unknown, year: unknown) => {
      const companyValidation = validateId(companyId);
      if (!companyValidation.success) throw new Error(companyValidation.error);
      const yearValidation = validateId(year);
      if (!yearValidation.success)
        return getDbService().analytics.getCompanyMonthlyStats(companyValidation.data!, new Date().getFullYear());
      return getDbService().analytics.getCompanyMonthlyStats(companyValidation.data!, yearValidation.data!);
    }
  );

  safeHandle('analytics:getCashFlowReport', (_: IpcMainInvokeEvent, year: unknown) => {
    const validation = validateId(year);
    if (!validation.success) return getDbService().analytics.getCashFlowReport(new Date().getFullYear());
    return getDbService().analytics.getCashFlowReport(validation.data!);
  });

  safeHandle('analytics:getAgingReceivables', () => {
    return getDbService().analytics.getAgingReceivables();
  });
}
