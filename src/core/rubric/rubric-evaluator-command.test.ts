/**
 * Tests for the `command` evaluator (0865 T-001 / AC-US1-03).
 *
 * The `command` evaluator runs a criterion's `Verify` shell probe in a
 * sandbox (cwd = repo root, bounded timeout, credential env stripped) and maps
 * exit 0 → pass, non-zero/timeout → fail. It NEVER returns `skip`.
 */

import { describe, it, expect } from 'vitest';
import { evaluateCommandCriterion } from './rubric-evaluator.js';
import type { RubricCriterion } from './types.js';

function makeCriterion(verify: string): RubricCriterion {
  return {
    id: 'R-US1-01',
    title: 'command criterion',
    severity: 'blocking',
    sourceACs: ['AC-US1-01'],
    evaluator: 'command',
    category: 'functional-correctness',
    verify,
    threshold: 'exit 0',
    result: null,
  };
}

describe('evaluateCommandCriterion (0865 AC-US1-03)', () => {
  it('TC-001: exit 0 → pass', () => {
    const result = evaluateCommandCriterion(makeCriterion('exit 0'), {
      cwd: process.cwd(),
    });
    expect(result.status).toBe('pass');
  });

  it('TC-002: exit 1 → fail with captured evidence', () => {
    const result = evaluateCommandCriterion(
      makeCriterion('echo "boom-stderr" 1>&2; echo "boom-stdout"; exit 1'),
      { cwd: process.cwd() },
    );
    expect(result.status).toBe('fail');
    // Evidence captures the command output (stdout and/or stderr tail).
    expect(result.evidence).toMatch(/boom-stdout|boom-stderr|exit/i);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('TC-003: timeout → fail (never skip)', () => {
    // Sleep past a 200ms timeout — must be reported as fail, not skip.
    const result = evaluateCommandCriterion(makeCriterion('sleep 5'), {
      cwd: process.cwd(),
      timeoutMs: 200,
    });
    expect(result.status).toBe('fail');
    expect(result.status).not.toBe('skip');
    expect(result.evidence).toMatch(/timeout|timed out/i);
  });

  it('TC-004: never returns skip for any exit path', () => {
    for (const verify of ['exit 0', 'exit 1', 'exit 42', 'false', 'true']) {
      const result = evaluateCommandCriterion(makeCriterion(verify), {
        cwd: process.cwd(),
        timeoutMs: 5000,
      });
      expect(result.status).not.toBe('skip');
      expect(['pass', 'fail']).toContain(result.status);
    }
  });

  it('strips credential-like env vars before running the probe', () => {
    const prev = process.env.AZURE_DEVOPS_PAT;
    process.env.AZURE_DEVOPS_PAT = 'super-secret-pat';
    try {
      // If the var were passed through, this prints the value and the grep
      // matches → exit 0 (pass). Stripping makes the var empty → grep fails →
      // exit 1 (fail). We assert the var did NOT leak into the child env.
      const result = evaluateCommandCriterion(
        makeCriterion('test -z "$AZURE_DEVOPS_PAT"'),
        { cwd: process.cwd() },
      );
      expect(result.status).toBe('pass');
    } finally {
      if (prev === undefined) delete process.env.AZURE_DEVOPS_PAT;
      else process.env.AZURE_DEVOPS_PAT = prev;
    }
  });

  it('preserves PATH so executables (npx/git/node) resolve in the probe', () => {
    // Regression: `PATH` contains the substring `PAT`. A credential filter without
    // segment boundaries strips PATH → `exit 127: command not found` on every probe.
    const result = evaluateCommandCriterion(
      makeCriterion('test -n "$PATH"'),
      { cwd: process.cwd() },
    );
    expect(result.status).toBe('pass');
  });
});

describe('evaluateRubric dispatch for command evaluator', () => {
  it('routes a command criterion through the command evaluator (no skip)', async () => {
    const { evaluateRubric } = await import('./rubric-evaluator.js');
    const rubric = {
      incrementId: '0865-test',
      title: 'test',
      generated: '',
      source: '',
      version: '1.0',
      status: 'pending',
      criteria: [makeCriterion('exit 0')],
    };
    const evaluated = await evaluateRubric(rubric, process.cwd(), {
      projectRoot: process.cwd(),
    });
    expect(evaluated.criteria[0].result?.status).toBe('pass');
  });
});
