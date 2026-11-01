import React from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {Cloud, User} from 'lucide-react';
import styles from './Harness.module.css';

/*
  Illustration for /code#harnesses: SpecWithCode is the interface, the vendors' own
  harnesses do the work underneath, and each harness talks to its own model provider.
  The harness list follows the provider adapters named in docs/overview/studio.mdx;
  keep the two in step.
*/

type Harness = {name: string; how: string; logo?: string};

export const HARNESSES: Harness[] = [
  {name: 'Claude Code', how: 'Native CLI', logo: 'claude'},
  {name: 'Codex', how: 'Native CLI', logo: 'openai'},
  {name: 'GitHub Copilot', how: 'Copilot CLI over ACP'},
  {name: 'Cursor', how: 'Official SDK', logo: 'cursor'},
  {name: 'Gemini CLI', how: 'ACP'},
  {name: 'Grok Build', how: 'Native CLI'},
  {name: 'OpenCode', how: 'Native CLI', logo: 'opencode'},
  {name: 'ACP Registry', how: 'Any listed agent'},
];

const LAYER: string[] = ['Coordinator', 'Worker threads', 'Usage limits', 'Machines', 'Browser and desktop', 'Specs in git'];

/** A provider mark on a small tile, or the harness's initial where no mark ships with the site. */
function Logo({file, name}: {file?: string; name: string}) {
  const base = useBaseUrl('/img/studio/providers/');
  if (!file) return <span className={styles.mono} aria-hidden="true">{name[0]}</span>;
  return <img className={clsx(styles.logo, (file === 'openai' || file === 'cursor') && styles.plate)} src={`${base}${file}.svg`} alt="" width="26" height="26" />;
}

/** Illustration: you, SpecWithCode as the interface, the native harnesses, then the model providers. */
export default function HarnessStack() {
  return <figure className={styles.stack}>
    <ol className={styles.layers} aria-label="Illustration: you talk to SpecWithCode; SpecWithCode drives each vendor's own coding harness; each harness talks to its own model provider">
      <li className={clsx(styles.layer, styles.you)}>
        <span className={styles.tier}>You</span>
        <p className={styles.layerBody}><User size={16} strokeWidth={1.75} aria-hidden="true" />Give the goal, answer decisions, review the result: from the desktop app, a browser or your phone.</p>
      </li>
      <li className={clsx(styles.layer, styles.app)}>
        <span className={styles.tier}>SpecWithCode<small>the interface</small></span>
        <ul className={styles.chips}>{LAYER.map(t => <li key={t}>{t}</li>)}</ul>
      </li>
      <li className={clsx(styles.layer, styles.harness)}>
        <span className={styles.tier}>Native harnesses<small>do the work</small></span>
        <ul className={styles.harnesses}>
          {HARNESSES.map(h => <li key={h.name}><Logo file={h.logo} name={h.name} /><span><strong>{h.name}</strong><em>{h.how}</em></span></li>)}
        </ul>
      </li>
      <li className={clsx(styles.layer, styles.cloud)}>
        <span className={styles.tier}>Model providers</span>
        <p className={styles.layerBody}><Cloud size={16} strokeWidth={1.75} aria-hidden="true" />Each harness signs in and talks to its own provider, from the machine it runs on.</p>
      </li>
    </ol>
    <figcaption><span className={styles.illo}>Illustration</span> SpecWithCode sits on top of the harnesses. It does not replace their agent loop, tools or sign-in.</figcaption>
  </figure>;
}
