import React, { useState } from 'react';
import clsx from 'clsx';
import h from './home.module.css';

export const INSTALL = 'npm install -g specweave';

/** The CLI install command with a copy button and a live status line. */
export default function InstallCommand({ hint, className }: { hint?: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  async function copy() {
    try { await navigator.clipboard.writeText(INSTALL); setState('copied'); }
    catch { setState('error'); }
  }
  return <div className={clsx(h.install, className)}>
    <div className={clsx('wv-cmd', h.cmd)}>
      <code>{INSTALL}</code>
      <button type="button" className="wv-cmd__copy" onClick={copy} aria-label="Copy installation command">{state === 'copied' ? 'Copied' : 'Copy'}</button>
    </div>
    <span className={h.copyStatus} role="status">
      {state === 'error' ? 'Copy unavailable. Select the command above.' : state === 'copied' ? 'Installation command copied.' : hint}
    </span>
  </div>;
}
