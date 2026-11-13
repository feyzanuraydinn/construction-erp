import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '../../i18n';
import { useLoadedData } from '../../hooks/useLoadedData';
import { useIdParam } from '../../hooks/useIdParam';

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

describe('useLoadedData', () => {
  it('keeps the answer of the latest request when an older one arrives late', async () => {
    let finishSlow: (value: string) => void = () => {};
    const slow = () =>
      new Promise<string>((resolve) => {
        finishSlow = resolve;
      });
    const fast = () => Promise.resolve('fresh');
    const { result, rerender } = renderHook(({ load }) => useLoadedData(load, 'Test load error:'), {
      initialProps: { load: slow },
    });

    rerender({ load: fast });
    await waitFor(() => expect(result.current.data).toBe('fresh'));
    await act(async () => {
      finishSlow('stale');
    });
    expect(result.current.data).toBe('fresh');
    expect(result.current.loading).toBe(false);
  });

  it('stops loading without asking anything when there is nothing to load', () => {
    const { result } = renderHook(() => useLoadedData(null, 'Test load error:'));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('reports a failed load once', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const failing = () => Promise.reject(new Error('db closed'));
    const { result } = renderHook(() => useLoadedData(failing, 'Test load error:'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockToast.error).toHaveBeenCalledOnce();
  });
});

function ShowId() {
  const id = useIdParam();
  return <p>{id === null ? 'none' : `id ${id}`}</p>;
}

describe('useIdParam', () => {
  it.each([
    ['/items/12', 'id 12'],
    ['/items/abc', 'none'],
    ['/items/0', 'none'],
    ['/items/1.5', 'none'],
  ])('reads %s as %s', (path, shown) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/items/:id" element={<ShowId />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(shown)).toBeInTheDocument();
  });
});
