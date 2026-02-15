import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export function useUrlState(key: string, defaultValue = ''): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback((newValue: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (newValue && newValue !== defaultValue) {
        next.set(key, newValue);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, [key, defaultValue, setSearchParams]);

  return [value, setValue];
}
