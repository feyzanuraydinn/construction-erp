import { describe, it, expect, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../../contexts/ToastContext';

describe('ToastContext', () => {
  it('gives consumers the same toast object when toasts appear', () => {
    const onToastChanged = vi.fn();

    function Consumer() {
      const toast = useToast();
      useEffect(() => {
        onToastChanged();
      }, [toast]);
      return <button onClick={() => toast.error('Load failed')}>show</button>;
    }

    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>
    );
    expect(onToastChanged).toHaveBeenCalledTimes(1);

    act(() => {
      fireEvent.click(screen.getByText('show'));
    });
    act(() => {
      fireEvent.click(screen.getByText('show'));
    });

    expect(screen.getAllByText('Load failed')).toHaveLength(2);
    expect(onToastChanged).toHaveBeenCalledTimes(1);
  });
});
