import React, { useState } from 'react';
import clsx from 'clsx';
import Translate, { translate } from '@docusaurus/Translate';
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
      <button type="button" className="wv-cmd__copy" onClick={copy} aria-label={translate({ id: 'install.copy.ariaLabel', message: 'Copy installation command', description: 'Accessible label of the button that copies the npm install command' })}>{state === 'copied'
        ? <Translate id="install.copy.done" description="Copy button text after the install command was copied">Copied</Translate>
        : <Translate id="install.copy.button" description="Copy button text next to the install command">Copy</Translate>}</button>
    </div>
    <span className={h.copyStatus} role="status">
      {state === 'error'
        ? translate({ id: 'install.copy.error', message: 'Copy unavailable. Select the command above.', description: 'Status line when copying the install command to the clipboard failed' })
        : state === 'copied'
          ? translate({ id: 'install.copy.success', message: 'Installation command copied.', description: 'Status line after the install command was copied to the clipboard' })
          : hint}
    </span>
  </div>;
}
