import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import landing from './Landing.module.css';
import styles from './Layers.module.css';

/** Harnesses with a mark in /img/studio/providers/; the rest are named in text. */
const HARNESS_MARKS: [file: string, name: string][] = [
  ['claude', 'Claude Code'],
  ['openai', 'Codex'],
  ['copilot', 'GitHub Copilot'],
  ['gemini', 'Gemini CLI'],
  ['cursor', 'Cursor'],
  ['opencode', 'OpenCode'],
];
const MORE_HARNESSES = 'Grok Build, Pi, Antigravity and agents from the ACP Registry';
const MODELS = ['Claude', 'GPT', 'Gemini', 'Grok', 'open-weight models'];
const ADDS = ['A coordinator that keeps the brief', 'Worker threads on any harness', 'Handoffs across your machines', 'Shared tools: one harness can start another'];

/** Interface, harness, model: where SpecWithCode sits, and what each layer owns. */
export default function Layers() {
  const base = useBaseUrl('/img/studio/providers/');
  return <section id="layers" className={styles.layers} aria-labelledby="layers-title">
    <div className={clsx(styles.head, landing.reveal)}>
      <p className={styles.kicker}>Interface, harness, model</p>
      <h2 id="layers-title">Your agents stay native. SpecWithCode is the interface on top.</h2>
      <p>A coding agent has three layers. SpecWithCode works at the top one, so each harness keeps its own sign-in, tools, skills and session history, and you change harness without changing how you work.</p>
    </div>
    <ol className={styles.stack}>
      <li className={clsx(styles.layer, styles.interface, landing.reveal)} style={{'--i': 0} as React.CSSProperties}>
        <span className={styles.tag}>Interface</span>
        <div className={styles.body}>
          <h3>SpecWithCode</h3>
          <p>What you touch: one window for every coding agent on every machine you own. It runs no agent loop of its own.</p>
          <ul className={styles.adds} aria-label="What SpecWithCode adds">
            {ADDS.map(a => <li key={a}>{a}</li>)}
          </ul>
        </div>
      </li>
      <li className={clsx(styles.layer, landing.reveal)} style={{'--i': 1} as React.CSSProperties}>
        <span className={styles.tag}>Harness</span>
        <div className={styles.body}>
          <h3>The agent you already use</h3>
          <p>Runs the agent loop, calls the tools and keeps the session.</p>
          <ul className={styles.marks} aria-label="Supported harnesses">
            {HARNESS_MARKS.map(([file, name]) => <li key={name}><img src={`${base}${file}.svg`} alt="" width="24" height="24" data-mark={file} /><span>{name}</span></li>)}
          </ul>
          <p className={styles.more}>Also {MORE_HARNESSES}.</p>
        </div>
      </li>
      <li className={clsx(styles.layer, landing.reveal)} style={{'--i': 2} as React.CSSProperties}>
        <span className={styles.tag}>Model</span>
        <div className={styles.body}>
          <h3>The LLM behind it</h3>
          <p>Writes the responses. Your plan or API key decides which models you get and who bills you.</p>
          <ul className={styles.models} aria-label="Model families">
            {MODELS.map(m => <li key={m}>{m}</li>)}
          </ul>
        </div>
      </li>
    </ol>
    <p className={styles.fine}>The model name alone does not decide billing: Claude through Copilot uses your Copilot plan. <Link className="wv-link" to="/docs/studio/harnesses/">Harnesses, models and the interface</Link></p>
  </section>;
}
