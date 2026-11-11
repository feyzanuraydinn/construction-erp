import { useEffect, useState } from 'react';
import type { ExchangeRates } from '../types';

export function useExchangeRates(enabled: boolean): ExchangeRates | null {
  const [rates, setRates] = useState<ExchangeRates | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    window.electronAPI.exchange
      .getRates()
      .then((loaded) => {
        if (!cancelled && loaded) setRates(loaded);
      })
      .catch((error: unknown) => {
        console.error('Exchange rates could not be loaded:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return rates;
}
