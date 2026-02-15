import { useState, useCallback, useRef, useEffect } from 'react';
import { useSSE } from './useSSE.js';

type CommandStatus = 'idle' | 'running' | 'success' | 'error';

interface CommandResult {
  id: string;
  command: string;
  status: string;
}

export function useCommand() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [status, setStatus] = useState<CommandStatus>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeCommandRef = useRef<string | null>(null);

  // Listen for SSE command events
  useSSE({
    onEvent: {
      'command-output': (data: unknown) => {
        const evt = data as { executionId?: string; line?: string };
        if (activeCommandRef.current && evt.executionId === activeCommandRef.current) {
          if (evt.line) {
            setOutput(prev => [...prev, evt.line as string]);
          }
        }
      },
      'command-complete': (data: unknown) => {
        const evt = data as { executionId?: string; exitCode?: number | null };
        if (activeCommandRef.current && evt.executionId === activeCommandRef.current) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setRunning(false);
          if (evt.exitCode === 0) {
            setStatus('success');
            setOutput(prev => [...prev, 'Command completed successfully.']);
          } else {
            setStatus('error');
            const msg = `Command failed (exit code ${evt.exitCode ?? 'unknown'})`;
            setError(msg);
            setOutput(prev => [...prev, msg]);
          }
          activeCommandRef.current = null;
        }
      },
    },
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const execute = useCallback(async (commandName: string) => {
    setRunning(true);
    setError(null);
    setOutput([`> specweave ${commandName}`]);
    setStatus('running');

    try {
      const res = await fetch(`/api/commands/${commandName}`, { method: 'POST' });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || 'Command failed');
        setStatus('error');
        setOutput(prev => [...prev, `Error: ${json.error || 'Command failed'}`]);
        setRunning(false);
        return null;
      }
      setResult(json.data);
      activeCommandRef.current = json.data?.id || null;

      // 60-second safety timeout
      timeoutRef.current = setTimeout(() => {
        if (activeCommandRef.current) {
          activeCommandRef.current = null;
          setRunning(false);
          setStatus('error');
          setError('Command timed out after 60 seconds');
          setOutput(prev => [...prev, 'Timed out after 60 seconds.']);
        }
      }, 60000);

      return json.data;
    } catch (err) {
      setError(String(err));
      setStatus('error');
      setOutput(prev => [...prev, `Error: ${String(err)}`]);
      setRunning(false);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setResult(null);
    setError(null);
    setOutput([]);
    setStatus('idle');
    activeCommandRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { execute, running, result, error, output, status, reset };
}
