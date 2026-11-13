import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { useDebounce } from './useDebounce';
import { usePaginatedItems, type UsePaginationReturn } from './usePagination';
import { useBulkSelection } from './useBulkSelection';
import { useExport } from './useExport';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { formatRecordsForExport, type ExportColumn } from '../utils/exportUtils';
import type { ExportMetadata } from '../utils/schemas';
import { useLoadedData } from './useLoadedData';
import { useLatest } from './useLatest';
import { NO_ITEMS } from '../utils/emptyList';
import { toLocalDateString } from '../utils/dates';

export interface UseCRUDPageOptions<T, F extends Record<string, string>, L extends { items: T[] }> {
  loadFn: () => Promise<L>;
  deleteFn: (id: number) => Promise<unknown>;
  entityKey: string;
  toastKeys: {
    create: string;
    update: string;
    delete: string;
  };
  initialFilters: F;
  filterFn: (items: T[], search: string, filters: F) => T[];
  exportConfig?: {
    filename: string;
    columns: ExportColumn[];
    summaryBuilder?: (records: T[]) => { rows: Record<string, string>[]; metadata: ExportMetadata };
  };
}

export interface UseCRUDPageReturn<T, F extends Record<string, string>, L = { items: T[] }> {
  loading: boolean;
  loaded: L | null;

  search: string;
  setSearch: (value: string) => void;

  filters: F;
  setFilter: <K extends keyof F>(key: K, value: F[K]) => void;

  filteredData: T[];
  paginatedData: T[];
  pagination: UsePaginationReturn;

  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  editingItem: T | null;
  setEditingItem: (item: T | null) => void;

  deleteConfirm: T | null;
  setDeleteConfirm: (item: T | null) => void;
  handleDelete: () => Promise<void>;

  handleSave: (isNew: boolean) => void;

  selectedIds: Set<number>;
  handleSelectAll: (ids: number[], checked: boolean) => void;
  handleSelectOne: (id: number, checked: boolean) => void;
  bulkDeleteConfirm: boolean;
  setBulkDeleteConfirm: (open: boolean) => void;
  handleBulkDelete: () => Promise<void>;

  handleExport: (selectedIndices?: number[]) => void;
  handleShare: () => void;
  exportPreviewOpen: boolean;
  setExportPreviewOpen: (open: boolean) => void;
  exportPreviewData: Record<string, string>[];
  prepareExportPreview: () => void;
}

export function useCRUDPage<
  T extends { id: number },
  F extends Record<string, string>,
  L extends { items: T[] } = { items: T[] },
>({
  loadFn,
  deleteFn,
  entityKey,
  toastKeys,
  initialFilters,
  filterFn,
  exportConfig,
}: UseCRUDPageOptions<T, F, L>): UseCRUDPageReturn<T, F, L> {
  const { t } = useTranslation();
  const toast = useToast();
  const loadFnRef = useLatest(loadFn);
  const load = useCallback(() => loadFnRef.current(), [loadFnRef]);
  const {
    data: loaded,
    loading,
    reload: loadData,
  } = useLoadedData(load, `${entityKey} loading error:`);
  const data: T[] = loaded?.items ?? NO_ITEMS;
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<F>(initialFilters);
  const debouncedSearch = useDebounce(search);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<T | null>(null);

  const { handleExport: exportAction, handleShare: shareAction } = useExport();
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [exportPreviewData, setExportPreviewData] = useState<Record<string, string>[]>([]);

  useKeyboardShortcuts({
    onNew: () => setModalOpen(true),
  });

  const filteredData = useMemo(
    () => filterFn(data, debouncedSearch, filters),
    [filterFn, data, debouncedSearch, filters]
  );

  const {
    selectedIds,
    handleSelectAll,
    handleSelectOne,
    bulkDeleteConfirm,
    setBulkDeleteConfirm,
    handleBulkDelete,
  } = useBulkSelection({
    visibleItems: filteredData,
    deleteFn,
    entityKey,
    onDeleted: loadData,
  });

  const { pagination, pageItems: paginatedData } = usePaginatedItems(
    filteredData,
    JSON.stringify([debouncedSearch, filters])
  );

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

  const handleSave = useCallback(
    (isNew: boolean) => {
      setModalOpen(false);
      setEditingItem(null);
      toast.success(t(isNew ? toastKeys.create : toastKeys.update));
      loadData();
    },
    [toastKeys, t, toast, loadData]
  );

  const prepareExportPreview = useCallback(() => {
    if (!exportConfig) return;
    const formatted = formatRecordsForExport(filteredData, exportConfig.columns);
    setExportPreviewData(formatted);
    setExportPreviewOpen(true);
  }, [exportConfig, filteredData]);

  const handleExport = useCallback(
    (selectedIndices?: number[]) => {
      if (!exportConfig) return;
      const dataToExport = selectedIndices
        ? selectedIndices.map((i) => filteredData[i]).filter(Boolean)
        : filteredData;
      const summary = exportConfig.summaryBuilder
        ? exportConfig.summaryBuilder(dataToExport)
        : undefined;
      const filename = `${exportConfig.filename}_${toLocalDateString()}`;
      exportAction(filename, dataToExport, exportConfig.columns, summary?.rows, summary?.metadata);
    },
    [exportConfig, exportAction, filteredData]
  );

  const handleShare = useCallback(() => {
    if (!exportConfig) return;
    const summary = exportConfig.summaryBuilder
      ? exportConfig.summaryBuilder(filteredData)
      : undefined;
    const filename = `${exportConfig.filename}_${toLocalDateString()}`;
    shareAction(filename, filteredData, exportConfig.columns, summary?.rows, summary?.metadata);
  }, [exportConfig, shareAction, filteredData]);

  const setFilter = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  return {
    loading,
    loaded,
    search,
    setSearch,
    filters,
    setFilter,
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
    handleShare,
    exportPreviewOpen,
    setExportPreviewOpen,
    exportPreviewData,
    prepareExportPreview,
  };
}
