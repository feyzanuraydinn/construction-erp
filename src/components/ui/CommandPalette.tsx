import React, { useState, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiUsers, FiFolder, FiPackage, FiX } from 'react-icons/fi';
import type { Company, Project, Material } from '../../types';
import { matchesSearchText } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import { useLoadedData } from '../../hooks/useLoadedData';
import { LoadingSpinner } from './LoadingSpinner';
import { cn } from '../../utils/cn';

interface SearchResult {
  id: number;
  type: 'company' | 'project' | 'material';
  name: string;
  subtitle?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const typeIcons = {
  company: FiUsers,
  project: FiFolder,
  material: FiPackage,
};

const typeColors = {
  company: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30',
  project: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30',
  material: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30',
};

const MAX_RESULTS_PER_TYPE = 5;
const SEARCH_DEBOUNCE_MS = 200;

interface SearchSource {
  companies: Company[];
  projects: Project[];
  materials: Material[];
}

const loadSearchSource = (): Promise<SearchSource> =>
  Promise.all([
    window.electronAPI.company.getAll(),
    window.electronAPI.project.getAll(),
    window.electronAPI.material.getAll(),
  ]).then(([companies, projects, materials]) => ({ companies, projects, materials }));

function findMatches(source: SearchSource | null, query: string): SearchResult[] {
  if (!source || !query.trim()) return [];
  const companies = source.companies
    .filter((c) => matchesSearchText(query, c.name))
    .slice(0, MAX_RESULTS_PER_TYPE)
    .map(
      (c): SearchResult => ({
        id: c.id,
        type: 'company',
        name: c.name,
        subtitle: c.phone || c.email || undefined,
      })
    );
  const projects = source.projects
    .filter((p) => matchesSearchText(query, p.name, p.code))
    .slice(0, MAX_RESULTS_PER_TYPE)
    .map((p): SearchResult => ({ id: p.id, type: 'project', name: p.name, subtitle: p.code }));
  const materials = source.materials
    .filter((m) => matchesSearchText(query, m.name, m.code))
    .slice(0, MAX_RESULTS_PER_TYPE)
    .map((m): SearchResult => ({ id: m.id, type: 'material', name: m.name, subtitle: m.code }));
  return [...companies, ...projects, ...materials];
}

function Shortcut({
  keys,
  label,
  className,
}: {
  keys: string;
  label: ReactNode;
  className?: string;
}) {
  return (
    <span className={className}>
      <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
        {keys}
      </kbd>{' '}
      {label}
    </span>
  );
}

export function CommandPalette({ isOpen, onClose, className }: CommandPaletteProps) {
  return isOpen ? <PaletteDialog onClose={onClose} className={className} /> : null;
}

function PaletteDialog({ onClose, className }: Omit<CommandPaletteProps, 'isOpen'>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);
  const { data: source, loading } = useLoadedData(
    loadSearchSource,
    'Command palette data load error:'
  );
  const results = useMemo(() => findMatches(source, debouncedQuery), [source, debouncedQuery]);
  const [selection, setSelection] = useState<{ results: SearchResult[]; index: number } | null>(
    null
  );
  const selectedIndex = selection?.results === results ? selection.index : 0;
  const select = (index: number) => setSelection({ results, index });

  const handleSelect = (result: SearchResult) => {
    onClose();
    switch (result.type) {
      case 'company':
        navigate(`/companies/${result.id}`);
        break;
      case 'project':
        navigate(`/projects/${result.id}`);
        break;
      case 'material':
        navigate('/stock');
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      select(Math.min(selectedIndex + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      select(Math.max(selectedIndex - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      <div className="flex items-start justify-center min-h-screen pt-24 px-4">
        <div
          className={cn(
            'relative w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl transform transition-all',
            className
          )}
        >
          <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
            <FiSearch className="text-gray-400 dark:text-gray-500" size={20} />
            <input
              autoFocus
              type="text"
              placeholder={t('commandPalette.placeholder')}
              className="flex-1 px-3 py-4 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent border-0 focus:outline-none focus:ring-0"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={onClose}
              aria-label={t('commandPalette.close')}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto" aria-live="polite">
            {loading ? (
              <LoadingSpinner size="sm" className="px-4 py-8" />
            ) : results.length > 0 ? (
              <ul className="py-2">
                {results.map((result, index) => {
                  const Icon = typeIcons[result.type];
                  return (
                    <li key={`${result.type}-${result.id}`}>
                      <button
                        className={cn(
                          'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                          index === selectedIndex
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        )}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => select(index)}
                      >
                        <div className={cn('p-2 rounded-lg', typeColors[result.type])}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {result.name}
                          </p>
                          {result.subtitle && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                          {t(`commandPalette.${result.type}`)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : query ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                {t('commandPalette.noResults')}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-gray-400 dark:text-gray-500 text-sm">
                {t('commandPalette.startTyping')}
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
              <div className="flex items-center gap-4">
                <Shortcut keys="↑↓" label={t('commandPalette.navigate')} />
                <Shortcut keys="Enter" label={t('commandPalette.select')} />
                <Shortcut keys="Esc" label={t('commandPalette.close')} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
