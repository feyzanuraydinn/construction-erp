import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to avoid hoisting issues with vi.mock
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

    // The re-thrown error should be sanitized (not contain SQL details)
    try {
      await wrappedHandler(fakeEvent);
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as Error).message).not.toContain('SQLITE_ERROR');
      expect((err as Error).message).not.toContain('no such table');
    }
  });

  it('should log the original error when it differs from sanitized', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed'));
    safeHandle('test:log', handler);

    const wrappedHandler = mockHandle.mock.calls[0][1];
    const fakeEvent = {} as Electron.IpcMainInvokeEvent;

    try {
      await wrappedHandler(fakeEvent);
    } catch {
      // expected
    }

    expect(mockLogError).toHaveBeenCalledWith(
      expect.stringContaining('IPC [test:log]'),
      'IPC'
    );
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
    const handler = vi.fn().mockRejectedValue(new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: companies.name'));
    safeHandle('test:unique', handler);

    const wrappedHandler = mockHandle.mock.calls[0][1];
    const fakeEvent = {} as Electron.IpcMainInvokeEvent;

    try {
      await wrappedHandler(fakeEvent);
      expect.fail('Should have thrown');
    } catch (err) {
      // Should not contain table/column details
      expect((err as Error).message).not.toContain('companies.name');
      expect((err as Error).message).not.toContain('SQLITE_CONSTRAINT');
    }
  });

  it('should not log when original and sanitized messages are the same', async () => {
    // A generic error that doesn't get sanitized differently
    const handler = vi.fn().mockRejectedValue(new Error('Something went wrong'));
    safeHandle('test:nolog', handler);

    const wrappedHandler = mockHandle.mock.calls[0][1];
    const fakeEvent = {} as Electron.IpcMainInvokeEvent;

    try {
      await wrappedHandler(fakeEvent);
    } catch {
      // expected
    }

    // Logger should NOT be called because message wasn't sanitized
    expect(mockLogError).not.toHaveBeenCalled();
  });
});
