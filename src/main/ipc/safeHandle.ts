/**
 * Safe IPC handle wrapper
 *
 * Wraps ipcMain.handle callbacks to sanitize error messages
 * before they reach the renderer process. Prevents internal
 * DB schema details (table names, column names, SQL syntax)
 * from leaking to the frontend.
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { sanitizeError } from '../../utils/security';
import { mainLogger } from '../logger';

type IpcHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;

/**
 * Register an IPC handler with automatic error sanitization.
 * - Logs the full original error server-side for debugging
 * - Sends only sanitized user-friendly messages to renderer
 */
export function safeHandle(channel: string, handler: IpcHandler): void {
  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...args: unknown[]) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      const originalMessage = error instanceof Error ? error.message : String(error);
      const sanitized = sanitizeError(error);

      // Log the original error for server-side debugging
      if (originalMessage !== sanitized) {
        mainLogger.error(`IPC [${channel}]: ${originalMessage}`, 'IPC');
      }

      throw new Error(sanitized);
    }
  });
}
