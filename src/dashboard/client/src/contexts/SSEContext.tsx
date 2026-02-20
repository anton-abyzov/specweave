import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { appendDashboardToken } from '../utils/dashboardAuth';

export type SSEStatus = 'connecting' | 'connected' | 'disconnected';

type SSEHandler = (data: unknown) => void;

interface SSEContextValue {
  status: SSEStatus;
  subscribe: (eventType: string, handler: SSEHandler) => () => void;
}

const SSEContext = createContext<SSEContextValue | null>(null);

const EVENT_TYPES = [
  'heartbeat', 'increment-update', 'analytics-event',
  'cost-update', 'notification', 'sync-update', 'sync-audit',
  'error-detected', 'config-changed', 'activity',
  'command-output', 'command-complete', 'job-progress',
  'marketplace-scan', 'submission-update', 'verification-complete',
];

export function SSEProvider({ url = '/api/events', children }: { url?: string; children: ReactNode }) {
  const [status, setStatus] = useState<SSEStatus>('connecting');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Map of event type -> Set of handlers
  const listenersRef = useRef(new Map<string, Set<SSEHandler>>());

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus('connecting');
    const es = new EventSource(appendDashboardToken(url));
    eventSourceRef.current = es;

    for (const type of EVENT_TYPES) {
      es.addEventListener(type, (event: MessageEvent) => {
        let data: unknown;
        try {
          data = JSON.parse(event.data);
        } catch {
          return; // Ignore parse errors
        }
        const handlers = listenersRef.current.get(type);
        if (handlers) {
          for (const handler of handlers) {
            try {
              handler(data);
            } catch {
              // Isolate handler failures — one broken handler must not break others
            }
          }
        }
      });
    }

    es.onopen = () => setStatus('connected');

    es.onerror = () => {
      es.close();
      setStatus('disconnected');
      reconnectTimerRef.current = setTimeout(() => {
        if (eventSourceRef.current === es) {
          connect();
        }
      }, 3000);
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [connect]);

  const subscribe = useCallback((eventType: string, handler: SSEHandler): (() => void) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType)!.add(handler);

    return () => {
      const handlers = listenersRef.current.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          listenersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  return (
    <SSEContext.Provider value={{ status, subscribe }}>
      {children}
    </SSEContext.Provider>
  );
}

/** Subscribe to a specific SSE event type. Callback is stable via ref. */
export function useSSEEvent(eventType: string, callback: (data: unknown) => void): void {
  const ctx = useContext(SSEContext);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!ctx) return;
    const handler = (data: unknown) => callbackRef.current(data);
    return ctx.subscribe(eventType, handler);
  }, [ctx, eventType]);
}

/** Get the SSE connection status. */
export function useSSEStatus(): SSEStatus {
  const ctx = useContext(SSEContext);
  return ctx?.status ?? 'disconnected';
}
