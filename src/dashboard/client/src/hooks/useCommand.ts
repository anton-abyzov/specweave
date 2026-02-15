import { useState, useCallback } from 'react';

interface CommandResult {
  id: string;
  command: string;
  status: string;
}

export function useCommand() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (commandName: string) => {
    setRunning(true);
    setError(null);

    try {
      const res = await fetch(`/api/commands/${commandName}`, { method: 'POST' });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || 'Command failed');
        setRunning(false);
        return null;
      }
      setResult(json.data);
      // Command was accepted — reset running state after a delay
      // (server runs it async; we just track the initial submission)
      setRunning(false);
      return json.data;
    } catch (err) {
      setError(String(err));
      setRunning(false);
      return null;
    }
  }, []);

  return { execute, running, result, error };
}
