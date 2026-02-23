import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain, dialog } from 'electron';
import { mainLogger } from './logger';
import { t } from './i18n';

let mainWindow: BrowserWindow | null = null;

/**
 * Initialize the auto-updater for the application.
 * Handles checking, downloading, and installing updates.
 * Configure update server URL in electron-builder.yml
 * @param window - The main BrowserWindow instance
 */
export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window;

  // Configure auto-updater
  autoUpdater.autoDownload = false; // Don't auto-download, ask user first
  autoUpdater.autoInstallOnAppQuit = true;

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('update-checking');
    mainLogger.info('Checking for updates...', 'AutoUpdater');
  });

  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('update-available', info);
    mainLogger.info(`Update available: ${info.version}`, 'AutoUpdater');

    // Ask user if they want to download
    dialog
      .showMessageBox(mainWindow!, {
        type: 'info',
        title: t('main.updater.availableTitle'),
        message: t('main.updater.availableMessage', { version: info.version }),
        buttons: [t('main.updater.downloadNow'), t('main.updater.later')],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('update-not-available', info);
    mainLogger.info('No update available, current version is up to date', 'AutoUpdater');
  });

  autoUpdater.on('error', (err) => {
    sendStatusToWindow('update-error', err.message);
    mainLogger.error('Auto-updater error', 'AutoUpdater', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    sendStatusToWindow('update-download-progress', {
      percent,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
    mainLogger.debug(`Downloading update: ${percent}%`, 'AutoUpdater');
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('update-downloaded', info);
    mainLogger.info(`Update downloaded: ${info.version}`, 'AutoUpdater');

    // Ask user to restart
    dialog
      .showMessageBox(mainWindow!, {
        type: 'info',
        title: t('main.updater.readyTitle'),
        message: t('main.updater.readyMessage', { version: info.version }),
        buttons: [t('main.updater.restartNow'), t('main.updater.later')],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });

  // IPC handlers for renderer process
  ipcMain.handle('updater:check', async () => {
    try {
      return await autoUpdater.checkForUpdates();
    } catch (error) {
      mainLogger.error('Update check error', 'AutoUpdater', error);
      return null;
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      mainLogger.error('Update download error', 'AutoUpdater', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.handle('updater:getVersion', () => {
    return autoUpdater.currentVersion.version;
  });
}

/**
 * Manually trigger an update check.
 * Errors are logged but not thrown to prevent UI disruption.
 */
export function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch((err) => {
    mainLogger.error('Update check error', 'AutoUpdater', err);
  });
}

/**
 * Send update status to renderer
 */
function sendStatusToWindow(status: string, data?: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status, data });
  }
}
