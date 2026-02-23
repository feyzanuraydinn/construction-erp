/**
 * Generic CRUD Page Hook
 *
 * Consolidates the repeated state management, data loading, filtering,
 * pagination, and handler patterns found across listing pages
 * (Companies, Projects, Stock, etc.).
 *
 * @module useCRUDPage
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { useDebounce } from './useDebounce';
import { usePagination, paginateArray } from './usePagination';
import { useSelection } from './useSelection';
import { useBulkDelete } from './useBulkDelete';
import { useExport } from './useExport';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import type { ExportColumn } from '../utils/exportUtils';

// ==================== TYPES ====================

export interface UseCRUDPageOptions<T, F extends Record<string, string>> {
  /** Fetch data — return all data sets as an object */
  loadFn: () => Promise<Record<string, unknown>>;
  /** Main data key returned by loadFn (e.g., 'companies') */
  dataKey: string;
  /** Apply to set loaded data into state */
  onDataLoaded: (data: Record<string, unknown>) => void;
  /** Delete function for a single item */
  deleteFn: (id: number) => Promise<unknown>;
  /** i18n entity key for toasts (e.g., 'companies', 'projects', 'stock') */
  entityKey: string;
  /** Success message keys: { create, update, delete } */
  toastKeys: {
    create: string;
    update: string;
    delete: string;
  };
  /** Initial filter values (e.g., { type: '', accountType: '' }) */
  initialFilters: F;
  /** Filter function applied to the main data set */
  filterFn: (items: T[], search: string, filters: F) => T[];
  /** Initial page size (default: 25) */
  pageSize?: number;
  /** Export config (if the page supports CSV export) */
  exportConfig?: {
    filename: string;
    columns: ExportColumn[];
  };
}

export interface UseCRUDPageReturn<T, F extends Record<string, string>> {
  // Data & loading
  loading: boolean;
  loadData: () => void;

  // Search
  search: string;
  setSearch: (value: string) => void;
  debouncedSearch: string;

  // Filters
  filters: F;
  setFilter: <K extends keyof F>(key: K, value: F[K]) => void;
  setFilters: React.Dispatch<React.SetStateAction<F>>;

  // Filtered & paginated data
  filteredData: T[];
  paginatedData: T[];
  pagination: ReturnType<typeof usePagination>;

  // Modal state
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  editingItem: T | null;
  setEditingItem: (item: T | null) => void;

  // Delete confirmation
  deleteConfirm: T | null;
  setDeleteConfirm: (item: T | null) => void;
  handleDelete: () => Promise<void>;

  // Save handler
  handleSave: (isNew: boolean) => void;

  // Bulk selection & delete
  selectedIds: Set<number>;
  handleSelectAll: (ids: number[], checked: boolean) => void;
  handleSelectOne: (id: number, checked: boolean) => void;
  bulkDeleteConfirm: boolean;
  setBulkDeleteConfirm: (open: boolean) => void;
  handleBulkDelete: () => Promise<void>;

  // Export
  handleExport: () => void;
}

// ==================== HOOK ====================

