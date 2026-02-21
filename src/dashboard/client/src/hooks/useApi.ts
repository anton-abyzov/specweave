import { useState, useEffect, useCallback } from 'react';

export interface UseApiOptions {
  /** Timeout in ms (default: 30000) */
  timeout?: number;
  /** Number of retries on non-timeout failure (default: 1) */
  retries?: number;
  /** Delay between retries in ms (default: 2000) */
  retryDelay?: number;
}

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  fetchedAt: Date | null;
}

export function useApi<T>(url: string, options?: UseApiOptions): UseApiResult<T> {
  const { timeout = 30000, retries = 1, retryDelay = 2000 } = options ?? {};
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const refetch = useCallback(() => setTrigger((t) => t + 1), []);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function attempt(attemptsLeft: number): Promise<void> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          throw new Error(`Expected JSON response but got ${ct || 'unknown'} — server may be restarting`);
        }
        const json = await res.json();
        if (!cancelled) {
          setData(json.data ?? json);
          setError(null);
          setFetchedAt(new Date());
          setLoading(false);
        }
      } catch (err: any) {
        clearTimeout(timer);
        if (cancelled) return;

        // Retry on non-timeout errors if attempts remain
        if (attemptsLeft > 0 && err.name !== 'AbortError') {
          await new Promise(r => setTimeout(r, retryDelay));
          if (!cancelled) return attempt(attemptsLeft - 1);
          return;
        }

        // All retries exhausted — set final error state
        if (err.name === 'AbortError') {
          setError(`Request timed out (${Math.round(timeout / 1000)}s)`);
        } else {
          setError(String(err.message || err));
        }
        setLoading(false);
      }
    }

    attempt(retries);

    return () => { cancelled = true; };
  }, [url, trigger, timeout, retries, retryDelay]);

  return { data, loading, error, refetch, fetchedAt };
}
