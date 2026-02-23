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

/**
 * Register all IPC handlers
 *
 * @param getDbService - getter function (to support dbService reassignment on restore)
 * @param setDbService - setter function (used by backup:restore)
 * @param getMainWindow - getter function for main window
 * @param checkInternetConnection - internet check utility
 */
export function registerAllHandlers(
  getDbService: () => DatabaseService,
  setDbService: (s: DatabaseService) => void,
  getMainWindow: () => BrowserWindow | null,
  checkInternetConnection: () => Promise<boolean>
): void {
  // All handlers receive getter function so they always use the current dbService
  // (critical for backup:restore which replaces the dbService instance)
  registerCompanyHandlers(getDbService);
  registerProjectHandlers(getDbService);
  registerTransactionHandlers(getDbService);
  registerMaterialHandlers(getDbService);
  registerCategoryHandlers(getDbService);
  registerTrashHandlers(getDbService);
  registerDashboardHandlers(getDbService);

  registerBackupHandlers(getDbService, setDbService, getMainWindow, checkInternetConnection);
  registerExportHandlers(getMainWindow);
  registerGdriveHandlers(getDbService);
  registerAppHandlers(getDbService);
}
