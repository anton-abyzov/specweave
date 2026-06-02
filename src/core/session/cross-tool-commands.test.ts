/**
 * Cross-tool resume command pin test (T-016, AC-US5-01, AC-US5-02, AC-US5-05).
 *
 * The per-tool resume matrix in handoff-doc-format.ts encodes VERIFIED CLI
 * invocation strings (the exact flags each tool actually accepts). These flags
 * drift when the upstream CLIs change, and a silent drift would hand a resuming
 * agent a command that no longer works. This test pins one resume command +
 * one "find your session" path per tool so any edit to TOOL_RESUME_MATRIX that
 * changes a known-good string fails at build time.
 *
 * Specifically guards the two flags most prone to munge:
 *   - Claude: the `~/.claude/projects/<munged-cwd>/` directory munge, where every
 *     non-alphanumeric char becomes "-" and runs are NOT collapsed (so `/.`
 *     yields a double dash). Pinned via CLAUDE_MUNGE_EXAMPLE.
 *   - OpenCode: the short `-s` flag (NOT `--session-id`, NOT `--resume`).
 *   - Codex: `resume <uuid>` / `resume --last` — explicitly NOT `--continue`.
 *
 * Part of increment 0867: Cross-Tool Work Handoff.
 */

import { describe, it, expect } from 'vitest';
import {
  TOOL_RESUME_MATRIX,
  CLAUDE_MUNGE_EXAMPLE,
  type ToolResumeEntry,
} from './handoff-doc-format.js';

function entry(tool: string): ToolResumeEntry {
  const found = TOOL_RESUME_MATRIX.find((e) => e.tool === tool);
  if (!found) {
    throw new Error(
      `TOOL_RESUME_MATRIX is missing an entry for "${tool}" — the cross-tool ` +
        `resume matrix changed. Update this pin test deliberately if that was intended.`,
    );
  }
  return found;
}

describe('cross-tool resume command matrix (pinned)', () => {
  it('covers exactly the six supported tools, in order', () => {
    expect(TOOL_RESUME_MATRIX.map((e) => e.tool)).toEqual([
      'Claude Code',
      'Codex',
      'OpenCode',
      'Gemini CLI',
      'Antigravity',
      'Aider',
    ]);
  });

  it('Claude Code: `claude -r <uuid>` + the cwd-munge directory rule', () => {
    const e = entry('Claude Code');
    expect(e.resumeCmd).toContain('claude -r <uuid>');
    // Munge: every non-alphanumeric char → "-", runs NOT collapsed.
    expect(e.findSession).toContain('~/.claude/projects/');
    expect(e.findSession).toContain(CLAUDE_MUNGE_EXAMPLE);
    // The signature double-dash from the `/.` boundary must survive.
    expect(CLAUDE_MUNGE_EXAMPLE).toContain('specweave-umb--claude-worktrees');
  });

  it('Codex: `resume <uuid>` and `resume --last`, never `--continue`', () => {
    const e = entry('Codex');
    expect(e.resumeCmd).toContain('codex resume <uuid>');
    expect(e.resumeCmd).toContain('codex resume --last');
    expect(e.resumeCmd).not.toContain('--continue');
    expect(e.findSession).toContain('~/.codex/sessions/');
  });

  it('OpenCode: short `-s` flag (with `--session` long form)', () => {
    const e = entry('OpenCode');
    expect(e.resumeCmd).toContain('opencode -s <id>');
    expect(e.resumeCmd).toContain('opencode --session <id>');
    // Guard against the two wrong flags it is easy to "fix" this into.
    expect(e.resumeCmd).not.toContain('--session-id');
    expect(e.resumeCmd).not.toContain('--resume');
    expect(e.findSession).toContain('opencode sessions list');
  });

  it('Gemini CLI: `/chat resume <tag>`', () => {
    const e = entry('Gemini CLI');
    expect(e.resumeCmd).toContain('/chat resume <tag>');
    expect(e.findSession).toContain('/chat list');
  });

  it('Antigravity: Agent Manager thread instruction', () => {
    const e = entry('Antigravity');
    expect(e.resumeCmd).toMatch(/Antigravity Agent Manager/i);
    expect(e.findSession).toMatch(/Antigravity Agent Manager/i);
  });

  it('Aider: `aider --restore-chat-history`', () => {
    const e = entry('Aider');
    expect(e.resumeCmd).toContain('aider --restore-chat-history');
    expect(e.findSession).toContain('.aider.chat.history.md');
  });

  it('every entry has non-empty tool / findSession / resumeCmd fields', () => {
    for (const e of TOOL_RESUME_MATRIX) {
      expect(e.tool.trim().length).toBeGreaterThan(0);
      expect(e.findSession.trim().length).toBeGreaterThan(0);
      expect(e.resumeCmd.trim().length).toBeGreaterThan(0);
    }
  });
});
