import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { i18n } from '../../i18n';

vi.mock('../../contexts/SyncContext', () => ({
  useSync: () => ({ status: { status: 'synced', lastSyncSuccess: null } }),
}));

import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';

describe('SyncStatusIndicator', () => {
  it('closes its popover on a click outside but not on a click inside', () => {
    render(
      <div>
        <p>outside</p>
        <SyncStatusIndicator collapsed={false} />
      </div>
    );
    const syncNow = () => screen.queryByRole('button', { name: i18n.t('sync.syncNow') });

    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('sync.synced')) }));
    expect(syncNow()).toBeInTheDocument();

    const button = syncNow();
    if (!button) throw new Error('popover did not open');
    fireEvent.mouseDown(button);
    expect(syncNow()).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByText('outside'));
    expect(syncNow()).not.toBeInTheDocument();
  });
});
