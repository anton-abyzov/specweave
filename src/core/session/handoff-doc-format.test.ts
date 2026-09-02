/**
 * Tests for handoff-doc-format (T-001 + T-017 parity / section-order pinning)
 *
 * Verifies the rendered doc contains every required section in canonical
 * order, the path/link/diff header lines, the per-tool resume matrix, the
 * Redaction section with counts + heuristic disclaimer, the Doc format v1
 * footer, and the --inline paste-prompt embedding the full body between
 * BEGIN/END HANDOFF markers. The cross-tool resume strings are pinned here so
 * they cannot silently drift.
 */

import { describe, it, expect } from 'vitest';
import {
  renderHandoffDoc,
  renderPastePrompt,
  HANDOFF_SECTION_ORDER,
  TOOL_RESUME_MATRIX,
  DOC_FORMAT_MARKER,
  INLINE_BEGIN_MARKER,
  INLINE_END_MARKER,
  CLAUDE_MUNGE_EXAMPLE,
  type HandoffDocInput,
} from './handoff-doc-format.js';

function baseInput(overrides: Partial<HandoffDocInput> = {}): HandoffDocInput {
  return {
    docPath: '/repo/.specweave/state/handoff-latest.md',
    diffPath: '/repo/.specweave/state/handoff-latest.diff',
    repoRoot: '/repo',
    generatedAt: '2026-06-01T00:00:00.000Z',
    isSpecWeave: true,
    reason: 'out of tokens',
    summary: 'mid-refactor of the parser',
    next: 'finish T-005 then run vitest',
    gotcha: 'metadata read lazily creates files — gate with exists()',
    decisions: ['use execFileSync not shell', 'doc-format is the single source of truth'],
    increment: {
      id: '0867-cross-tool-work-handoff',
      status: 'active',
      title: 'Cross-Tool Work Handoff',
      currentTask: 'T-004: workspace detection',
      nextTask: 'T-005: increment assembly',
      doneTasks: 3,
      totalTasks: 18,
      taskPercentage: 17,
      doneAcs: 5,
      totalAcs: 40,
      acSyncEvents: ['2026-05-30: 2 ACs updated, 0 conflicts'],
    },
    ambient: { testMode: 'TDD', coverageTarget: 90, wipLimit: 7 },
    git: {
      isGitRepo: true,
      branch: 'main',
      shortSha: 'abc1234',
      statusPorcelain: ' M src/core/session/work-handoff.ts',
      diffStat: ' src/core/session/work-handoff.ts | 10 ++++',
      hasUncommittedChanges: true,
    },
    redactionCounts: { 'openai-key': 2, bearer: 1 },
    ...overrides,
  };
}

