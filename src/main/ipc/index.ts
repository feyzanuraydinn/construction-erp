import { BrowserWindow } from 'electron';
import { DatabaseService } from '../../database/DatabaseService';
import { registerCompanyHandlers } from './companyHandlers';
import { registerProjectHandlers } from './projectHandlers';
import { registerTransactionHandlers } from './transactionHandlers';
import { registerMaterialHandlers } from './materialHandlers';
import { registerCategoryHandlers } from './categoryHandlers';
import { registerTrashHandlers } from './trashHandlers';
import { registerDashboardHandlers } from './dashboardHandlers';
import { registerBackupHandlers } from './backupHandlers';
import { registerExportHandlers } from './exportHandlers';
import { registerGdriveHandlers } from './gdriveHandlers';
import { registerAppHandlers } from './appHandlers';
import { registerSyncHandlers } from './syncHandlers';

/**
 * Register all IPC handlers
 *
 * @param getDbService - getter function for the database service
 * @param getMainWindow - getter function for main window
 */
export function registerAllHandlers(
  getDbService: () => DatabaseService,
  getMainWindow: () => BrowserWindow | null
): void {
  registerCompanyHandlers(getDbService);
  registerProjectHandlers(getDbService);
  registerTransactionHandlers(getDbService);
  registerMaterialHandlers(getDbService);
  registerCategoryHandlers(getDbService);
  registerTrashHandlers(getDbService);
  registerDashboardHandlers(getDbService);

  registerBackupHandlers(getDbService, getMainWindow);
  registerExportHandlers(getMainWindow);
  registerGdriveHandlers();
  registerAppHandlers(getDbService);
  registerSyncHandlers();
}
