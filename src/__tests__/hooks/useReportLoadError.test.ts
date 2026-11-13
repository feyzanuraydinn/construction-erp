import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { i18n } from '../../i18n';

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => toast }));

import { useReportLoadError } from '../../hooks/useReportLoadError';

describe('useReportLoadError', () => {
  it('logs the error with its label and shows the load error message', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useReportLoadError());
    const error = new Error('db closed');

    result.current('Trash load error:', error);

    expect(consoleError).toHaveBeenCalledWith('Trash load error:', error);
    expect(toast.error).toHaveBeenCalledWith(i18n.t('common.loadError', { error: 'db closed' }));
    consoleError.mockRestore();
  });

  it('keeps the same function between renders', () => {
    const { result, rerender } = renderHook(() => useReportLoadError());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
