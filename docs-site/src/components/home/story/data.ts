/*
  The example increment every scene in #how plays, in the formats the CLI reads and prints
  (checked against specweave 3.1.21 on November 11, 2026):
  - spec.md: criteria as `- [ ] AC-NN: text` under `## Acceptance Criteria`, tasks as `### T-NN Title`
    plus an `- AC: | Files: | Test:` line (src/core/tasks/verify-runner.ts, parseSpecAcs).
  - ledger.jsonl: one JSON object per line with `t`, `e`, `by`, `at`, plus `evidence` or `note`;
    `handoff` releases claims with note "handoff" and appends a `"t":"*"` handoff event
    (src/core/session/work-handoff.ts).
  - pickup: the real output quoted on /product (codex@laptop after claude@cloud).
  - verify: `ok   <cmd> (exit 0)`, `ACs n/n · tasks n/n done (0 skipped)`, `PASS → <path>`
    (src/cli/commands/verify.ts). review: `Verdict: <verdict> → <report>`; exit 0 ship, 3 fix first
    (src/cli/commands/review.ts). complete refuses without a passing reports/verify.json
    (src/core/tasks/closure-gate.ts).
  The review finding is an invented example; the stages are labelled as illustrations.
*/

export const INCREMENT = '0001-resumable-checkout';
export const TITLE = 'Resumable checkout';

/** spec.md, line by line. `kind` drives the colouring; `at` is the step that types the line. */
export type SpecLine = { text: string; kind: 'h1' | 'h2' | 'ac' | 'task' | 'meta' | 'gap'; at: number };

export const SPEC_LINES: SpecLine[] = [
  { text: `# ${TITLE}`, kind: 'h1', at: 2 },
  { text: '', kind: 'gap', at: 2 },
  { text: '## Acceptance Criteria', kind: 'h2', at: 3 },
  { text: '- [ ] AC-01: Returning within 24 hours restores the cart and shipping choice', kind: 'ac', at: 3 },
  { text: '- [ ] AC-02: A paid order is never restored', kind: 'ac', at: 4 },
  { text: '', kind: 'gap', at: 5 },
  { text: '## Tasks', kind: 'h2', at: 5 },
  { text: '### T-01 Save the cart as a draft', kind: 'task', at: 5 },
  { text: '- AC: AC-01 | Files: src/draft.js | Test: npm test', kind: 'meta', at: 5 },
  { text: '### T-02 Restore the draft on return', kind: 'task', at: 6 },
  { text: '- AC: AC-01, AC-02 | Files: src/restore.js | Test: npm test', kind: 'meta', at: 6 },
];

export type LedgerLine = { t: string; e: string; by: string; at: string; evidence?: string; note?: string };

/** The whole ledger of the example. Scene 2 plays Claude's lines, scene 3 the handoff and Codex's. */
export const LEDGER: LedgerLine[] = [
  { t: 'T-01', e: 'claim', by: 'claude@cloud', at: '2026-10-15T14:02:11Z' },
  { t: 'T-01', e: 'done', by: 'claude@cloud', at: '2026-10-15T14:31:40Z', evidence: 'a41c9e2' },
  { t: 'T-02', e: 'claim', by: 'claude@cloud', at: '2026-10-15T14:32:05Z' },
  { t: 'T-02', e: 'release', by: 'claude@cloud', at: '2026-10-15T14:58:47Z', note: 'handoff' },
  { t: '*', e: 'handoff', by: 'claude@cloud', at: '2026-10-15T14:58:47Z', note: 'usage limit' },
  { t: 'T-02', e: 'claim', by: 'codex@laptop', at: '2026-10-15T15:04:19Z' },
  { t: 'T-02', e: 'done', by: 'codex@laptop', at: '2026-10-15T15:22:51Z', evidence: '7d03b1f' },
];

/** Real `specweave pickup` output in a second clone running as Codex (src/pages/product.tsx). */
export const PICKUP: Array<[string, boolean?]> = [
  ['Picked up the handoff from claude@cloud (out of tokens): applied 7 uncommitted files.'],
  ['SpecWeave pickup · you are codex@laptop'],
  [`Increment ${INCREMENT} "${TITLE}" (active) · tasks 1/2 done`],
  ['Next: T-02 Restore the draft on return', true],
  ['  AC-01: Returning within 24 hours restores the cart and shipping choice'],
  ['  AC-02: A paid order is never restored'],
];

export const VERIFY_LINES: Array<[string, 'ok' | 'sum' | 'pass']> = [
  ['ok   npm test (exit 0)', 'ok'],
  ['ok   npm run lint (exit 0)', 'ok'],
  ['ok   npm run build (exit 0)', 'ok'],
  ['ACs 2/2 · tasks 2/2 done (0 skipped)', 'sum'],
  ['PASS → reports/verify.md', 'pass'],
];

/** Step times in ms from the start of each loop. */
export const PLAN_TIMES = [500, 1700, 2500, 3500, 4500, 5700, 7000] as const;
export const LEDGER_TIMES = [500, 1500, 2700, 3700, 4900, 5900] as const;
export const HANDOFF_TIMES = [500, 2400, 3300, 4500, 5700, 6900, 8500, 9700] as const;
export const GATE_TIMES = [500, 1500, 2700, 4700, 5700, 7300, 8500, 9500] as const;
