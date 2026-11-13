import { useCallback, useEffect, useState } from 'react';
import { useReportLoadError } from './useReportLoadError';
import { useLatest } from './useLatest';

interface Loaded<T> {
  source: (() => Promise<T>) | null;
  version: number;
  data: T | null;
}

interface LoadOptions {
  keepPrevious?: boolean;
}

export function useLoadedData<T>(
  load: (() => Promise<T>) | null,
  errorLabel: string,
  { keepPrevious = false }: LoadOptions = {}
) {
  const reportLoadError = useReportLoadError();
  const reportRef = useLatest((error: unknown) => reportLoadError(errorLabel, error));
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T>>({ source: null, version: -1, data: null });

  useEffect(() => {
    if (!load) return;
    let active = true;
    load()
      .then((data) => {
        if (active) setLoaded({ source: load, version, data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        reportRef.current(error);
        setLoaded((previous) => ({
          source: load,
          version,
          data: previous.source === load ? previous.data : null,
        }));
      });
    return () => {
      active = false;
    };
  }, [load, version, reportRef]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  const sameSource = load !== null && loaded.source === load;

  return {
    data: sameSource || (keepPrevious && load !== null) ? loaded.data : null,
    loading: load !== null && !(sameSource && loaded.version === version),
    reload,
  };
}
