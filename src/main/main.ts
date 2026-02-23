import {
  app,
  BrowserWindow,
  Menu,
  dialog,
  shell,
  session,
} from 'electron';
import path from 'path';
import fs from 'fs';
import { DatabaseService } from '../database/DatabaseService';
import { googleDriveService } from './googleDrive';
import { initAutoUpdater, checkForUpdates } from './autoUpdater';
import { mainLogger } from './logger';
import { registerAllHandlers } from './ipc';
import { UI, TIMING } from '../utils/constants';
import { t } from './i18n';

let mainWindow: BrowserWindow | null = null;
let dbService: DatabaseService;
let isQuitting = false;
let autoBackupInterval: NodeJS.Timeout | null = null;
let lastBackupTime: Date | null = null;

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

// Otomatik yedekleme ve cloud sync fonksiyonu
async function autoBackupAndSync(): Promise<void> {
  const backupDir = path.join(app.getPath('userData'), 'backups');

  // Local yedek al
  dbService.createBackup(backupDir);
  lastBackupTime = new Date();
  dbService.clearDirty(); // Yedek alındı, dirty flag'i temizle

  // İnternet varsa cloud'a yükle
  if (googleDriveService.hasCredentials() && googleDriveService.isConnected()) {
    const hasInternet = await checkInternetConnection();
    if (hasInternet) {
      try {
        const backupPath = path.join(backupDir, 'latest_backup.db');
        await googleDriveService.uploadBackup(backupPath);
        mainLogger.info('Backup synced to cloud', 'CloudSync');
      } catch (error) {
        mainLogger.error('Cloud sync error', 'CloudSync', error);
      }
    } else {
      mainLogger.info('No internet connection, backup saved locally only', 'CloudSync');
    }
  }
}

// Yedeklenmemiş değişiklik var mı kontrol et
function hasUnbackedChanges(): boolean {
  return dbService.isDirty();
}

// Otomatik yedekleme başlat
function startAutoBackup(): void {
  if (autoBackupInterval) {
    clearInterval(autoBackupInterval);
  }

  autoBackupInterval = setInterval(async () => {
    // Sadece değişiklik varsa yedekle
    if (dbService.isDirty()) {
      mainLogger.info('Auto backup: Changes detected, backing up...', 'AutoBackup');
      await autoBackupAndSync();
    } else {
      mainLogger.debug('Auto backup: No changes, skipping', 'AutoBackup');
    }
  }, TIMING.AUTO_BACKUP_INTERVAL);

  mainLogger.info(`Auto backup started (interval: ${TIMING.AUTO_BACKUP_INTERVAL / 1000}s)`, 'AutoBackup');
}

// Otomatik yedekleme durdur
function stopAutoBackup(): void {
  if (autoBackupInterval) {
    clearInterval(autoBackupInterval);
    autoBackupInterval = null;
    mainLogger.info('Auto backup stopped', 'AutoBackup');
  }
}

// Uygulama başlangıcında sync kontrolü
async function startupSync(): Promise<void> {
  if (!googleDriveService.hasCredentials() || !googleDriveService.isConnected()) {
    return;
  }

  const hasInternet = await checkInternetConnection();
  if (!hasInternet) {
    mainLogger.info('Startup sync: No internet connection', 'CloudSync');
    return;
  }

  const backupDir = path.join(app.getPath('userData'), 'backups');
  const localBackupPath = path.join(backupDir, 'latest_backup.db');

  // Check if local backup exists
  if (!fs.existsSync(localBackupPath)) {
    mainLogger.info('Startup sync: No local backup found', 'CloudSync');
    return;
  }

  try {
    const cloudBackup = await googleDriveService.getLatestBackup();
    const localStats = fs.statSync(localBackupPath);
    const localDate = localStats.mtime;

    if (cloudBackup) {
      const cloudDate = new Date(cloudBackup.modifiedTime);

      // Upload to cloud if local is newer
      if (localDate > cloudDate) {
        mainLogger.info('Startup sync: Local backup is newer, uploading to cloud...', 'CloudSync');
        await googleDriveService.uploadBackup(localBackupPath);
      } else {
        mainLogger.info('Startup sync: Cloud backup is up to date', 'CloudSync');
      }
    } else {
      // No cloud backup exists, upload local
      mainLogger.info('Startup sync: No cloud backup found, uploading...', 'CloudSync');
      await googleDriveService.uploadBackup(localBackupPath);
    }
  } catch (error) {
    mainLogger.error('Startup sync error', 'CloudSync', error);
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

  // Kapatma onayı - sadece yedeklenmemiş değişiklik varsa sor
  mainWindow.on('close', async (e) => {
    if (isQuitting) return;

    // Otomatik yedeklemeyi durdur
    stopAutoBackup();

    // Yedeklenmemiş değişiklik yoksa direkt kapat
    if (!hasUnbackedChanges()) {
      mainLogger.info('Closing: No unbacked changes', 'Main');
      isQuitting = true;
      return;
    }

    e.preventDefault();

    const result = await dialog.showMessageBox(mainWindow!, {
      type: 'question',
      buttons: [
        t('main.closeDialog.backupAndClose'),
        t('main.closeDialog.closeWithout'),
        t('main.closeDialog.cancel'),
      ],
      defaultId: 0,
      cancelId: 2,
      title: t('main.closeDialog.title'),
      message: t('main.closeDialog.message'),
      detail: t('main.closeDialog.detail'),
    });

    if (result.response === 0) {
      // Yedekle ve Kapat
      mainLogger.info('Closing: Backing up before close', 'Main');
      await autoBackupAndSync();
      isQuitting = true;
      mainWindow?.close();
    } else if (result.response === 1) {
      // Yedeklemeden Kapat
      mainLogger.info('Closing: User chose not to backup', 'Main');
      isQuitting = true;
      mainWindow?.close();
    } else {
      // İptal - otomatik yedeklemeyi yeniden başlat
      startAutoBackup();
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
    (s) => { dbService = s; },
    () => mainWindow,
    checkInternetConnection
  );

  createWindow();

  mainLogger.info('Application initialized', 'Main');

  // Otomatik yedeklemeyi başlat (5 dakikada bir)
  startAutoBackup();

  // Arka planda başlangıç sync kontrolü yap
  startupSync().catch((err) => mainLogger.error('Startup sync error:', err));
});

app.on('window-all-closed', () => {
  stopAutoBackup();
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
