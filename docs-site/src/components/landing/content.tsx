import React from 'react';
import styles from './landing.module.css';

/**
 * Art for the 3.0 landing page. Generated with Kie.ai in the house style
 * (paper, charcoal frames, one orange ribbon). Beats fall back to a CSS plate.
 */
export const art = {
  hero: '/img/v3/hero.webp',
  ribbon: '/img/v3/ribbon.webp' as string | null,
  beats: ['/img/v3/beat-spec.webp', '/img/v3/beat-task.webp', '/img/v3/beat-handoff.webp', '/img/v3/beat-pickup.webp'] as (string | null)[],
  threads: '/img/v3/threads.webp' as string | null,
  lean: '/img/v3/lean.webp' as string | null,
};

/**
 * A recorded, real handoff between tools, published under static/evidence/.
 * Set this once docs-site/static/evidence/handoff-3.0.html exists; the story shows it after the last beat.
 */
export const handoffEvidence: { href: string; summary: string } | null = null;

export const tools = ['Claude Code', 'Claude Code Projects', 'Codex', 'Grok Build', 'Cursor', 'Gemini CLI', 'GitHub Copilot', 'OpenCode'];

function Term({ lines }: { lines: [string, string?][] }) {
  return <pre className={styles.term}>{lines.map(([text, kind], i) =>
    <span key={i} className={kind ? styles[`t_${kind}`] : undefined}>{text}{'\n'}</span>)}</pre>;
}

export type Beat = {
  id: string;
  label: string;
  title: React.ReactNode;
  body: React.ReactNode;
  file: string;
  panel: React.ReactNode;
};

export const beats: Beat[] = [
  {
    id: 'spec',
    label: 'Write it down once',
    title: <>One file says<br /><em>what done means.</em></>,
    body: <>Each piece of work is a single <code>spec.md</code>: the problem, the scope, acceptance criteria, the approach and the tasks. No second file to keep in sync, and SpecWeave never writes state back into it.</>,
    file: '.specweave/increments/0042-checkout-recovery/spec.md',
    panel: <Term lines={[
      ['# Keep checkout resumable', 'h'],
      ['## Problem', 'k'],
      ['A customer who leaves checkout loses their choices.'],
      ['## Acceptance Criteria', 'k'],
      ['- [ ] AC-01: Returning within 24h restores the cart'],
      ['- [ ] AC-02: A paid order is never restored'],
      ['## Tasks', 'k'],
      ['### T-01 Save the checkout draft', 'h'],
      ['- AC: AC-01 | Files: src/checkout/draft.ts | Test: npm test -- draft'],
      ['### T-02 Restore it on return', 'h'],
      ['- AC: AC-01, AC-02 | Files: src/checkout/restore.ts | Test: npm test -- restore'],
    ]} />,
  },
  {
    id: 'task',
    label: 'Work one task at a time',
    title: <>Each task arrives<br /><em>with its criteria.</em></>,
    body: <>The CLI gives the agent the next task with the text of the acceptance criteria it covers, its files and its test, so it reads a few lines instead of the whole spec again. A criterion is met when every task that covers it is done.</>,
    file: 'terminal · Claude Code',
    panel: <Term lines={[
      ['$ specweave task next', 'p'],
      ['T-02 Restore it on return', 'h'],
      ['  AC-01: Returning within 24h restores the cart'],
      ['  AC-02: A paid order is never restored'],
      ['  Files: src/checkout/restore.ts | Test: npm test -- restore'],
      [''],
      ['$ specweave task claim T-02', 'p'],
      ['Claimed T-02 as claude@laptop', 'ok'],
      [''],
      ['$ specweave task done T-02 --run "npm test -- restore"', 'p'],
      ['Done T-02 (2/3)', 'ok'],
    ]} />,
  },
  {
    id: 'handoff',
    label: 'Hit a limit',
    title: <>Out of tokens?<br /><em>Hand it off.</em></>,
    body: <>Tell your agent to hand off, or run <code>specweave handoff</code>. It releases your task claims, records where you stopped, and pushes your branch and a snapshot of your uncommitted edits to git. Nothing to copy, nothing to paste. With <code>specweave auto-handoff on</code>, Claude Code and Codex do it on their own at 90% of the limit.</>,
    file: 'terminal · Claude Code',
    panel: <Term lines={[
      ['$ specweave handoff', 'p'],
      ['Released your claims on T-03 so the next agent can take them.', 'ok'],
      ['Pushed feature/checkout-recovery.', 'ok'],
      ['Pushed uncommitted edits to wip/feature/checkout-recovery.', 'ok'],
    ]} />,
  },
  {
    id: 'pickup',
    label: 'Continue anywhere',
    title: <>Another tool.<br /><em>Same place.</em></>,
    body: <>In Codex, Grok, Cursor or a second Claude subscription, <code>specweave pickup</code> fetches the handoff, applies your edits, and prints everything the new session needs in one read: the increment, the next task and its criteria, notes and project memory.</>,
    file: 'terminal · Codex',
    panel: <Term lines={[
      ['$ specweave pickup', 'p'],
      ['SpecWeave pickup · you are codex@laptop', 'h'],
      ['Picked up the handoff from claude@laptop.', 'ok'],
      ['Increment 0042 "Keep checkout resumable" (active)'],
      ['Next: T-03 Drop drafts after payment', 'h'],
      ['  AC-02: A paid order is never restored'],
      ['Notes:'],
      ['- claude@laptop 5m ago: restore works; expiry not started'],
      ['Memory (.specweave/memory/MEMORY.md):'],
    ]} />,
  },
];

export const mapping: [string, string][] = [
  ['A project', 'AGENTS.md and the project goal'],
  ['Project memory', '.specweave/memory/, committed with the code'],
  ['A thread', 'One increment: one branch, one pull request'],
  ['The thread checklist', 'The Tasks section of that spec.md'],
  ['A note to another thread', 'A note in the other increment\'s ledger'],
];

export const stats: { value: number; prefix?: string; unit: string; label: string; was: string }[] = [
  { value: 700, prefix: '~', unit: 'tokens', label: 'One instruction file, AGENTS.md', was: 'Was about 3,300 across CLAUDE.md and AGENTS.md' },
  { value: 1, unit: 'file', label: 'Per increment', was: 'Was spec.md, tasks.md and often plan.md' },
  { value: 1, unit: 'read', label: 'To resume in a new tool', was: 'Was 4 to 5 files the next tool had to find' },
  { value: 11, unit: 'skills', label: 'One source for every tool', was: 'Was 12 plugin skills and 6 portable ones that drifted' },
];
