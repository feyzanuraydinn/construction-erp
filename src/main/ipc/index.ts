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
import { registerReviewHandlers } from './reviewHandlers';
import { registerWindowHandlers } from './windowHandlers';

export function registerAllHandlers(
  getDbService: () => DatabaseService,
  getMainWindow: () => BrowserWindow | null,
  saveBeforeQuit: () => Promise<void>
): void {
  registerCompanyHandlers(getDbService);
  registerProjectHandlers(getDbService);
  registerTransactionHandlers(getDbService);
  registerMaterialHandlers(getDbService);
  registerCategoryHandlers(getDbService);
  registerTrashHandlers(getDbService);
  registerDashboardHandlers(getDbService);
  registerReviewHandlers(getDbService);

  registerBackupHandlers(getDbService);
  registerExportHandlers(getMainWindow);
  registerGdriveHandlers();
  registerAppHandlers();
  registerSyncHandlers();
  registerWindowHandlers(getMainWindow, saveBeforeQuit);
}
