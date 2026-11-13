import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
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
    mainLogger.info('Checking for updates...', 'AutoUpdater');
  });

  autoUpdater.on('update-available', (info) => {
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

  autoUpdater.on('update-not-available', () => {
    mainLogger.info('No update available, current version is up to date', 'AutoUpdater');
  });

  autoUpdater.on('error', (err) => {
    setTaskbarProgress(-1);
    mainLogger.error('Auto-updater error', 'AutoUpdater', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    setTaskbarProgress(progressObj.percent / 100);
    mainLogger.debug(`Downloading update: ${percent}%`, 'AutoUpdater');
  });

  autoUpdater.on('update-downloaded', (info) => {
    setTaskbarProgress(-1);
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
}

export function checkForUpdates(): void {
  if (installing) return;
  autoUpdater.checkForUpdates().catch((err) => {
    mainLogger.error('Update check error', 'AutoUpdater', err);
  });
}