export function useCRUDPage<T extends { id: number }, F extends Record<string, string>>({
  loadFn,
  dataKey,
  onDataLoaded,
  deleteFn,
  entityKey,
  toastKeys,
  initialFilters,
  filterFn,
  pageSize = 25,
  exportConfig,
}: UseCRUDPageOptions<T, F>): UseCRUDPageReturn<T, F> {
  const { t } = useTranslation();
  const toast = useToast();

  // ---- Core state ----
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<F>(initialFilters);
  const debouncedSearch = useDebounce(search, 300);

  // ---- Modal state ----
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<T | null>(null);

  // ---- Refs for stable loadData ----
  const loadFnRef = useRef(loadFn);
  const dataKeyRef = useRef(dataKey);
  const onDataLoadedRef = useRef(onDataLoaded);
  const entityKeyRef = useRef(entityKey);

  useEffect(() => {
    loadFnRef.current = loadFn;
    dataKeyRef.current = dataKey;
    onDataLoadedRef.current = onDataLoaded;
    entityKeyRef.current = entityKey;
  });

  // ---- Data loading ----
  const loadData = useCallback(() => {
    setLoading(true);
    loadFnRef.current()
      .then((result) => {
        const mainData = result[dataKeyRef.current] as T[];
        setData(mainData || []);
        onDataLoadedRef.current(result);
      })
      .catch((error) => {
        console.error(`${entityKeyRef.current} loading error:`, error);
        toast.error(t('common.loadError'));
      })
      .finally(() => setLoading(false));
  }, [toast, t]);

  // ---- Hooks ----
  const { selectedIds, handleSelectAll, handleSelectOne, clearSelection } = useSelection();
  const { bulkDeleteConfirm, setBulkDeleteConfirm, handleBulkDelete: bulkDeleteAction } = useBulkDelete({
    deleteFn,
    entityKey,
    onSuccess: () => { clearSelection(); loadData(); },
  });
  const { handleExport: exportAction } = useExport();

  // ---- Keyboard shortcuts ----
  useKeyboardShortcuts({
    onNew: () => setModalOpen(true),
    onEscape: () => {
      if (modalOpen) {
        setModalOpen(false);
        setEditingItem(null);
      }
    },
  });

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stable refs for callback dependencies
  const filterFnRef = useRef(filterFn);
  useEffect(() => { filterFnRef.current = filterFn; }, [filterFn]);

  // Stable serialized filter key for dependency tracking
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  // ---- Filtering ----
  const filteredData = useMemo(
    () => filterFnRef.current(data, debouncedSearch, filters),
    [data, debouncedSearch, filtersKey]
  );

  // ---- Pagination ----
  const pagination = usePagination({
    totalItems: filteredData.length,
    initialPageSize: pageSize,
  });

  // Stable ref for goToPage
  const goToPageRef = useRef(pagination.goToPage);
  useEffect(() => { goToPageRef.current = pagination.goToPage; }, [pagination.goToPage]);

  // Reset to first page when filters change
  useEffect(() => {
    goToPageRef.current(1);
  }, [debouncedSearch, filtersKey]);

  const paginatedData = useMemo(
    () => paginateArray(filteredData, pagination.currentPage, pagination.pageSize),
    [filteredData, pagination.currentPage, pagination.pageSize]
  );

  // ---- Handlers ----
  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      await deleteFn(deleteConfirm.id);
      setDeleteConfirm(null);
      toast.success(t(toastKeys.delete));
      loadData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t('common.deleteError'));
    }
  }, [deleteConfirm, deleteFn, toastKeys.delete, t, toast, loadData]);

  const handleSave = useCallback((isNew: boolean) => {
    setModalOpen(false);
    setEditingItem(null);
    toast.success(t(isNew ? toastKeys.create : toastKeys.update));
    loadData();
  }, [toastKeys, t, toast, loadData]);

  const handleBulkDelete = useCallback(async () => {
    await bulkDeleteAction(selectedIds);
  }, [bulkDeleteAction, selectedIds]);

  const handleExport = useCallback(() => {
    if (!exportConfig) return;
    exportAction(exportConfig.filename, filteredData, exportConfig.columns);
  }, [exportConfig, exportAction, filteredData]);

  // ---- Filter helper ----
  const setFilter = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  return {
    loading,
    loadData,
    search,
    setSearch,
    debouncedSearch,
    filters,
    setFilter,
    setFilters,
    filteredData,
    paginatedData,
    pagination,
    modalOpen,
    setModalOpen,
    editingItem,
    setEditingItem,
    deleteConfirm,
    setDeleteConfirm,
    handleDelete,
    handleSave,
    selectedIds,
    handleSelectAll,
    handleSelectOne,
    bulkDeleteConfirm,
    setBulkDeleteConfirm,
    handleBulkDelete,
    handleExport,
  };
}
