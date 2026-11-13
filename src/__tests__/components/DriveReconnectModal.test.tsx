import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '../../i18n';
import type { SyncStatusPayload } from '../../types/sync';

const sync = vi.hoisted(() => ({
  status: { status: 'disconnected' } as SyncStatusPayload,
  refresh: vi.fn(async () => undefined),
}));

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => toast,
}));

vi.mock('../../contexts/SyncContext', () => ({
  useSync: () => ({
    status: sync.status,
    conflict: null,
    clearConflict: vi.fn(),
    refresh: sync.refresh,
    triggerReload: 0,
  }),
}));

import { DriveReconnectModal } from '../../components/DriveReconnectModal';

describe('DriveReconnectModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI.gdrive.hasCredentials = vi.fn().mockResolvedValue(true);
    window.electronAPI.gdrive.connect = vi.fn().mockResolvedValue({ success: true });
    window.electronAPI.gdrive.saveCredentials = vi.fn().mockResolvedValue({ success: true });
  });

  it('is not shown on a device that was never connected, nor while connected', () => {
    sync.status = { status: 'disconnected', driveRequired: false };
    const { rerender } = render(<DriveReconnectModal />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    sync.status = { status: 'offline', driveRequired: true };
    rerender(<DriveReconnectModal />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('blocks the app when a linked device is disconnected and cannot be dismissed', async () => {
    sync.status = { status: 'disconnected', driveRequired: true, reason: 'expired' };
    render(<DriveReconnectModal />);
    const dialog = await screen.findByRole('alertdialog');
    expect(screen.getByText('Google Drive bağlantısı koptu')).toBeInTheDocument();
    expect(screen.getByText(/oturumunun süresi doldu/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Kapat')).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(dialog).toBeInTheDocument();
  });

  it('reconnects through Google and refreshes the status', async () => {
    sync.status = { status: 'disconnected', driveRequired: true };
    render(<DriveReconnectModal />);
    const connect = await screen.findByRole('button', { name: /Google ile yeniden bağlan/ });
    await waitFor(() => expect(connect).toBeEnabled());
    fireEvent.click(connect);
    await waitFor(() => expect(window.electronAPI.gdrive.connect).toHaveBeenCalled());
    await waitFor(() => expect(sync.refresh).toHaveBeenCalled());
  });

  it('shows why connecting failed and allows another try', async () => {
    sync.status = { status: 'disconnected', driveRequired: true };
    window.electronAPI.gdrive.connect = vi
      .fn()
      .mockResolvedValue({ success: false, error: 'Bağlantı reddedildi' });
    render(<DriveReconnectModal />);
    const connect = await screen.findByRole('button', { name: /Google ile yeniden bağlan/ });
    await waitFor(() => expect(connect).toBeEnabled());
    fireEvent.click(connect);
    expect(await screen.findByText('Bağlanılamadı: Bağlantı reddedildi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Google ile yeniden bağlan/ })).toBeEnabled();
  });

  it('asks for the connection details when they are missing on this computer', async () => {
    sync.status = { status: 'disconnected', driveRequired: true };
    window.electronAPI.gdrive.hasCredentials = vi.fn().mockResolvedValue(false);
    render(<DriveReconnectModal />);
    expect(await screen.findByText(/Client ID \/ Client Secret/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Google ile yeniden bağlan/ })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('xxxx.apps.googleusercontent.com'), {
      target: { value: 'id.apps.googleusercontent.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('GOCSPX-...'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bilgileri kaydet' }));
    await waitFor(() =>
      expect(window.electronAPI.gdrive.saveCredentials).toHaveBeenCalledWith(
        'id.apps.googleusercontent.com',
        'secret'
      )
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Google ile yeniden bağlan/ })).toBeEnabled()
    );
  });
});
