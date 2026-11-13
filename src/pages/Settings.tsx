import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FiShield } from 'react-icons/fi';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/shared/PageHeader';
import { useTheme } from '../contexts/ThemeContext';
import { useAppVersion } from '../hooks/useAppVersion';
import { applyLanguage } from '../utils/language';
import { formatDateTime } from '../utils/formatters';
import { useLocalBackup } from './settings-components/useLocalBackup';
import { useDriveSettings } from './settings-components/useDriveSettings';
import { useCategorySettings } from './settings-components/useCategorySettings';
import { LocalBackupCard } from './settings-components/LocalBackupCard';
import { DriveBackupCard } from './settings-components/DriveBackupCard';
import { ChoiceCard } from './settings-components/ChoiceCard';
import { NewCategoryCard } from './settings-components/NewCategoryCard';
import { CategoryListCard } from './settings-components/CategoryListCard';
import { AppVersionCard } from './settings-components/AppVersionCard';
import { LANGUAGE_OPTIONS, THEME_OPTIONS } from './settings-components/settingsOptions';

function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const backup = useLocalBackup();
  const drive = useDriveSettings(backup.reloadBackupInfo);
  const categories = useCategorySettings();
  const appVersion = useAppVersion();

  return (
    <div className="page-container">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')}>
        <Button variant="secondary" icon={FiShield} onClick={() => navigate('/data-review')}>
          {t('dataReview.title')}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LocalBackupCard
          backupInfo={backup.backupInfo}
          creating={backup.creating}
          onCreate={() => void backup.createBackup()}
          onOpenFolder={backup.openFolder}
          onRestore={() => backup.setRestoreConfirm(true)}
        />
        <DriveBackupCard drive={drive} initialLoading={drive.statusLoading} />
        <ChoiceCard
          title={t('settings.language')}
          description={t('settings.languageDesc')}
          options={LANGUAGE_OPTIONS}
          selected={i18n.language}
          onSelect={applyLanguage}
        />
        <ChoiceCard
          title={t('settings.theme')}
          description={t('settings.themeDesc')}
          options={THEME_OPTIONS}
          selected={theme}
          onSelect={setTheme}
        />
        <NewCategoryCard
          value={categories.newCategory}
          onChange={categories.setNewCategory}
          onSubmit={categories.addCategory}
        />
        <CategoryListCard
          categories={categories.categories}
          onDelete={categories.setDeleteCategoryId}
        />
        <AppVersionCard version={appVersion} />
      </div>

      <ConfirmDialog
        isOpen={backup.restoreConfirm}
        onClose={() => backup.setRestoreConfirm(false)}
        onConfirm={backup.restore}
        title={t('settings.restoreTitle')}
        message={t('settings.restoreMessage', {
          date: backup.backupInfo?.exists ? formatDateTime(backup.backupInfo.date) : '',
        })}
        type="warning"
        confirmText={t('common.restore')}
        loading={backup.restoring}
      />

      <ConfirmDialog
        isOpen={drive.disconnectConfirm}
        onClose={() => drive.setDisconnectConfirm(false)}
        onConfirm={drive.confirmDisconnect}
        title={t('settings.driveDisconnectTitle')}
        message={t('settings.driveDisconnectMessage')}
        type="warning"
        confirmText={t('settings.disconnect')}
      />

      <ConfirmDialog
        isOpen={categories.deleteCategoryId !== null}
        onClose={() => categories.setDeleteCategoryId(null)}
        onConfirm={categories.confirmDelete}
        title={t('settings.deleteCategoryTitle')}
        message={t('settings.deleteCategoryMessage')}
        type="danger"
        confirmText={t('common.delete')}
      />
    </div>
  );
}

export default Settings;
