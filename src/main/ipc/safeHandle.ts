import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { sanitizeError } from '../../utils/security';
import { mainLogger } from '../logger';
import { t } from '../i18n';
import { errorText } from '../../utils/errorText';

export function toUserMessage(error: unknown): string {
  return t(sanitizeError(error));
}

type IpcHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;

interface FailureLog {
  message: string;
  scope: string;
}

export function safeHandle(channel: string, handler: IpcHandler, failureLog?: FailureLog): void {
  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...args: unknown[]) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      const originalMessage = errorText(error);
      const sanitized = toUserMessage(error);

      if (failureLog) {
        mainLogger.error(failureLog.message, failureLog.scope, error);
      } else if (originalMessage !== sanitized) {
        mainLogger.error(`IPC [${channel}]: ${originalMessage}`, 'IPC');
      }

      throw new Error(sanitized, { cause: error });
    }
  });
}
