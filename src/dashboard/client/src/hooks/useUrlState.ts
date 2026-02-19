import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

// Module-level batching state shared across all useUrlState instances.
// When multiple setters fire synchronously (same event handler), updates
// are queued here and flushed in a single setSearchParams call via queueMicrotask.
const pendingUpdates = new Map<string, { value: string; defaultValue: string }>();
let flushScheduled = false;
let setSearchParamsRef: ReturnType<typeof useSearchParams>[1] | null = null;

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    const setter = setSearchParamsRef;
    if (!setter || pendingUpdates.size === 0) {
      pendingUpdates.clear();
      return;
    }
    const updates = new Map(pendingUpdates);
    pendingUpdates.clear();
    setter(prev => {
      const next = new URLSearchParams(prev);
      for (const [key, { value, defaultValue }] of updates) {
        if (value && value !== defaultValue) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }
      return next;
    });
  });
}

export function useUrlState(key: string, defaultValue = ''): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback((newValue: string) => {
    setSearchParamsRef = setSearchParams;
    pendingUpdates.set(key, { value: newValue, defaultValue });
    scheduleFlush();
  }, [key, defaultValue, setSearchParams]);

  return [value, setValue];
}
