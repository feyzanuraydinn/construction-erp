import { BrowserWindow } from 'electron';
import { safeHandle } from './safeHandle';

export function registerWindowHandlers(
  getMainWindow: () => BrowserWindow | null,
  saveBeforeQuit: () => Promise<void>
): void {
  safeHandle('app:close-confirmed', async () => {
    await saveBeforeQuit();
    getMainWindow()?.close();
    return { success: true };
  });

  safeHandle('app:close-cancelled', () => ({ success: true }));
}
