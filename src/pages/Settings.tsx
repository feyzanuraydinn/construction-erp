import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiDatabase,
  FiPlus,
  FiX,
  FiFolder,
  FiRefreshCw,
  FiDownload,
  FiCloud,
  FiCloudOff,
  FiUploadCloud,
  FiCheck,
  FiLink,
  FiSettings,
  FiSun,
  FiMoon,
  FiMonitor,
} from 'react-icons/fi';
import { Card, CardHeader, CardBody, Button, Input, Select, ConfirmDialog, LoadingSpinner } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import i18n from '../i18n';
import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../contexts/ThemeContext';
import type { Category, DriveBackupFile } from '../types';

interface BackupInfo {
  exists: boolean;
  path?: string;
  size?: number;
  date?: string;
}

type CategoryType = 'invoice_out' | 'invoice_in' | 'payment';

interface NewCategory {
  name: string;
  type: CategoryType;
  color: string;
}

const COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#64748b',
  '#71717a',
  '#78716c',
];

function Settings() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState<boolean>(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [newCategory, setNewCategory] = useState<NewCategory>({
    name: '',
    type: '' as CategoryType,
    color: '#ef4444',
  });

  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);
  const [driveDisconnectConfirm, setDriveDisconnectConfirm] = useState(false);

  // Google Drive states
  const [driveHasCredentials, setDriveHasCredentials] = useState<boolean | null>(null);
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);
  const [driveBackups, setDriveBackups] = useState<DriveBackupFile[] | null>(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveBackupsLoading, setDriveBackupsLoading] = useState(false);
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [credentials, setCredentials] = useState({ clientId: '', clientSecret: '' });
  const [initialLoading, setInitialLoading] = useState(true);

  const CATEGORY_TYPES = [
    { value: 'invoice_out', label: t('settings.categoryTypes.invoice_out') },
    { value: 'invoice_in', label: t('settings.categoryTypes.invoice_in') },
    { value: 'payment', label: t('settings.categoryTypes.payment') },
  ];

  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([
        loadCategories(),
        loadBackupInfo(),
        checkDriveStatus(),
        loadAppVersion(),
      ]);
      setInitialLoading(false);
    };
    loadAll();
  }, []);

  const loadAppVersion = async () => {
    try {
      const version = await window.electronAPI.app.getVersion();
      setAppVersion(version);
    } catch (error) {
      console.error('Failed to get app version:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await window.electronAPI.category.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Categories load error:', error);
      toast.error(t('common.loadError'));
    }
  };

  const loadBackupInfo = async () => {
    try {
      const backups = await window.electronAPI.backup.list();
      if (backups.length > 0) {
        const latest = backups[0]; // En son yedek
        setBackupInfo({
          exists: true,
          path: latest.path,
          size: latest.size,
          date: latest.date,
        });
      } else {
        setBackupInfo({ exists: false });
      }
    } catch (error) {
      console.error('Backup info load error:', error);
      toast.error(t('common.loadError'));
    }
  };

  const checkDriveStatus = async () => {
    try {
      const hasCredentials = await window.electronAPI.gdrive.hasCredentials();
      setDriveHasCredentials(hasCredentials);
      if (hasCredentials) {
        const isConnected = await window.electronAPI.gdrive.isConnected();
        setDriveConnected(isConnected);
        if (isConnected) {
          loadDriveBackups();
        }
      }
    } catch (error) {
      console.error('Drive status check error:', error);
      toast.error(t('common.loadError'));
    }
  };

  const handleSaveCredentials = async () => {
    if (!credentials.clientId.trim() || !credentials.clientSecret.trim()) {
      toast.error(t('settings.credentialsRequired'));
      return;
    }
    setDriveLoading(true);
    try {
      await window.electronAPI.gdrive.saveCredentials(
        credentials.clientId,
        credentials.clientSecret
      );
      setDriveHasCredentials(true);
      setShowCredentialsForm(false);
      toast.success(t('settings.credentialsSaved'));
    } catch (error) {
      toast.error(t('settings.credentialsSaveError'));
    } finally {
      setDriveLoading(false);
    }
  };

  const loadDriveBackups = async () => {
    setDriveBackupsLoading(true);
    try {
      const data = await window.electronAPI.gdrive.listBackups();
      setDriveBackups(data);
    } catch (error) {
      console.error('Drive backups load error:', error);
      toast.error(t('common.loadError'));
      setDriveBackups([]);
    } finally {
      setDriveBackupsLoading(false);
    }
  };

  const handleDriveConnect = async () => {
    setDriveLoading(true);
    try {
      const result = await window.electronAPI.gdrive.connect();
      if (result.success) {
        setDriveConnected(true);
        toast.success(t('settings.driveConnectSuccess'));
        loadDriveBackups();
      } else {
        toast.error(result.error || t('settings.connectionError'));
      }
    } catch (error) {
      toast.error(t('settings.driveConnectError'));
    } finally {
      setDriveLoading(false);
    }
  };

  const handleDriveDisconnect = async () => {
    setDriveLoading(true);
    try {
      await window.electronAPI.gdrive.disconnect();
      setDriveConnected(false);
      setDriveBackups([]);
      toast.success(t('settings.driveDisconnectSuccess'));
    } catch (error) {
      toast.error(t('settings.driveDisconnectError'));
    } finally {
      setDriveLoading(false);
    }
  };

  const handleDriveUpload = async () => {
    setDriveLoading(true);
    try {
      const result = await window.electronAPI.gdrive.uploadBackup();
      if (result.success) {
        toast.success(t('settings.driveUploadSuccess'));
        loadDriveBackups();
        loadBackupInfo();
      } else {
        toast.error(result.error || t('settings.uploadError'));
      }
    } catch (error) {
      toast.error(t('settings.driveUploadError'));
    } finally {
      setDriveLoading(false);
    }
  };

  const handleDriveDownload = async (file: DriveBackupFile) => {
    setDriveLoading(true);
    try {
      const result = await window.electronAPI.gdrive.downloadBackup(file.id, file.name);
      if (result.success) {
        toast.success(t('settings.driveDownloadSuccess'));
        loadBackupInfo();
      } else {
        toast.error(result.error || t('settings.downloadError'));
      }
    } catch (error) {
      toast.error(t('settings.driveDownloadError'));
    } finally {
      setDriveLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      await window.electronAPI.backup.create();
      toast.success(t('settings.backupSuccess'));
      loadBackupInfo();
    } catch (error) {
      toast.error(t('settings.backupError'));
      console.error('Backup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!backupInfo?.path) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.backup.restore(backupInfo.path);
      if (result.success) {
        toast.success(t('settings.restoreSuccess'));
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(t('settings.restoreError', { error: result.error }));
      }
    } catch (error) {
      toast.error(t('settings.restoreGeneralError'));
      console.error('Restore error:', error);
    } finally {
      setLoading(false);
      setRestoreConfirm(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await window.electronAPI.backup.openFolder();
    } catch (error) {
      console.error('Open folder error:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatBackupDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;

    try {
      await window.electronAPI.category.create(newCategory);
      setNewCategory({ name: '', type: '' as CategoryType, color: '#ef4444' });
      loadCategories();
    } catch (error) {
      console.error('Category create error:', error);
      toast.error(t('common.categoryCreateError'));
    }
  };

  const handleDeleteCategoryConfirm = async () => {
    if (deleteCategoryId === null) return;
    try {
      await window.electronAPI.category.delete(deleteCategoryId);
      loadCategories();
    } catch (error) {
      console.error('Category delete error:', error);
      toast.error(t('common.categoryDeleteError'));
    } finally {
      setDeleteCategoryId(null);
    }
  };

  const groupedCategories = CATEGORY_TYPES.reduce((acc: Record<string, Category[]>, type) => {
    acc[type.value] = categories
      .filter((c) => c.type === type.value)
      .sort((a, b) => {
        if (a.is_default === 1 && b.is_default !== 1) return -1;
        if (a.is_default !== 1 && b.is_default === 1) return 1;
        return a.name.localeCompare(b.name, 'tr');
      });
    return acc;
  }, {});

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('settings.title')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Backup Section */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-semibold">{t('settings.localBackup')}</h3>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={FiFolder} onClick={handleOpenFolder}>
                {t('settings.openFolder')}
              </Button>
              <Button size="sm" icon={FiDatabase} onClick={handleBackup} loading={loading}>
                {t('settings.createBackup')}
              </Button>
            </div>
          </CardHeader>
          <CardBody className="h-[160px]">
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {t('settings.backupDescription')}
            </p>
            {backupInfo === null ? (
              <LoadingSpinner className="py-6" />
            ) : !backupInfo.exists ? (
              <div className="py-6 text-center text-gray-500 dark:text-gray-400 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <FiDatabase size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('settings.noBackup')}</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t('settings.createFirstBackup')}</p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <FiCheck size={20} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.lastBackup')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatBackupDate(backupInfo.date!)} • {formatFileSize(backupInfo.size!)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={FiRefreshCw}
                    onClick={() => setRestoreConfirm(true)}
                  >
                    {t('common.restore')}
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Google Drive Cloud Backup */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiCloud className={driveConnected ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'} />
              <h3 className="font-semibold">{t('settings.googleDrive')}</h3>
              {driveConnected && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <FiCheck size={12} />
                  {t('settings.connected')}
                </span>
              )}
            </div>
            {!initialLoading && (
              <div className="flex gap-2">
                {driveHasCredentials === false && (
                  <Button
                    size="sm"
                    icon={FiSettings}
                    onClick={() => setShowCredentialsForm(!showCredentialsForm)}
                  >
                    {t('settings.configure')}
                  </Button>
                )}
                {driveHasCredentials && !driveConnected && (
                  <Button size="sm" icon={FiLink} onClick={handleDriveConnect} loading={driveLoading}>
                    {t('settings.connectGoogle')}
                  </Button>
                )}
                {driveConnected && (
                  <>
                    <Button
                      size="sm"
                      icon={FiUploadCloud}
                      onClick={handleDriveUpload}
                      loading={driveLoading}
                    >
                      {t('settings.cloudBackup')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={FiCloudOff}
                      onClick={() => setDriveDisconnectConfirm(true)}
                    >
                      {t('settings.disconnect')}
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardHeader>
          <CardBody className={`p-0 ${showCredentialsForm ? 'h-auto' : 'h-[160px]'}`}>
            {/* Loading State */}
            {initialLoading && (
              <LoadingSpinner className="h-full" />
            )}

            {/* Credentials Form */}
            {!initialLoading && showCredentialsForm && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  {t('settings.credentialsDesc')}
                </p>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  Redirect URI:{' '}
                  <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] break-all">
                    http://localhost:8089/oauth2callback
                  </code>
                </p>
                <div className="space-y-3">
                  <Input
                    label="Client ID"
                    value={credentials.clientId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCredentials({ ...credentials, clientId: e.target.value })
                    }
                    placeholder="xxxx.apps.googleusercontent.com"
                  />
                  <Input
                    label="Client Secret"
                    type="password"
                    value={credentials.clientSecret}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCredentials({ ...credentials, clientSecret: e.target.value })
                    }
                    placeholder="GOCSPX-..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveCredentials} loading={driveLoading}>
                      {t('common.save')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowCredentialsForm(false)}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Not Configured */}
            {!initialLoading && driveHasCredentials === false && !showCredentialsForm && (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                <FiCloud size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('settings.driveNotConfigured')}</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {t('settings.driveNotConfiguredDesc')}
                </p>
              </div>
            )}

            {/* Not Connected */}
            {!initialLoading && driveHasCredentials && !driveConnected && !showCredentialsForm && (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                <FiCloud size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('settings.driveNotConnected')}</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {t('settings.driveNotConnectedDesc')}
                </p>
              </div>
            )}

            {/* Drive Backup Info */}
            {!initialLoading && driveConnected && (
              <div className="p-3">
                {driveBackupsLoading || driveBackups === null ? (
                  <LoadingSpinner className="py-4" />
                ) : driveBackups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-500 dark:text-gray-400">
                    <FiCloud size={24} className="mb-1 opacity-50" />
                    <p className="text-sm">{t('settings.noCloudBackup')}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <FiCloud size={18} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.cloudBackup')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(parseInt(driveBackups[0].size))} •{' '}
                          {formatBackupDate(driveBackups[0].modifiedTime)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={FiDownload}
                      onClick={() => handleDriveDownload(driveBackups[0])}
                      loading={driveLoading}
                    >
                      {t('common.restore')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Language Section */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.language')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('settings.languageDesc')}</p>
          </CardHeader>
          <CardBody>
            <div className="flex gap-3">
              {[
                { value: 'tr', label: t('settings.turkish') },
                { value: 'en', label: t('settings.english') },
              ].map((lang) => (
                <Button
                  key={lang.value}
                  variant="outline"
                  onClick={() => { i18n.changeLanguage(lang.value); localStorage.setItem('language', lang.value); window.electronAPI?.app.setLanguage(lang.value); }}
                  className={i18n.language === lang.value ? '!bg-blue-50 dark:!bg-blue-900/20 !border-blue-500 !text-blue-700 dark:!text-blue-400' : ''}
                >
                  {lang.label}
                </Button>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Theme Section */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.theme')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('settings.themeDesc')}</p>
          </CardHeader>
          <CardBody>
            <div className="flex gap-3">
              {([
                { value: 'light' as Theme, icon: FiSun, labelKey: 'settings.themeLight' },
                { value: 'dark' as Theme, icon: FiMoon, labelKey: 'settings.themeDark' },
                { value: 'system' as Theme, icon: FiMonitor, labelKey: 'settings.themeSystem' },
              ]).map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  icon={opt.icon}
                  onClick={() => setTheme(opt.value)}
                  className={theme === opt.value ? '!bg-blue-50 dark:!bg-blue-900/20 !border-blue-500 !text-blue-700 dark:!text-blue-400' : ''}
                >
                  {t(opt.labelKey)}
                </Button>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Add Category */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">{t('settings.newCategory')}</h3>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <Input
                label={t('settings.categoryName')}
                value={newCategory.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewCategory({ ...newCategory, name: e.target.value })
                }
                placeholder={t('settings.categoryNamePlaceholder')}
                required
              />
              <Select
                label={t('settings.categoryType')}
                options={CATEGORY_TYPES}
                value={newCategory.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setNewCategory({ ...newCategory, type: e.target.value as CategoryType })
                }
                required
              />
              <div>
                <label className="label">{t('settings.categoryColor')}</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategory({ ...newCategory, color })}
                      className={`w-8 h-8 rounded-lg transition-transform ${
                        newCategory.color === color
                          ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 dark:ring-offset-gray-800 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <Button type="submit" icon={FiPlus}>
                {t('common.save')}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Categories List */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">{t('settings.existingCategories')}</h3>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              {CATEGORY_TYPES.map((type) => (
                <div key={type.value}>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                    {type.label}
                  </div>
                  {groupedCategories[type.value]?.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-400 dark:text-gray-500">{t('settings.noCategories')}</div>
                  ) : (
                    groupedCategories[type.value]?.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm">{t(`categories.${category.name}`, category.name)}</span>
                          {category.is_default === 1 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">({t('settings.defaultLabel')})</span>
                          )}
                        </div>
                        {category.is_default !== 1 && (
                          <Button
                            variant="ghost-danger"
                            size="icon"
                            icon={FiX}
                            onClick={() => setDeleteCategoryId(category.id)}
                            className="!p-1"
                            aria-label={t('common.delete')}
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* App Info - Full width at bottom */}
        <div className="lg:col-span-2">
          <Card>
            <CardBody className="py-3">
              <div className="flex flex-wrap items-center justify-center text-sm text-gray-500 dark:text-gray-400 gap-x-8 gap-y-2">
                <span>
                  <strong className="text-gray-700 dark:text-gray-300">{t('app.title')}</strong> v{appVersion || '...'}
                </span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Restore Confirmation */}
      <ConfirmDialog
        isOpen={restoreConfirm}
        onClose={() => setRestoreConfirm(false)}
        onConfirm={handleRestore}
        title={t('settings.restoreTitle')}
        message={t('settings.restoreMessage', { date: backupInfo?.date ? formatBackupDate(backupInfo.date) : '' })}
        type="warning"
        confirmText={t('common.restore')}
      />

      {/* Google Drive Disconnect Confirmation */}
      <ConfirmDialog
        isOpen={driveDisconnectConfirm}
        onClose={() => setDriveDisconnectConfirm(false)}
        onConfirm={async () => {
          setDriveDisconnectConfirm(false);
          await handleDriveDisconnect();
        }}
        title={t('settings.driveDisconnectTitle')}
        message={t('settings.driveDisconnectMessage')}
        type="warning"
        confirmText={t('settings.disconnect')}
      />

      {/* Category Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteCategoryId !== null}
        onClose={() => setDeleteCategoryId(null)}
        onConfirm={handleDeleteCategoryConfirm}
        title={t('settings.deleteCategoryTitle')}
        message={t('settings.deleteCategoryMessage')}
        type="danger"
        confirmText={t('common.delete')}
      />
    </div>
  );
}

export default Settings;
