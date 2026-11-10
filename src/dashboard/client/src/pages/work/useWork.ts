/** Board data and writes, shared by the Work board and Sessions pages. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectApi } from '../../hooks/useProjectApi';
import { useProject } from '../../hooks/useProject';
import { useSSEEvent } from '../../contexts/SSEContext';
import type { WorkBoardPayload, WorkItem, WorkState } from '../../../../work-types';
import { STATE_LABEL } from './parts';

export interface Work {
  data: WorkBoardPayload | null;
  loading: boolean;
  error: string | null;
  failure: string;
  notice: string;
  saving: boolean;
  /** Bumps on every disk change or poll, so dependants (the open detail panel) reload with the board. */
  tick: number;
  refetch: () => void;
  setNotice: (text: string) => void;
  mutate: (endpoint: string, method: string, body: unknown) => Promise<boolean>;
  move: (item: WorkItem, state: WorkState) => Promise<void>;
}

export function useWork(): Work {
  const { activeProject } = useProject();
  const { data, error, loading, refetch: refetchBoard } = useProjectApi<WorkBoardPayload>('/api/work');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => {
    refetchBoard();
    setTick((n) => n + 1);
  }, [refetchBoard]);
  useSSEEvent('increment-update', refetch);
  // A reconciliation poll covers missed filesystem notifications and expired claims, without model calls.
  useEffect(() => {
    const timer = setInterval(refetch, 15000);
    return () => clearInterval(timer);
  }, [refetch]);

  const projectId = activeProject?.id;
  const mutate = useCallback(
    async (endpoint: string, method: string, body: unknown): Promise<boolean> => {
      if (busy.current) return false;
      busy.current = true;
      setSaving(true);
      setFailure('');
      try {
        const suffix = projectId ? `?project=${encodeURIComponent(projectId)}` : '';
        const response = await fetch(`/api/work${endpoint}${suffix}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || 'Could not save work');
        return true;
      } catch (err) {
        setFailure(err instanceof Error ? err.message : 'Could not save work');
        return false;
      } finally {
        busy.current = false;
        setSaving(false);
        refetch();
      }
    },
    [projectId, refetch],
  );
  const move = useCallback(
    async (item: WorkItem, state: WorkState) => {
      if (state === item.state) return;
      if (await mutate(`/${encodeURIComponent(item.id)}`, 'PATCH', { revision: item.revision, state }))
        setNotice(`${item.title} moved to ${STATE_LABEL[state]}.`);
    },
    [mutate],
  );
  return { data, loading, error, failure, notice, saving, tick, refetch, setNotice, mutate, move };
}
