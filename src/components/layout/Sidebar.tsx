import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiHome,
  FiUsers,
  FiFolder,
  FiPackage,
  FiBriefcase,
  FiList,
  FiBarChart2,
  FiSettings,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
} from 'react-icons/fi';
import { SyncStatusIndicator } from '../SyncStatusIndicator';
import { SidebarLink } from '../SidebarLink';
import { cn } from '../../utils/cn';

interface LogoProps {
  className?: string;
}

function Logo({ className }: LogoProps) {
  const { t } = useTranslation();
  return <img src="./logo.svg" alt={t('app.title')} className={cn('w-10 h-10', className)} />;
}

interface MenuItemDef {
  path: string;
  icon: ComponentType<{ size?: number }>;
  labelKey: string;
}

const menuItemDefs: MenuItemDef[] = [
  { path: '/', icon: FiHome, labelKey: 'menu.dashboard' },
  { path: '/companies', icon: FiUsers, labelKey: 'menu.companies' },
  { path: '/projects', icon: FiFolder, labelKey: 'menu.projects' },
  { path: '/stock', icon: FiPackage, labelKey: 'menu.stock' },
  { path: '/company-account', icon: FiBriefcase, labelKey: 'menu.companyAccount' },
  { path: '/transactions', icon: FiList, labelKey: 'menu.transactions' },
  { path: '/analytics', icon: FiBarChart2, labelKey: 'menu.analytics' },
];

const bottomMenuItemDefs: MenuItemDef[] = [
  { path: '/settings', icon: FiSettings, labelKey: 'menu.settings' },
  { path: '/trash', icon: FiTrash2, labelKey: 'menu.trash' },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onOpenSearch: () => void;
  appVersion: string;
  className?: string;
}

export function Sidebar({
  collapsed,
  onCollapsedChange,
  onOpenSearch,
  appVersion,
  className,
}: SidebarProps) {
  const { t } = useTranslation();

  const renderLinks = (items: MenuItemDef[]) =>
    items.map((item) => (
      <SidebarLink
        key={item.path}
        to={item.path}
        icon={item.icon}
        label={t(item.labelKey)}
        collapsed={collapsed}
      />
    ));

  return (
    <aside
      className={cn(
        collapsed ? 'w-20' : 'w-64',
        'bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col transition-all duration-300 ease-in-out relative flex-shrink-0',
        className
      )}
    >
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Logo className="w-10 h-10 text-blue-500" />
          {!collapsed && (
            <div className="fade-in">
              <h1 className="font-bold text-lg">{t('app.title')}</h1>
              <p className="text-xs text-gray-400">v{appVersion || '...'}</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => onCollapsedChange(!collapsed)}
        aria-label={collapsed ? t('app.expandSidebar') : t('app.collapseSidebar')}
        aria-expanded={!collapsed}
        className="absolute -right-3 top-20 bg-slate-800 text-white p-1.5 rounded-full border border-white/20 hover:bg-slate-700 transition-colors z-10"
      >
        {collapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
      </button>

      <div className="px-3 pt-4">
        <button
          onClick={onOpenSearch}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? t('app.searchShortcut') : ''}
        >
          <FiSearch size={20} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sm">{t('app.search')}</span>
              <kbd className="text-xs px-1.5 py-0.5 bg-white/10 rounded">Ctrl+K</kbd>
            </>
          )}
        </button>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">{renderLinks(menuItemDefs)}</nav>

      <div className="border-t border-white/10 py-4 px-3 space-y-1">
        {renderLinks(bottomMenuItemDefs)}
        <SyncStatusIndicator collapsed={collapsed} />
      </div>
    </aside>
  );
}
