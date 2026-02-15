import React, { useEffect, useRef } from 'react';

interface CommandOutputProps {
  lines: string[];
  status: 'idle' | 'running' | 'success' | 'error';
  onDismiss?: () => void;
}

export function CommandOutput({ lines, status, onDismiss }: CommandOutputProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  if (lines.length === 0 && status === 'idle') return null;

  return (
    <div className="mt-4 rounded-lg bg-gray-950 border border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            status === 'running' ? 'bg-yellow-400 animate-pulse' :
            status === 'success' ? 'bg-green-400' :
            status === 'error' ? 'bg-red-400' : 'bg-gray-500'
          }`} />
          <span className="text-xs text-gray-400 font-mono">
            {status === 'running' ? 'Running...' : status === 'success' ? 'Completed' : status === 'error' ? 'Failed' : 'Output'}
          </span>
        </div>
        {status !== 'running' && onDismiss && (
          <button onClick={onDismiss} className="text-gray-500 hover:text-gray-300 text-xs">Dismiss</button>
        )}
      </div>
      <div className="p-3 max-h-48 overflow-y-auto font-mono text-xs text-gray-300 whitespace-pre-wrap">
        {lines.map((line, i) => <div key={i}>{line}</div>)}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
