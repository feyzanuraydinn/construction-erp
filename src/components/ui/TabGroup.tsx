import React, { memo, ReactNode, useRef } from 'react';

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
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = tabs.findIndex((tab) => tab.key === activeTab);
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = (current + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        next = (current - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange(tabs[next].key);
    buttonRefs.current[next]?.focus();
  };

  return (
    <div role="tablist" className={`flex gap-2 ${className}`} onKeyDown={handleKeyDown}>
      {tabs.map((tab, index) => (
        <button
          key={tab.key}
          ref={(el) => {
            buttonRefs.current[index] = el;
          }}
          role="tab"
          aria-selected={activeTab === tab.key}
          tabIndex={activeTab === tab.key ? 0 : -1}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
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
