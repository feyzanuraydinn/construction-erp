import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrint } from '../../hooks/usePrint';

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

describe('usePrint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return executePrint function', () => {
    const { result } = renderHook(() => usePrint());
    expect(result.current.executePrint).toBeDefined();
    expect(typeof result.current.executePrint).toBe('function');
  });

  it('should call electronAPI.app.print on executePrint', async () => {
    const { result } = renderHook(() => usePrint());

    await act(async () => {
      await result.current.executePrint();
    });

    expect(window.electronAPI.app.print).toHaveBeenCalledOnce();
  });

  it('should not show error toast on successful print', async () => {
    const { result } = renderHook(() => usePrint());

    await act(async () => {
      await result.current.executePrint();
    });

    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it('should show error toast when print fails with error message', async () => {
    vi.mocked(window.electronAPI.app.print).mockResolvedValueOnce({
      success: false,
      error: 'Printer not found',
    });

    const { result } = renderHook(() => usePrint());

    await act(async () => {
      await result.current.executePrint();
    });

    expect(mockToast.error).toHaveBeenCalledOnce();
  });

  it('should show error toast when print throws an exception', async () => {
    vi.mocked(window.electronAPI.app.print).mockRejectedValueOnce(
      new Error('Connection failed')
    );

    const { result } = renderHook(() => usePrint());

    await act(async () => {
      await result.current.executePrint();
    });

    expect(mockToast.error).toHaveBeenCalledOnce();
  });

  it('should show unknown error toast when print result has no error field', async () => {
    vi.mocked(window.electronAPI.app.print).mockResolvedValueOnce({
      success: false,
    });

    const { result } = renderHook(() => usePrint());

    await act(async () => {
      await result.current.executePrint();
    });

    expect(mockToast.error).toHaveBeenCalledOnce();
  });
});
