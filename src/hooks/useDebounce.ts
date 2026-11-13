import { useState, useEffect } from 'react';
import { TIMING } from '../utils/constants';

export function useDebounce<T>(value: T, delay: number = TIMING.SEARCH_DEBOUNCE): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
