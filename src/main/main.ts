import {
  app,
  BrowserWindow,
  Menu,
  dialog,
  shell,
  session,
  ipcMain,
} from 'electron';
import path from 'path';
import fs from 'fs';
import { DatabaseService } from '../database/DatabaseService';
import { googleDriveService } from './googleDrive';
import { syncService } from './SyncService';
import { initAutoUpdater, checkForUpdates } from './autoUpdater';
import { mainLogger } from './logger';
import { registerAllHandlers } from './ipc';
import { UI } from '../utils/constants';
import { t } from './i18n';

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

// EPIPE gibi stream hatalarını yakala — Google Drive bağlantı kopması vb.
(process as NodeJS.EventEmitter).on('uncaughtException', (error: Error) => {
  if (error.message?.includes('EPIPE') || error.message?.includes('broken pipe')) {
    mainLogger.warn(t('main.streamError'), 'Process');
    return;
  }
  mainLogger.error('Unexpected error', 'Process', error);
  dialog.showErrorBox(t('main.errorTitle'), t('main.unexpectedError', { error: error.message }));
});

// Remove default menu bar (File, Edit, View, etc.)
Menu.setApplicationMenu(null);

// Yedeklenmemiş değişiklik var mı kontrol et
function hasUnbackedChanges(): boolean {
  if (!dbService) return false;
  return dbService.isDirty();
}

// Yerel yedek al (kapanış sırasında çağrılır)
function localBackup(): void {
  if (!dbService) return;
  try {
    const backupDir = path.join(app.getPath('userData'), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    dbService.createBackup(backupDir);
    mainLogger.debug('Local backup completed', 'Backup');
  } catch (error) {
    mainLogger.error('Local backup failed', 'Backup', error);
  }
}

function createWindow(): void {
  // Icon path - Windows için .ico, diğerleri için .png
  let iconPath: string;
  if (isDev) {
    iconPath = path.join(__dirname, '../../public/icon.ico');
  } else {
    // Production'da resources klasöründen veya build klasöründen al
    iconPath = path.join(process.resourcesPath, 'icon.ico');
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(__dirname, '../build/icon.ico');
    }
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(__dirname, '../../build/icon.ico');
    }
  }
  mainLogger.debug(`Icon path: ${iconPath}, Exists: ${fs.existsSync(iconPath)}`, 'Window');

  // Ekran boyutlarını al
  const { screen } = require('electron');
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

  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();

    if (!isDev) {
      initAutoUpdater(mainWindow!, saveBeforeQuit);
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

  // Always intercept close: ask the renderer to show its in-app confirm modal,
  // then on confirm do a local backup + cloud upload before actually quitting.
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
  // Initialize logger
  mainLogger.init();
  mainLogger.info('Application starting...', 'Main');

  // Set Content Security Policy
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
      }
      return { action: 'deny' };
    });
  });

  dbService = new DatabaseService();
  await dbService.init(app.getPath('userData'));
  googleDriveService.init(app.getPath('userData'));

  // Register all IPC handlers
  registerAllHandlers(
    () => dbService,
    () => mainWindow
  );

  ipcMain.handle('app:close-confirmed', async () => {
    await saveBeforeQuit();
    mainWindow?.close();
    return { success: true };
  });

  // Renderer says "user cancelled close" — nothing to do, the close was
  // already preventDefault()'d.
  ipcMain.handle('app:close-cancelled', () => {
    return { success: true };
  });

  createWindow();

  mainLogger.info('Application initialized', 'Main');

  // Initialize sync service after window created. Handles 5-min interval,
  // ping check, dirty detection, upload/download/conflict, weekly snapshot,
  // and beforeQuit — replaces the old autoBackupAndSync + startupSync logic.
  if (mainWindow && dbService) {
    syncService.init(dbService, mainWindow, app.getPath('userData'));
    syncService.start();
  }
}

// Only one instance may run. Each instance keeps the whole database in memory
// and rewrites the file on every save, so a second instance would silently
// overwrite the first one's changes (and vice versa).
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
      const message = error instanceof Error ? error.message : String(error);
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
