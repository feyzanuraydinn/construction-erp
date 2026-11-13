import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { SyncStatusPayload, SyncConflictPayload } from '../types/sync';
import { clearAllCache } from '../hooks/useDataCache';

interface SyncContextType {
  status: SyncStatusPayload;
  conflict: SyncConflictPayload | null;
  clearConflict: () => void;
  refresh: () => Promise<void>;
  triggerReload: number;
}

const defaultStatus: SyncStatusPayload = { status: 'disconnected' };

const SyncContext = createContext<SyncContextType>({
  status: defaultStatus,
  conflict: null,
  clearConflict: () => {},
  refresh: async () => {},
  triggerReload: 0,
});

export const useSync = (): SyncContextType => useContext(SyncContext);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SyncStatusPayload>(defaultStatus);
  const [conflict, setConflict] = useState<SyncConflictPayload | null>(null);
  const [triggerReload, setTriggerReload] = useState(0);

  const refresh = useCallback(async () => {
    if (!window.electronAPI?.sync) return;
    try {
      const s = await window.electronAPI.sync.getStatus();
      setStatus(s);
    } catch (error) {
      console.error('Sync status load error:', error);
    }
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.sync) return;

    window.electronAPI.sync
      .getStatus()
      .then(setStatus)
      .catch((error: unknown) => console.error('Sync status load error:', error));

    const offStatus = window.electronAPI.sync.onStatus((payload) => {
      setStatus(payload);
    });
    const offConflict = window.electronAPI.sync.onConflict((payload) => {
      setConflict(payload);
    });
    const offReload = window.electronAPI.sync.onReloadRequired(() => {
      clearAllCache();
      setTriggerReload((n) => n + 1);
    });

    return () => {
      offStatus();
      offConflict();
      offReload();
    };
  }, []);

  const clearConflict = useCallback(() => setConflict(null), []);

  return (
    <SyncContext.Provider value={{ status, conflict, clearConflict, refresh, triggerReload }}>
      {children}
    </SyncContext.Provider>
  );
};
