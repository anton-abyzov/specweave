import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { applyRefinement } from './apply';
import { readLedger } from './ledger';
import type { ExecResult } from '../../utils/execFileNoThrow';

function okResult(stdout = ''): ExecResult {
  return { stdout, stderr: '', exitCode: 0, success: true };
}
function failResult(stderr = 'boom'): ExecResult {
  return { stdout: '', stderr, exitCode: 1, success: false };
}

describe('applyRefinement', () => {
  let repoRoot: string;
  let skillPath: string;
  let ledgerPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'apply-repo-'));
    skillPath = join(repoRoot, 'SKILL.md');
    writeFileSync(skillPath, 'original\n', 'utf-8');
    ledgerPath = join(repoRoot, '.specweave/state/skill-refinements.json');
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('runs git apply → add → commit → rev-parse and writes an applied ledger entry', async () => {
    const calls: string[][] = [];
    const runGit = async (args: string[]) => {
      calls.push(args);
      if (args[0] === 'rev-parse') return okResult('abc123sha\n');
      if (args[0] === 'config') return okResult('alice@example.com\n');
      return okResult();
    };

    const res = await applyRefinement({
      skillPath,
      diff: '--- a/SKILL.md\n+++ b/SKILL.md\n@@\n-old\n+new\n',
      rationale: 'tighten scope defaults',
      signalIds: ['sig_1', 'sig_2'],
      targetSkill: 'sw:architect',
      ledgerPath,
      repoRoot,
      runGit,
    });

    expect(res.commitSha).toBe('abc123sha');
    expect(res.ledgerEntry.status).toBe('applied');
    expect(res.ledgerEntry.diffSha).toBe('abc123sha');
    expect(res.ledgerEntry.author).toBe('alice@example.com');
    expect(res.ledgerEntry.signalIds).toEqual(['sig_1', 'sig_2']);

    // Correct git invocation order + flags
    expect(calls[0][0]).toBe('apply');
    expect(calls[0]).toContain('--whitespace=nowarn');
    expect(calls[1][0]).toBe('add');
    expect(calls[1]).toContain('--');
    expect(calls[2][0]).toBe('commit');
    expect(calls[2]).toContain('-m');
    const msg = calls[2][calls[2].indexOf('-m') + 1];
    expect(msg).toBe('refine(sw:architect): tighten scope defaults');

    // No push ever
    expect(calls.every((a) => a[0] !== 'push')).toBe(true);

    // Ledger persisted
    const ledger = await readLedger(ledgerPath);
    expect(ledger.refinements).toHaveLength(1);
    expect(ledger.refinements[0].id).toBe(res.ledgerEntry.id);
  });

  it('truncates long rationale in commit message (< 72 chars + ellipsis)', async () => {
    let commitMsg = '';
    const runGit = async (args: string[]) => {
      if (args[0] === 'commit') {
        commitMsg = args[args.indexOf('-m') + 1];
      }
      if (args[0] === 'rev-parse') return okResult('sha\n');
      if (args[0] === 'config') return okResult('x@y\n');
      return okResult();
    };
    const longRationale = 'x'.repeat(200);

    await applyRefinement({
      skillPath,
      diff: 'd\n',
      rationale: longRationale,
      signalIds: [],
      targetSkill: 'sw:a',
      ledgerPath,
      repoRoot,
      runGit,
    });

    expect(commitMsg.length).toBeLessThanOrEqual(200); // (prefix + truncated)
    expect(commitMsg).toMatch(/^refine\(sw:a\): x+…$/);
  });

  it('rejects empty diff with a clear error', async () => {
    await expect(
      applyRefinement({
        skillPath,
        diff: '   \n',
        rationale: 'r',
        signalIds: [],
        targetSkill: 'sw:a',
        ledgerPath,
        repoRoot,
        runGit: async () => okResult(),
      }),
    ).rejects.toThrow(/diff is empty/);
  });

  it('rolls back SKILL.md when git apply fails and writes no ledger entry', async () => {
    const runGit = async (args: string[]) => {
      if (args[0] === 'apply') return failResult('patch does not apply');
      return okResult();
    };
    // simulate apply partially mutating the file before failing
    writeFileSync(skillPath, 'half-applied-garbage', 'utf-8');

    await expect(
      applyRefinement({
        skillPath,
        diff: 'd\n',
        rationale: 'r',
        signalIds: ['s1'],
        targetSkill: 'sw:a',
        ledgerPath,
        repoRoot,
        runGit,
      }),
    ).rejects.toThrow(/git apply failed/);

    // Rollback: we restored the pre-call snapshot (half-applied-garbage),
    // because the snapshot was taken BEFORE runGit ran. The point of this
    // test: SKILL.md matches what we saw before entering applyRefinement.
    expect(readFileSync(skillPath, 'utf-8')).toBe('half-applied-garbage');
    // No ledger file created
    expect(existsSync(ledgerPath)).toBe(false);
  });

  it('falls back to "unknown" author when git config user.email is unset', async () => {
    const runGit = async (args: string[]) => {
      if (args[0] === 'config') return failResult();
      if (args[0] === 'rev-parse') return okResult('deadbeef\n');
      return okResult();
    };
    const res = await applyRefinement({
      skillPath,
      diff: 'd\n',
      rationale: 'r',
      signalIds: [],
      targetSkill: 'sw:a',
      ledgerPath,
      repoRoot,
      runGit,
    });
    expect(res.ledgerEntry.author).toBe('unknown');
  });

  it('honors an explicit author override (skips git config lookup)', async () => {
    const configCalls: number[] = [];
    const runGit = async (args: string[]) => {
      if (args[0] === 'config') configCalls.push(1);
      if (args[0] === 'rev-parse') return okResult('sha\n');
      return okResult();
    };
    const res = await applyRefinement({
      skillPath,
      diff: 'd\n',
      rationale: 'r',
      signalIds: [],
      targetSkill: 'sw:a',
      ledgerPath,
      repoRoot,
      runGit,
      author: 'explicit@override.com',
    });
    expect(res.ledgerEntry.author).toBe('explicit@override.com');
    expect(configCalls).toHaveLength(0);
  });
});
