import { useLoadedData } from './useLoadedData';

const loadAppVersion = () =>
  window.electronAPI.app.getVersion().catch((error: unknown) => {
    console.error('App version load error:', error);
    return '';
  });

export function useAppVersion(): string {
  const { data } = useLoadedData(loadAppVersion, 'App version load error:');
  return data ?? '';
}
