import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { FiAlertCircle } from 'react-icons/fi';
import { i18n } from '../../i18n';
import { BlockingDialog } from '../../components/ui/BlockingDialog';

const sync = vi.hoisted(() => ({ clearConflict: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../../contexts/SyncContext', () => ({
  useSync: () => ({
    conflict: {
      remoteModifiedTime: '2026-11-01T10:00:00Z',
      remoteSize: '1024',
      lastSyncSuccess: null,
    },
    clearConflict: sync.clearConflict,
  }),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => toast,
}));

import { SyncConflictModal } from '../../components/SyncConflictModal';
import { CloseConfirmModal } from '../../components/CloseConfirmModal';

const nextFrame = () =>
  act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

describe('BlockingDialog', () => {
  it('renders nothing while closed', () => {
    render(
      <BlockingDialog open={false} onDismiss={vi.fn()} icon={FiAlertCircle} title="Kapat?">
        <p>body</p>
      </BlockingDialog>
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('labels the dialog with its title and shows the subtitle', () => {
    render(
      <BlockingDialog
        open
        onDismiss={vi.fn()}
        icon={FiAlertCircle}
        title="Kapat?"
        subtitle="Yedek alınacak"
      >
        <p>body</p>
      </BlockingDialog>
    );
    expect(screen.getByRole('alertdialog', { name: 'Kapat?' })).toBeInTheDocument();
    expect(screen.getByText('Yedek alınacak')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('calls onDismiss on Escape', async () => {
    const onDismiss = vi.fn();
    render(
      <BlockingDialog open onDismiss={onDismiss} icon={FiAlertCircle} title="Kapat?">
        <button type="button">ok</button>
      </BlockingDialog>
    );
    await nextFrame();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('SyncConflictModal', () => {
  const resolveConflict = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    resolveConflict.mockResolvedValue({ success: true });
    Object.assign(window.electronAPI, { sync: { resolveConflict } });
  });

  it("keeps this computer's data when that option is chosen", async () => {
    render(<SyncConflictModal />);
    expect(
      screen.getByRole('alertdialog', { name: i18n.t('sync.conflictTitle') })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('sync.useLocal')) }));

    await waitFor(() => expect(sync.clearConflict).toHaveBeenCalledTimes(1));
    expect(resolveConflict).toHaveBeenCalledWith('use-local');
    expect(toast.success).toHaveBeenCalledWith(i18n.t('sync.useLocalSuccess'));
  });

  it('shows the error and keeps the dialog open when resolving fails', async () => {
    resolveConflict.mockResolvedValue({ success: false, error: 'Drive kapalı' });
    render(<SyncConflictModal />);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('sync.useRemote')) }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Drive kapalı'));
    expect(sync.clearConflict).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: new RegExp(i18n.t('sync.useRemote')) })
    ).toBeEnabled();
  });
});

describe('CloseConfirmModal', () => {
  let requestClose: (payload: { hasPendingChanges: boolean }) => void = () => {};
  const cancelClose = vi.fn();
  const confirmClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cancelClose.mockResolvedValue({ success: true });
    confirmClose.mockResolvedValue({ success: true });
    Object.assign(window.electronAPI.app, {
      cancelClose,
      confirmClose,
      onCloseRequested: (callback: (payload: { hasPendingChanges: boolean }) => void) => {
        requestClose = callback;
        return () => {};
      },
    });
  });

  it('opens when the window asks to close and stays in the app on cancel', async () => {
    render(<CloseConfirmModal />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    act(() => requestClose({ hasPendingChanges: true }));
    expect(
      screen.getByRole('alertdialog', { name: i18n.t('app.closeConfirmTitle') })
    ).toBeInTheDocument();
    expect(screen.getByText(i18n.t('app.closeConfirmDetailPending'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.cancel') }));

    await waitFor(() => expect(cancelClose).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(confirmClose).not.toHaveBeenCalled();
  });

  it('locks both buttons while closing', async () => {
    confirmClose.mockReturnValue(new Promise(() => {}));
    render(<CloseConfirmModal />);
    act(() => requestClose({ hasPendingChanges: false }));

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.close') }));

    expect(confirmClose).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.getByText(i18n.t('app.closeInProgress'))).toBeInTheDocument()
    );
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });
});
