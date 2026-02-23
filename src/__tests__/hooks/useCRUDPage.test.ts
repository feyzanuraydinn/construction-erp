import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCRUDPage } from '../../hooks/useCRUDPage';

// Mock react-i18next — t must be a STABLE reference to avoid infinite re-render loops
// (useCRUDPage uses t as a useCallback dependency)
const mockT = (key: string) => key;
const mockI18n = { language: 'tr' };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: mockI18n,
  }),
}));

// Mock toast context
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  addToast: vi.fn(),
  removeToast: vi.fn(),
  toasts: [],
};

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

// Mock export utils
vi.mock('../../utils/exportUtils', () => ({
  formatRecordsForExport: vi.fn().mockReturnValue([]),
  exportToCSV: vi.fn().mockResolvedValue('/path/to/export.csv'),
}));

// Mock useKeyboardShortcuts to prevent event listener issues
vi.mock('../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

// Mock useDebounce to return value immediately
vi.mock('../../hooks/useDebounce', () => ({
  useDebounce: (value: unknown) => value,
}));

// Sample data type
interface TestItem {
  id: number;
  name: string;
  type: string;
}

const sampleItems: TestItem[] = [
  { id: 1, name: 'Alpha', type: 'A' },
  { id: 2, name: 'Beta', type: 'B' },
  { id: 3, name: 'Charlie', type: 'A' },
  { id: 4, name: 'Delta', type: 'B' },
  { id: 5, name: 'Echo', type: 'A' },
];

function createDefaultOptions(overrides: Record<string, unknown> = {}) {
  return {
    loadFn: vi.fn().mockResolvedValue({ items: sampleItems }),
    dataKey: 'items',
    onDataLoaded: vi.fn(),
    deleteFn: vi.fn().mockResolvedValue({ success: true }),
    entityKey: 'test',
    toastKeys: { create: 'test.created', update: 'test.updated', delete: 'test.deleted' },
    initialFilters: { type: '' },
    filterFn: (items: TestItem[], search: string, filters: { type: string }) => {
      let filtered = items;
      if (search) {
        filtered = filtered.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
      }
      if (filters.type) {
        filtered = filtered.filter((i) => i.type === filters.type);
      }
      return filtered;
    },
    pageSize: 2,
    ...overrides,
  };
}

/** Wait for the hook's async loadData to complete */
async function waitForLoadComplete(result: { current: { loading: boolean } }) {
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  }, { timeout: 3000 });
}

describe('useCRUDPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('data loading', () => {
    it('should load data on mount and set loading to false', async () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      await waitForLoadComplete(result);

      expect(options.loadFn).toHaveBeenCalled();
      expect(options.onDataLoaded).toHaveBeenCalledWith({ items: sampleItems });
      expect(result.current.filteredData).toHaveLength(5);
    });

    it('should show error toast when loading fails', async () => {
      const options = createDefaultOptions({
        loadFn: vi.fn().mockRejectedValue(new Error('Load failed')),
      });

      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      await waitForLoadComplete(result);

      expect(mockToast.error).toHaveBeenCalledWith('common.loadError');
    });
  });

  describe('search & filters', () => {
    it('should update search value', async () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      await waitForLoadComplete(result);

      act(() => result.current.setSearch('Alpha'));

      expect(result.current.search).toBe('Alpha');
    });

    it('should set individual filter and update filtered data', async () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      await waitForLoadComplete(result);
      expect(result.current.filteredData).toHaveLength(5);

      act(() => result.current.setFilter('type', 'A'));

      expect(result.current.filters.type).toBe('A');
      expect(result.current.filteredData).toHaveLength(3);
    });
  });

  describe('pagination', () => {
    it('should paginate data with given page size', async () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      await waitForLoadComplete(result);

      expect(result.current.paginatedData).toHaveLength(2);
      expect(result.current.pagination.totalPages).toBe(3);
    });
  });

  describe('modal state', () => {
    it('should manage modal open/close state', () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      expect(result.current.modalOpen).toBe(false);

      act(() => result.current.setModalOpen(true));
      expect(result.current.modalOpen).toBe(true);

      act(() => result.current.setModalOpen(false));
      expect(result.current.modalOpen).toBe(false);
    });

    it('should manage editing item state', () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      expect(result.current.editingItem).toBeNull();

      act(() => result.current.setEditingItem(sampleItems[0]));
      expect(result.current.editingItem).toEqual(sampleItems[0]);
    });
  });

  describe('delete', () => {
    it('should manage delete confirm state', () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      act(() => result.current.setDeleteConfirm(sampleItems[0]));
      expect(result.current.deleteConfirm).toEqual(sampleItems[0]);
    });

    it('should delete item and show success toast', async () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      await waitForLoadComplete(result);

      act(() => result.current.setDeleteConfirm(sampleItems[0]));

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(options.deleteFn).toHaveBeenCalledWith(1);
      expect(mockToast.success).toHaveBeenCalledWith('test.deleted');
      expect(result.current.deleteConfirm).toBeNull();
    });

    it('should show error toast when delete fails', async () => {
      const options = createDefaultOptions({
        deleteFn: vi.fn().mockRejectedValue(new Error('Delete failed')),
      });
      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      await waitForLoadComplete(result);

      act(() => result.current.setDeleteConfirm(sampleItems[0]));

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(mockToast.error).toHaveBeenCalledWith('common.deleteError');
    });

    it('should do nothing when deleteConfirm is null', async () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(options.deleteFn).not.toHaveBeenCalled();
    });
  });

  describe('save handler', () => {
    it('should show create toast and close modal on new save', async () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      await waitForLoadComplete(result);

      act(() => result.current.setModalOpen(true));
      act(() => result.current.handleSave(true));

      expect(mockToast.success).toHaveBeenCalledWith('test.created');
      expect(result.current.modalOpen).toBe(false);
    });

    it('should show update toast on edit save', async () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      await waitForLoadComplete(result);

      act(() => result.current.handleSave(false));

      expect(mockToast.success).toHaveBeenCalledWith('test.updated');
    });
  });

  describe('selection', () => {
    it('should select and deselect items', async () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      await waitForLoadComplete(result);

      act(() => result.current.handleSelectOne(1, true));
      expect(result.current.selectedIds.has(1)).toBe(true);

      act(() => result.current.handleSelectOne(1, false));
      expect(result.current.selectedIds.has(1)).toBe(false);
    });

    it('should select all items', async () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      await waitForLoadComplete(result);

      act(() => result.current.handleSelectAll([1, 2, 3], true));
      expect(result.current.selectedIds.size).toBe(3);

      act(() => result.current.handleSelectAll([1, 2, 3], false));
      expect(result.current.selectedIds.size).toBe(0);
    });
  });

  describe('bulk delete', () => {
    it('should manage bulk delete confirm state', () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useCRUDPage<TestItem, { type: string }>(options));

      act(() => result.current.setBulkDeleteConfirm(true));
      expect(result.current.bulkDeleteConfirm).toBe(true);
    });
  });
});
