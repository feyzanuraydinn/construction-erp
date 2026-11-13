import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '../../i18n';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TabGroup } from '../../components/ui/TabGroup';

const nextFrame = () =>
  act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

describe('Modal layers', () => {
  it('Escape closes only the topmost modal', async () => {
    const closeForm = vi.fn();
    const closeConfirm = vi.fn();
    render(
      <>
        <Modal isOpen onClose={closeForm} title="Form">
          <input aria-label="field" />
        </Modal>
        <ConfirmDialog
          isOpen
          onClose={closeConfirm}
          onConfirm={vi.fn()}
          title="Sure?"
          message="m"
        />
      </>
    );
    await nextFrame();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(closeConfirm).toHaveBeenCalledTimes(1);
    expect(closeForm).not.toHaveBeenCalled();
  });

  it('keeps the page scroll-locked until the last modal closes', () => {
    const { rerender } = render(
      <>
        <Modal isOpen onClose={vi.fn()} title="A">
          a
        </Modal>
        <Modal isOpen onClose={vi.fn()} title="B">
          b
        </Modal>
      </>
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <>
        <Modal isOpen onClose={vi.fn()} title="A">
          a
        </Modal>
        <Modal isOpen={false} onClose={vi.fn()} title="B">
          b
        </Modal>
      </>
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <>
        <Modal isOpen={false} onClose={vi.fn()} title="A">
          a
        </Modal>
        <Modal isOpen={false} onClose={vi.fn()} title="B">
          b
        </Modal>
      </>
    );
    expect(document.body.style.overflow).toBe('');
  });

  it('does not steal focus when the parent re-renders with a new inline onClose', async () => {
    function Page() {
      const [count, setCount] = useState(0);
      return (
        <>
          <button onClick={() => setCount(count + 1)}>rerender {count}</button>
          <Modal isOpen onClose={() => setCount(0)} title="Form">
            <input aria-label="description" />
          </Modal>
        </>
      );
    }
    render(<Page />);
    await nextFrame();

    const input = screen.getByLabelText('description');
    input.focus();
    act(() => {
      fireEvent.click(screen.getByText(/rerender/));
    });
    await nextFrame();

    input.focus();
    act(() => {
      screen.getByText(/rerender/).click();
      input.focus();
    });
    await nextFrame();
    expect(document.activeElement).toBe(input);
  });

  it('gives a confirm dialog an accessible name', () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete item?"
        message="m"
      />
    );
    expect(screen.getByRole('alertdialog', { name: 'Delete item?' })).toBeInTheDocument();
  });
});

describe('TabGroup keyboard', () => {
  const tabs = [
    { key: 'a', label: 'Alpha' },
    { key: 'b', label: 'Beta' },
    { key: 'c', label: 'Gamma' },
  ];

  it('moves between tabs with the arrow keys, Home and End', () => {
    function Tabs() {
      const [active, setActive] = useState('a');
      return <TabGroup tabs={tabs} activeTab={active} onChange={setActive} />;
    }
    render(<Tabs />);
    const tablist = screen.getByRole('tablist');

    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Beta' }));

    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tablist, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveAttribute('aria-selected', 'true');
  });
});
