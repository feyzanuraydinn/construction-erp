import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockHandle, mockLogError } = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockLogError: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
}));

vi.mock('../../main/logger', () => ({
  mainLogger: {
    error: mockLogError,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { safeHandle } from '../../main/ipc/safeHandle';
import { UserFacingError } from '../../utils/userFacingError';

describe('safeHandle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register a handler via ipcMain.handle', () => {
    const handler = vi.fn();
    safeHandle('test:channel', handler);
    expect(mockHandle).toHaveBeenCalledWith('test:channel', expect.any(Function));
  });

  it('should call the handler and return its result on success', async () => {
    const handler = vi.fn().mockResolvedValue({ id: 1, name: 'Test' });
    safeHandle('test:success', handler);

    const wrappedHandler = mockHandle.mock.calls[0][1];
    const fakeEvent = {} as Electron.IpcMainInvokeEvent;
    const result = await wrappedHandler(fakeEvent, 'arg1', 'arg2');

    expect(handler).toHaveBeenCalledWith(fakeEvent, 'arg1', 'arg2');
    expect(result).toEqual({ id: 1, name: 'Test' });
  });

  it('should sanitize error messages before re-throwing', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('SQLITE_ERROR: no such table: companies'));
    safeHandle('test:error', handler);

    const wrappedHandler = mockHandle.mock.calls[0][1];
    const fakeEvent = {} as Electron.IpcMainInvokeEvent;

    try {
      await wrappedHandler(fakeEvent);
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as Error).message).not.toContain('SQLITE_ERROR');
      expect((err as Error).message).not.toContain('no such table');
    }
  });

  it('should log the original error when it differs from sanitized', async () => {
    const handler = vi
      .fn()
      .mockRejectedValue(new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed'));
    safeHandle('test:log', handler);

    const wrappedHandler = mockHandle.mock.calls[0][1];
    const fakeEvent = {} as Electron.IpcMainInvokeEvent;

    await expect(wrappedHandler(fakeEvent)).rejects.toThrow();

    expect(mockLogError).toHaveBeenCalledWith(expect.stringContaining('IPC [test:log]'), 'IPC');
  });

  it('should handle non-Error throws (string, object)', async () => {
    const handler = vi.fn().mockRejectedValue('some string error');
    safeHandle('test:string-error', handler);

    const wrappedHandler = mockHandle.mock.calls[0][1];
    const fakeEvent = {} as Electron.IpcMainInvokeEvent;

    await expect(wrappedHandler(fakeEvent)).rejects.toThrow();
  });

  it('should pass through handler result for sync handlers', async () => {
    const handler = vi.fn().mockReturnValue(42);
    safeHandle('test:sync', handler);

    const wrappedHandler = mockHandle.mock.calls[0][1];
    const fakeEvent = {} as Electron.IpcMainInvokeEvent;
    const result = await wrappedHandler(fakeEvent);

    expect(result).toBe(42);
  });

  it('should sanitize UNIQUE constraint errors to user-friendly message', async () => {
    const handler = vi
      .fn()
      .mockRejectedValue(new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: companies.name'));
    safeHandle('test:unique', handler);

    const wrappedHandler = mockHandle.mock.calls[0][1];
    const fakeEvent = {} as Electron.IpcMainInvokeEvent;

    try {
      await wrappedHandler(fakeEvent);
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as Error).message).not.toContain('companies.name');
      expect((err as Error).message).not.toContain('SQLITE_CONSTRAINT');
    }
  });

  it('should not log when the message is meant for the user', async () => {
    const handler = vi.fn().mockRejectedValue(new UserFacingError('Something went wrong'));
    safeHandle('test:nolog', handler);

    const wrappedHandler = mockHandle.mock.calls[0][1];
    const fakeEvent = {} as Electron.IpcMainInvokeEvent;

    await expect(wrappedHandler(fakeEvent)).rejects.toThrow();

    expect(mockLogError).not.toHaveBeenCalled();
  });

  it('logs every failure with the given context when one is passed', async () => {
    const failure = new UserFacingError('Something went wrong');
    safeHandle('test:context', () => Promise.reject(failure), {
      message: 'Backup creation failed',
      scope: 'Backup',
    });

    const wrappedHandler = mockHandle.mock.calls[0][1];
    await expect(wrappedHandler({})).rejects.toThrow('Something went wrong');
    expect(mockLogError).toHaveBeenCalledWith('Backup creation failed', 'Backup', failure);
  });
});