describe('renderHandoffDoc', () => {
  it('renders all canonical sections in order', () => {
    const doc = renderHandoffDoc(baseInput());
    const indices = HANDOFF_SECTION_ORDER.map((h) => doc.indexOf(`## ${h}`));
    // Every section present.
    for (const idx of indices) expect(idx).toBeGreaterThan(-1);
    // Monotonically increasing → canonical order preserved.
    const sorted = [...indices].sort((a, b) => a - b);
    expect(indices).toEqual(sorted);
  });

  it('leads with the absolute doc path, a clickable link, and the diff path', () => {
    const doc = renderHandoffDoc(baseInput());
    expect(doc).toContain('- Doc path: /repo/.specweave/state/handoff-latest.md');
    expect(doc).toContain('[/repo/.specweave/state/handoff-latest.md](/repo/.specweave/state/handoff-latest.md)');
    expect(doc).toContain('- Diff file: /repo/.specweave/state/handoff-latest.diff');
  });

  it('shows task/AC counts, percentage, acSyncEvents drift, and ambient rules', () => {
    const doc = renderHandoffDoc(baseInput());
    expect(doc).toContain('Tasks: 3/18 done (17%)');
    expect(doc).toContain('ACs: 5/40 checked');
    expect(doc).toContain('2026-05-30: 2 ACs updated, 0 conflicts');
    expect(doc).toContain('Test mode: TDD');
    expect(doc).toContain('Coverage target: 90%');
    expect(doc).toContain('Active increments (advisory): 7');
  });

  it('shows an uncommitted warning + porcelain + diff-stat + diff path link', () => {
    const doc = renderHandoffDoc(baseInput());
    expect(doc).toContain('UNCOMMITTED');
    expect(doc).toContain('src/core/session/work-handoff.ts');
    expect(doc).toContain('/repo/.specweave/state/handoff-latest.diff');
    expect(doc).toContain('git apply --check');
  });

  it('renders the Redaction section with counts and the heuristic disclaimer', () => {
    const doc = renderHandoffDoc(baseInput());
    expect(doc).toMatch(/2 `openai-key` strings masked/);
    expect(doc).toMatch(/1 `bearer` string masked/);
    expect(doc).toContain('Scrubbing is heuristic');
    expect(doc).toContain('NOT a');
  });

  it('notes a clean redaction list when nothing was masked', () => {
    const doc = renderHandoffDoc(baseInput({ redactionCounts: {} }));
    expect(doc).toContain('No token-like strings were detected');
  });

  it('stamps the Doc format v1 footer marker last', () => {
    const doc = renderHandoffDoc(baseInput());
    expect(doc).toContain(DOC_FORMAT_MARKER);
    expect(doc.trimEnd().endsWith(`<!-- ${DOC_FORMAT_MARKER} -->`)).toBe(true);
  });

  it('degrades to git+interview wording when there is no increment', () => {
    const doc = renderHandoffDoc(baseInput({ increment: undefined }));
    expect(doc).toContain('git + interview handoff');
    expect(doc).toContain('No increment task/AC state available');
  });
});

describe('per-tool resume matrix (pinned strings)', () => {
  it('contains the exact verified resume commands', () => {
    const doc = renderHandoffDoc(baseInput());
    expect(doc).toContain('claude -r <uuid>');
    expect(doc).toContain('codex resume <uuid>');
    expect(doc).toContain('codex resume --last');
    expect(doc).not.toContain('codex --continue');
    expect(doc).toContain('opencode -s <id>');
    expect(doc).toContain('opencode --session <id>');
    expect(doc).toContain('/chat resume <tag>');
    expect(doc).toContain('Antigravity Agent Manager');
    expect(doc).toContain('aider --restore-chat-history');
  });

  it('documents the Claude double-dash munge with an explicit example', () => {
    const doc = renderHandoffDoc(baseInput());
    expect(CLAUDE_MUNGE_EXAMPLE).toContain('specweave-umb--claude-worktrees');
    expect(doc).toContain('specweave-umb--claude-worktrees');
  });

  it('covers all six tools', () => {
    const tools = TOOL_RESUME_MATRIX.map((e) => e.tool);
    expect(tools).toEqual(['Claude Code', 'Codex', 'OpenCode', 'Gemini CLI', 'Antigravity', 'Aider']);
  });
});

describe('renderPastePrompt', () => {
  it('default mode points at the doc path and fails safe when missing', () => {
    const p = renderPastePrompt(baseInput());
    expect(p).toContain('/repo/.specweave/state/handoff-latest.md');
    expect(p).toContain('STOP and ask me to paste the handoff');
    expect(p).not.toContain(INLINE_BEGIN_MARKER);
  });

  it('--inline mode embeds the full scrubbed body between BEGIN/END markers', () => {
    const p = renderPastePrompt(baseInput(), { inline: true });
    expect(p).toContain(INLINE_BEGIN_MARKER);
    expect(p).toContain(INLINE_END_MARKER);
    // The full doc (with its footer marker) is embedded.
    expect(p).toContain(`<!-- ${DOC_FORMAT_MARKER} -->`);
    const begin = p.indexOf(INLINE_BEGIN_MARKER);
    const end = p.indexOf(INLINE_END_MARKER);
    expect(begin).toBeLessThan(end);
  });
});
