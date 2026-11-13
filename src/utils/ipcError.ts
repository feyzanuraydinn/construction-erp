import { errorText } from './errorText';

export function ipcErrorMessage(error: unknown): string {
  const message = errorText(error);
  return message.replace(/^Error invoking remote method '[^']*':\s*(Error:\s*)?/, '');
}
