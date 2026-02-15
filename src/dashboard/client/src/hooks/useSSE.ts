import { useEffect, useRef, useCallback, useState } from 'react';

type SSEHandler = (data: unknown) => void;

export type SSEStatus = 'connecting' | 'connected' | 'disconnected';

interface UseSSEOptions {
  url?: string;
  onEvent?: Record<string, SSEHandler>;
  onAnyEvent?: (type: string, data: unknown) => void;
}

interface UseSSEResult {
  status: SSEStatus;
}

export function useSSE(options: UseSSEOptions): UseSSEResult {
  const { url = '/api/events' } = options;
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef(options);
  handlersRef.current = options;
  const [status, setStatus] = useState<SSEStatus>('connecting');

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus('connecting');
    const es = new EventSource(url);
    eventSourceRef.current = es;

    // Register handlers for each event type
    const eventTypes = [
      'heartbeat', 'increment-update', 'analytics-event',
      'cost-update', 'notification', 'sync-update', 'sync-audit',
      'error-detected', 'config-changed', 'activity',
      'command-output', 'command-complete', 'job-progress',
    ];

    for (const type of eventTypes) {
      es.addEventListener(type, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          handlersRef.current.onEvent?.[type]?.(data);
          handlersRef.current.onAnyEvent?.(type, data);
        } catch {
          // Ignore parse errors
        }
      });
    }

    es.onopen = () => {
      setStatus('connected');
    };

    es.onerror = () => {
      es.close();
      setStatus('disconnected');
      // Reconnect after 3 seconds (cleared on unmount to prevent leaks)
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

  return { status };
}
