/**
 * Tests for handoff-doc-format (2.0 — Doc format v2).
 *
 * Pins: the canonical section order, the ≤1-page budget, the header (agent id,
 * git, active claims), the ledger table, the footer marker, the per-tool resume
 * strings, and the `--inline` paste-prompt embedding.
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
    docPath: '/repo/.specweave/increments/0867-cross-tool-work-handoff/handoff.md',
    diffPath: '/repo/.specweave/increments/0867-cross-tool-work-handoff/handoff.diff',
    repoRoot: '/repo',
    generatedAt: '2026-06-01T00:00:00.000Z',
    isSpecWeave: true,
    agent: 'codex@mbp',
    reason: 'out of tokens',
    summary: 'mid-refactor of the parser',
    gotcha: 'metadata read lazily creates files — gate with exists()',
    decisions: ['use execFileSync not shell', 'doc-format is the single source of truth'],
    increment: {
      id: '0867-cross-tool-work-handoff',
      status: 'active',
      title: 'Cross-Tool Work Handoff',
      tasks: [
        { id: 'T-01', title: 'workspace detection', status: 'done', by: 'claude@mbp', evidence: 'npm test → exit 0' },
        { id: 'T-02', title: 'increment assembly', status: 'claimed', by: 'codex@mbp' },
        { id: 'T-03', title: 'renderer', status: 'open' },
      ],
      counts: { total: 3, done: 1, skipped: 0, claimed: 1, blocked: 0, stale: 0, open: 1 },
      doneAcs: 5,
      totalAcs: 40,
      nextTask: { id: 'T-03', title: 'renderer', status: 'open' },
    },
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
    for (const idx of indices) expect(idx).toBeGreaterThan(-1);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it('stays within the one-page budget', () => {
    const doc = renderHandoffDoc(baseInput());
    expect(doc.split('\n').length).toBeLessThanOrEqual(60);
  });

  it('headers carry the agent id, git state, redaction count and active claims', () => {
    const doc = renderHandoffDoc(baseInput());
    expect(doc).toContain('# Handoff — 0867-cross-tool-work-handoff Cross-Tool Work Handoff');
    expect(doc).toContain('agent: codex@mbp');
    expect(doc).toContain('branch main @ abc1234');
    expect(doc).toContain('1 uncommitted');
    expect(doc).toContain('redactions: 3');
    expect(doc).toContain('active claims: T-02 (claimed by codex@mbp)');
  });

  it('renders the ledger table with state, owner and evidence', () => {
    const doc = renderHandoffDoc(baseInput());
    expect(doc).toContain('| Task | State | By | Evidence / note |');
    expect(doc).toContain('| T-01 workspace detection | done | claude@mbp | npm test → exit 0 |');
    expect(doc).toContain('1/3 done · 0 skipped · 1 claimed');
    expect(doc).toContain('tasks 1/3 done · ACs 5/40');
  });

  it('shows an uncommitted warning + porcelain + the diff path', () => {
    const doc = renderHandoffDoc(baseInput());
    expect(doc).toContain('UNCOMMITTED');
    expect(doc).toContain('src/core/session/work-handoff.ts');
    expect(doc).toContain('/repo/.specweave/increments/0867-cross-tool-work-handoff/handoff.diff');
  });

  it('reports a clean tree instead of a diff when nothing is uncommitted', () => {
    const doc = renderHandoffDoc(
      baseInput({ git: { ...baseInput().git, statusPorcelain: '', diffStat: '', hasUncommittedChanges: false } }),
    );
    expect(doc).toContain('Working tree clean.');
    expect(doc).not.toContain('UNCOMMITTED');
  });

  it('falls back to `task claim <next>` when no explicit next step was given', () => {
    const doc = renderHandoffDoc(baseInput());
    expect(doc).toContain('specweave task claim T-03 0867-cross-tool-work-handoff');
  });

  it('prefers an explicit next step', () => {
    const doc = renderHandoffDoc(baseInput({ next: 'finish T-03 then run vitest' }));
    expect(doc).toContain('finish T-03 then run vitest');
  });

  it('stamps the Doc format v2 footer marker last', () => {
    const doc = renderHandoffDoc(baseInput());
    expect(DOC_FORMAT_MARKER).toBe('Doc format v2');
    expect(doc.trimEnd().endsWith(`<!-- ${DOC_FORMAT_MARKER} -->`)).toBe(true);
  });

  it('degrades gracefully when there is no increment', () => {
    const doc = renderHandoffDoc(baseInput({ increment: undefined }));
    expect(doc).toContain('# Handoff — no active increment');
    expect(doc).toContain('No active SpecWeave increment');
    expect(doc).toContain('_No task state available._');
  });
});

describe('per-tool resume matrix (pinned strings)', () => {
  it('pins the exact verified resume commands', () => {
    const byTool = new Map(TOOL_RESUME_MATRIX.map((e) => [e.tool, e.resumeCmd]));
    expect(byTool.get('Claude Code')).toBe('claude -r <uuid>');
    expect(byTool.get('Codex')).toContain('codex resume <uuid>');
    expect(byTool.get('Codex')).toContain('codex resume --last');
    expect(byTool.get('Codex')).not.toContain('codex --continue');
    expect(byTool.get('OpenCode')).toContain('opencode -s <id>');
    expect(byTool.get('Gemini CLI')).toBe('/chat resume <tag>');
    expect(byTool.get('Aider')).toBe('aider --restore-chat-history');
  });

  it('documents the Claude munge with an explicit example', () => {
    expect(CLAUDE_MUNGE_EXAMPLE).toContain('specweave-umb--claude-worktrees');
  });

  it('covers all six tools', () => {
    expect(TOOL_RESUME_MATRIX.map((e) => e.tool)).toEqual([
      'Claude Code', 'Codex', 'OpenCode', 'Gemini CLI', 'Antigravity', 'Aider',
    ]);
  });

  it('lists the first three resume commands in the Resume section', () => {
    const doc = renderHandoffDoc(baseInput());
    expect(doc).toContain('claude -r <uuid>');
    expect(doc).toContain('codex resume <uuid>');
    expect(doc).toContain('opencode -s <id>');
  });
});

describe('renderPastePrompt', () => {
  it('default mode points at the doc path and fails safe when missing', () => {
    const p = renderPastePrompt(baseInput());
    expect(p).toContain('/repo/.specweave/increments/0867-cross-tool-work-handoff/handoff.md');
    expect(p).toContain('STOP and ask me to paste the handoff');
    expect(p).toContain('specweave task next 0867-cross-tool-work-handoff');
    expect(p).not.toContain(INLINE_BEGIN_MARKER);
  });

  it('--inline mode embeds the full body between BEGIN/END markers', () => {
    const p = renderPastePrompt(baseInput(), { inline: true });
    expect(p).toContain(INLINE_BEGIN_MARKER);
    expect(p).toContain(INLINE_END_MARKER);
    expect(p).toContain(`<!-- ${DOC_FORMAT_MARKER} -->`);
    expect(p.indexOf(INLINE_BEGIN_MARKER)).toBeLessThan(p.indexOf(INLINE_END_MARKER));
  });
});
