/**
 * Custom React Hook Template
 *
 * This template provides a starting point for creating reusable
 * custom hooks following React best practices.
 *
 * Usage:
 * 1. Copy this template to your hooks directory
 * 2. Rename file and hook
 * 3. Define input parameters and return type
 * 4. Implement hook logic
 * 5. Add tests and documentation
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for the useCustomHook
 */
export interface UseCustomHookOptions {
  /** Enable/disable the hook */
  enabled?: boolean;

  /** Callback when data is loaded */
  onSuccess?: (data: string) => void;

  /** Callback when error occurs */
  onError?: (error: Error) => void;

  /** Retry count */
  retryCount?: number;
}

/**
 * Return type of useCustomHook
 */
export interface UseCustomHookResult {
  /** Current data */
  data: string | null;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Refetch function */
  refetch: () => void;

  /** Reset function */
  reset: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_OPTIONS: Required<UseCustomHookOptions> = {
  enabled: true,
  onSuccess: () => {},
  onError: () => {},
  retryCount: 3,
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * useCustomHook - Brief description of what this hook does
 *
 * More detailed description of the hook's purpose, use cases,
 * and any important implementation notes.
 *
 * @param param1 - Description of param1
 * @param options - Configuration options
 * @returns Hook result with data, loading, error states and utility functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data, isLoading, error, refetch } = useCustomHook('value', {
 *     enabled: true,
 *     onSuccess: (data) => console.log('Success:', data),
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return <div>{data}</div>;
 * }
 * ```
 */
export function useCustomHook(
  param1: string,
  options: UseCustomHookOptions = {}
): UseCustomHookResult {
  // ========================================================================
  // OPTIONS
  // ========================================================================

  const {
    enabled = DEFAULT_OPTIONS.enabled,
    onSuccess = DEFAULT_OPTIONS.onSuccess,
    onError = DEFAULT_OPTIONS.onError,
    retryCount = DEFAULT_OPTIONS.retryCount,
  } = options;

  // ========================================================================
  // STATE
  // ========================================================================

  const [data, setData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // ========================================================================
  // REFS
  // ========================================================================

  // Use refs for values that shouldn't trigger re-renders
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  // ========================================================================
  // CLEANUP
  // ========================================================================

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ========================================================================
  // FETCH LOGIC
  // ========================================================================

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Simulate async operation
      const result = await new Promise<string>((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.8) {
            reject(new Error('Random error'));
          } else {
            resolve(`Data for ${param1}`);
          }
        }, 1000);
      });

      // Only update state if component is still mounted
      if (mountedRef.current) {
        setData(result);
        setIsLoading(false);
        onSuccess(result);
        retryCountRef.current = 0; // Reset retry count on success
      }
    } catch (err) {
      if (mountedRef.current) {
        const error = err instanceof Error ? err : new Error('Unknown error');

        // Retry logic
        if (retryCountRef.current < retryCount) {
          retryCountRef.current++;
          setTimeout(() => fetchData(), 1000 * retryCountRef.current); // Exponential backoff
        } else {
          setError(error);
          setIsLoading(false);
          onError(error);
        }
      }
    }
  }, [enabled, param1, onSuccess, onError, retryCount]);

  // ========================================================================
  // EFFECTS
  // ========================================================================

  useEffect(() => {
    if (enabled) {
      fetchData();
    }

    // Cleanup function
    return () => {
      // Cancel any pending operations
    };
  }, [enabled, fetchData]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const refetch = useCallback(() => {
    retryCountRef.current = 0; // Reset retry count
    fetchData();
  }, [fetchData]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    retryCountRef.current = 0;
  }, []);

  // ========================================================================
  // RETURN
  // ========================================================================

  return {
    data,
    isLoading,
    error,
    refetch,
    reset,
  };
}

// ============================================================================
// HELPER HOOKS (Optional)
// ============================================================================

/**
 * useDebounce - Debounce a value
 *
 * Useful for search inputs, window resize handlers, etc.
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   // API call with debounced value
 *   searchAPI(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useLocalStorage - Sync state with localStorage
 *
 * @example
 * ```tsx
 * const [theme, setTheme] = useLocalStorage('theme', 'light');
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useCustomHook;
