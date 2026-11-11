import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain, dialog } from 'electron';
import { mainLogger } from './logger';
import { t } from './i18n';

let mainWindow: BrowserWindow | null = null;
let prepareForInstall: () => Promise<void> = async () => undefined;
let installing = false;

async function installNow(): Promise<void> {
  if (installing) return;
  installing = true;
  try {
    await prepareForInstall();
  } catch (error) {
    mainLogger.error('Saving before the update install failed', 'AutoUpdater', error);
  }
  autoUpdater.quitAndInstall(false, true);
}

function setTaskbarProgress(progress: number): void {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setProgressBar(progress);
}

export function initAutoUpdater(window: BrowserWindow, beforeInstall: () => Promise<void>): void {
  mainWindow = window;
  prepareForInstall = beforeInstall;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('update-checking');
    mainLogger.info('Checking for updates...', 'AutoUpdater');
  });

  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('update-available', info);
    mainLogger.info(`Update available: ${info.version}`, 'AutoUpdater');
    if (!mainWindow || mainWindow.isDestroyed()) return;

    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: t('main.updater.availableTitle'),
        message: t('main.updater.availableMessage', { version: info.version }),
        buttons: [t('main.updater.downloadNow'), t('main.updater.later')],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate().catch((error: unknown) => {
            setTaskbarProgress(-1);
            mainLogger.error('Update download error', 'AutoUpdater', error);
          });
        }
      });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('update-not-available', info);
    mainLogger.info('No update available, current version is up to date', 'AutoUpdater');
  });

  autoUpdater.on('error', (err) => {
    setTaskbarProgress(-1);
    sendStatusToWindow('update-error', err.message);
    mainLogger.error('Auto-updater error', 'AutoUpdater', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    setTaskbarProgress(progressObj.percent / 100);
    sendStatusToWindow('update-download-progress', {
      percent,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
    mainLogger.debug(`Downloading update: ${percent}%`, 'AutoUpdater');
  });

  autoUpdater.on('update-downloaded', (info) => {
    setTaskbarProgress(-1);
    sendStatusToWindow('update-downloaded', info);
    mainLogger.info(`Update downloaded: ${info.version}`, 'AutoUpdater');
    if (!mainWindow || mainWindow.isDestroyed()) return;

    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: t('main.updater.readyTitle'),
        message: t('main.updater.readyMessage', { version: info.version }),
        buttons: [t('main.updater.restartNow'), t('main.updater.later')],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) void installNow();
      });
  });

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

  ipcMain.handle('updater:install', () => installNow());

  ipcMain.handle('updater:getVersion', () => {
    return autoUpdater.currentVersion.version;
  });
}

export function checkForUpdates(): void {
  if (installing) return;
  autoUpdater.checkForUpdates().catch((err) => {
    mainLogger.error('Update check error', 'AutoUpdater', err);
  });
}

function sendStatusToWindow(status: string, data?: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status, data });
  }
}
