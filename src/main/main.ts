import { app, BrowserWindow, Menu, dialog, shell, session, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import { DatabaseService } from '../database/DatabaseService';
import { googleDriveService } from './googleDrive';
import { syncService } from './SyncService';
import { initAutoUpdater, checkForUpdates } from './autoUpdater';
import { mainLogger } from './logger';
import { registerAllHandlers } from './ipc';
import { backupDirectory } from './appPaths';
import { UI } from '../utils/constants';
import { t } from './i18n';
import { setDataWrittenListener } from './ipc/writeAndSave';
import { errorText } from '../utils/errorText';

let mainWindow: BrowserWindow | null = null;
let dbService: DatabaseService;
let isQuitting = false;
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function saveBeforeQuit(): Promise<void> {
  localBackup();
  try {
    const cloudResult = await syncService.beforeQuit();
    if (!cloudResult.canQuit && cloudResult.error && cloudResult.error !== 'timeout') {
      mainLogger.warn(`Cloud upload on close failed: ${cloudResult.error}`, 'Sync');
    }
  } catch (err) {
    mainLogger.error('Cloud upload on close error', 'Sync', err);
  }
  isQuitting = true;
}

const isDev = !app.isPackaged;
const DEV_SERVER_ORIGIN = 'http://localhost:3000';

process.on('uncaughtException', (error: Error) => {
  if (error.message?.includes('EPIPE') || error.message?.includes('broken pipe')) {
    mainLogger.warn(t('main.streamError'), 'Process');
    return;
  }
  mainLogger.error('Unexpected error', 'Process', error);
  dialog.showErrorBox(t('main.errorTitle'), t('main.unexpectedError', { error: error.message }));
});

Menu.setApplicationMenu(null);

function hasUnbackedChanges(): boolean {
  if (!dbService) return false;
  return dbService.isDirty();
}

function localBackup(): void {
  if (!dbService) return;
  try {
    dbService.createBackup(backupDirectory());
    mainLogger.debug('Local backup completed', 'Backup');
  } catch (error) {
    mainLogger.error('Local backup failed', 'Backup', error);
  }
}

function createWindow(): void {
  let iconPath: string;
  if (isDev) {
    iconPath = path.join(__dirname, '../../public/icon.ico');
  } else {
    iconPath = path.join(process.resourcesPath, 'icon.ico');
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(__dirname, '../build/icon.ico');
    }
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(__dirname, '../../build/icon.ico');
    }
  }
  mainLogger.debug(`Icon path: ${iconPath}, Exists: ${fs.existsSync(iconPath)}`, 'Window');

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    minWidth: UI.MIN_WINDOW_WIDTH,
    minHeight: UI.MIN_WINDOW_HEIGHT,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: iconPath,
    show: false,
    backgroundColor: '#0f172a',
  });

  const win = mainWindow;
  win.once('ready-to-show', () => {
    win.maximize();
    win.show();

    if (!isDev) {
      initAutoUpdater(win, saveBeforeQuit);
      setTimeout(() => checkForUpdates(), 5000);
      setInterval(() => checkForUpdates(), UPDATE_CHECK_INTERVAL_MS);
    }
  });

  if (isDev) {
    mainWindow.loadURL(DEV_SERVER_ORIGIN);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../build/index.html'));
  }

  mainWindow.on('close', (e) => {
    if (isQuitting) return;
    e.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:close-requested', {
        hasPendingChanges: hasUnbackedChanges(),
      });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function startApp(): Promise<void> {
  mainLogger.init();
  mainLogger.info('Application starting...', 'Main');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws://localhost:* http://localhost:*; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
            : "default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;",
        ],
      },
    });
  });

  const isAppUrl = (rawUrl: string): boolean => {
    try {
      const url = new URL(rawUrl);
      return isDev ? url.origin === DEV_SERVER_ORIGIN : url.protocol === 'file:';
    } catch {
      return false;
    }
  };

  app.on('web-contents-created', (_, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
      if (!isAppUrl(navigationUrl)) {
        event.preventDefault();
        mainLogger.warn(`Blocked navigation to: ${navigationUrl}`, 'Security');
      }
    });

    contents.setWindowOpenHandler(({ url }) => {
      try {
        const { protocol } = new URL(url);
        if (protocol === 'https:' || protocol === 'http:') {
          void shell.openExternal(url);
        }
      } catch {
        mainLogger.warn(`Blocked invalid window URL: ${url}`, 'Security');
      }
      return { action: 'deny' };
    });
  });

  dbService = new DatabaseService(mainLogger.forContext('Database'));
  await dbService.init(app.getPath('userData'));
  googleDriveService.init(app.getPath('userData'));

  setDataWrittenListener(() => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('db:changed');
  });

  registerAllHandlers(
    () => dbService,
    () => mainWindow,
    saveBeforeQuit
  );

  createWindow();

  mainLogger.info('Application initialized', 'Main');

  if (mainWindow && dbService) {
    syncService.init(dbService, mainWindow, app.getPath('userData'));
    syncService.start();
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
  app
    .whenReady()
    .then(startApp)
    .catch((error: unknown) => {
      const message = errorText(error);
      mainLogger.error('Application failed to start', 'Main', error);
      dialog.showErrorBox(t('main.errorTitle'), t('main.unexpectedError', { error: message }));
      app.quit();
    });
}

app.on('window-all-closed', () => {
  syncService.stop();
  if (dbService) dbService.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
