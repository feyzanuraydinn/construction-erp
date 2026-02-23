import React, { memo, ReactNode } from 'react';

export interface TabItem {
  key: string;
  label: ReactNode;
  icon?: React.ComponentType<{ size?: number }>;
}

interface TabGroupProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
}

export const TabGroup = memo(function TabGroup({ tabs, activeTab, onChange, className = '' }: TabGroupProps) {
  return (
    <div role="tablist" className={`flex gap-2 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={activeTab === tab.key}
          tabIndex={activeTab === tab.key ? 0 : -1}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === tab.key
              ? 'bg-blue-600 text-white dark:bg-blue-500'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {tab.icon && <tab.icon size={16} />}
          {tab.label}
        </button>
      ))}
    </div>
  );
});
