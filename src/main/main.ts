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

const isDev = !app.isPackaged;

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

// İnternet bağlantısı kontrolü
async function checkInternetConnection(): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}

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

    // Initialize auto-updater (only in production)
    if (!isDev) {
      initAutoUpdater(mainWindow!);
      // Check for updates after a short delay
      setTimeout(() => checkForUpdates(), 5000);
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
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

app.whenReady().then(async () => {
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
            : "default-src 'self'; script-src 'self'; connect-src 'self' https://www.googleapis.com https://oauth2.googleapis.com https://api.exchangerate-api.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;",
        ],
      },
    });
  });

  // Disable navigation to external URLs
  app.on('web-contents-created', (_, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      if (parsedUrl.origin !== 'file://' && !navigationUrl.startsWith('http://localhost')) {
        event.preventDefault();
        mainLogger.warn(`Blocked navigation to: ${navigationUrl}`, 'Security');
      }
    });

    // Block new window creation
    contents.setWindowOpenHandler(({ url }) => {
      // Allow opening external links in system browser
      if (url.startsWith('https://') || url.startsWith('http://')) {
        shell.openExternal(url);
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
    (s) => {
      dbService = s;
      syncService.updateDbService(s);
    },
    () => mainWindow,
    checkInternetConnection
  );

  // Renderer says "user chose to actually close" — do the heavy lifting
  // (local backup + cloud upload) here, then quit for real.
  ipcMain.handle('app:close-confirmed', async () => {
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
});

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
