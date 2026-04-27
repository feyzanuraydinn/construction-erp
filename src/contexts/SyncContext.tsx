import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { SyncStatusPayload, SyncConflictPayload } from '../types/electron';

interface SyncContextType {
  status: SyncStatusPayload;
  conflict: SyncConflictPayload | null;
  clearConflict: () => void;
  refresh: () => Promise<void>;
  triggerReload: number; // counter that increments when remote data was pulled — pages can useEffect on this
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
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.sync) return;

    void refresh();

    const offStatus = window.electronAPI.sync.onStatus((payload) => {
      setStatus(payload);
    });
    const offConflict = window.electronAPI.sync.onConflict((payload) => {
      setConflict(payload);
    });
    const offReload = window.electronAPI.sync.onReloadRequired(() => {
      setTriggerReload((n) => n + 1);
    });

    return () => {
      offStatus();
      offConflict();
      offReload();
    };
  }, [refresh]);

  const clearConflict = useCallback(() => setConflict(null), []);

  return (
    <SyncContext.Provider value={{ status, conflict, clearConflict, refresh, triggerReload }}>
      {children}
    </SyncContext.Provider>
  );
};
