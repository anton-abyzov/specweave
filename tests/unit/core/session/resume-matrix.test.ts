import { describe, it, expect } from 'vitest';
import { TOOL_RESUME_MATRIX } from '../../../../src/core/session/handoff-doc-format.js';
import { detectTool } from '../../../../src/core/tasks/ledger.js';

describe('resume matrix', () => {
  it('has one entry per ledger tool id', () => {
    const ids = TOOL_RESUME_MATRIX.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['claude', 'codex', 'gemini', 'grok', 'muse']));
  });

  it('Grok Build resumes with --resume, per its sessions guide', () => {
    const grok = TOOL_RESUME_MATRIX.find((e) => e.id === 'grok');
    expect(grok?.resumeCmd).toContain('grok --resume <id>');
    expect(grok?.findSession).toContain('~/.grok/sessions/');
  });

  it('Muse Code resumes with muse resume or exec --session-id', () => {
    const muse = TOOL_RESUME_MATRIX.find((e) => e.id === 'muse');
    expect(muse?.resumeCmd).toContain('muse resume');
    expect(muse?.resumeCmd).toContain('muse exec --session-id <uuid>');
  });

  it('the ids match what detectTool writes into the ledger', () => {
    expect(detectTool({ AI_AGENT: 'grok-build_1-0' })).toBe('grok');
    expect(detectTool({ AI_AGENT: 'muse_1-2-1' })).toBe('muse');
    expect(detectTool({ SPECWEAVE_TOOL: 'grok' })).toBe('grok');
    expect(detectTool({ GEMINI_CLI: '1' })).toBe('gemini');
  });
});
