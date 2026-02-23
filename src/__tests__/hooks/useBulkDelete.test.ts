import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBulkDelete } from '../../hooks/useBulkDelete';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
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

describe('useBulkDelete', () => {
  const mockDeleteFn = vi.fn().mockResolvedValue({ success: true });
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderUseBulkDelete(overrides = {}) {
    return renderHook(() =>
      useBulkDelete({
        deleteFn: mockDeleteFn,
        entityKey: 'companies',
        onSuccess: mockOnSuccess,
        ...overrides,
      })
    );
  }

  it('should return bulkDeleteConfirm, setBulkDeleteConfirm, and handleBulkDelete', () => {
    const { result } = renderUseBulkDelete();
    expect(result.current.bulkDeleteConfirm).toBe(false);
    expect(typeof result.current.setBulkDeleteConfirm).toBe('function');
    expect(typeof result.current.handleBulkDelete).toBe('function');
  });

  it('should toggle bulkDeleteConfirm state', () => {
    const { result } = renderUseBulkDelete();

    act(() => {
      result.current.setBulkDeleteConfirm(true);
    });
    expect(result.current.bulkDeleteConfirm).toBe(true);

    act(() => {
      result.current.setBulkDeleteConfirm(false);
    });
    expect(result.current.bulkDeleteConfirm).toBe(false);
  });

  it('should do nothing when selectedIds is empty', async () => {
    const { result } = renderUseBulkDelete();

    await act(async () => {
      await result.current.handleBulkDelete(new Set());
    });

    expect(mockDeleteFn).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should delete all selected items sequentially', async () => {
    const { result } = renderUseBulkDelete();
    const ids = new Set([1, 2, 3]);

    await act(async () => {
      await result.current.handleBulkDelete(ids);
    });

    expect(mockDeleteFn).toHaveBeenCalledTimes(3);
    expect(mockDeleteFn).toHaveBeenCalledWith(1);
    expect(mockDeleteFn).toHaveBeenCalledWith(2);
    expect(mockDeleteFn).toHaveBeenCalledWith(3);
  });

  it('should show success toast when all deletions succeed', async () => {
    const { result } = renderUseBulkDelete();

    await act(async () => {
      await result.current.handleBulkDelete(new Set([1, 2]));
    });

    expect(mockToast.success).toHaveBeenCalledOnce();
    expect(mockOnSuccess).toHaveBeenCalledOnce();
  });

  it('should show warning toast when some deletions fail', async () => {
    mockDeleteFn
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce({ success: true });

    const { result } = renderUseBulkDelete();

    await act(async () => {
      await result.current.handleBulkDelete(new Set([1, 2, 3]));
    });

    expect(mockToast.warning).toHaveBeenCalledOnce();
    expect(mockOnSuccess).toHaveBeenCalledOnce();
  });

  it('should set bulkDeleteConfirm to false after deletion', async () => {
    const { result } = renderUseBulkDelete();

    act(() => {
      result.current.setBulkDeleteConfirm(true);
    });
    expect(result.current.bulkDeleteConfirm).toBe(true);

    await act(async () => {
      await result.current.handleBulkDelete(new Set([1]));
    });

    expect(result.current.bulkDeleteConfirm).toBe(false);
  });

  it('should call onSuccess even when some items fail', async () => {
    mockDeleteFn.mockRejectedValueOnce(new Error('Fail'));

    const { result } = renderUseBulkDelete();

    await act(async () => {
      await result.current.handleBulkDelete(new Set([1, 2]));
    });

    expect(mockOnSuccess).toHaveBeenCalledOnce();
  });
});
