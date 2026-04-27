import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExport } from '../../hooks/useExport';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'tr' },
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
  formatRecordsForExport: vi.fn().mockReturnValue([{ col1: 'val1' }]),
  exportToExcel: vi.fn().mockResolvedValue('/path/to/file.xlsx'),
  exportToCSV: vi.fn().mockResolvedValue('/path/to/file.xlsx'),
  shareExcel: vi.fn().mockResolvedValue('/path/to/file.xlsx'),
}));

describe('useExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return handleExport function', () => {
    const { result } = renderHook(() => useExport());
    expect(result.current.handleExport).toBeDefined();
    expect(typeof result.current.handleExport).toBe('function');
  });

  it('should call formatRecordsForExport and exportToExcel on export', async () => {
    const { formatRecordsForExport, exportToExcel } = await import('../../utils/exportUtils');
    const { result } = renderHook(() => useExport());

    const testData = [{ id: 1, name: 'Test' }];
    const testColumns = [{ key: 'name', label: 'Name' }];

    await act(async () => {
      await result.current.handleExport('test-export', testData, testColumns);
    });

    expect(formatRecordsForExport).toHaveBeenCalledWith(testData, testColumns);
    expect(exportToExcel).toHaveBeenCalledWith('test-export', [{ col1: 'val1' }], 'test-export', undefined);
  });

  it('should show success toast on successful export', async () => {
    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.handleExport('test', [{ id: 1 }], [{ key: 'id', label: 'ID' }]);
    });

    expect(mockToast.success).toHaveBeenCalledWith('common.exportSuccess');
  });

  it('should show error toast when export fails', async () => {
    const { exportToExcel } = await import('../../utils/exportUtils');
    vi.mocked(exportToExcel).mockRejectedValueOnce(new Error('Export failed'));

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.handleExport('test', [{ id: 1 }], [{ key: 'id', label: 'ID' }]);
    });

    expect(mockToast.error).toHaveBeenCalledWith('common.exportError');
  });

  it('should not show success toast when exportToExcel returns falsy', async () => {
    const { exportToExcel } = await import('../../utils/exportUtils');
    vi.mocked(exportToExcel).mockResolvedValueOnce('');

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.handleExport('test', [{ id: 1 }], [{ key: 'id', label: 'ID' }]);
    });

    expect(mockToast.success).not.toHaveBeenCalled();
  });
});
