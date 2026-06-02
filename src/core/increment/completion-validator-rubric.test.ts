/**
 * Closure-gating tests for the rubric engine (0865 T-003 / AC-US1-04).
 *
 * A failed BLOCKING criterion (any evaluator, including `command`) must block
 * closure (land in the error gate). A failed ADVISORY criterion is reported but
 * must NOT block closure.
 *
 * Drives the real IncrementCompletionValidator against a temp project so the
 * full read-side path (root rubric.md → merge → evaluate → summarize → gate)
 * is exercised. The fixture passes every OTHER gate so the rubric is the sole
 * source of any blocking error.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fsp from 'fs/promises';
import { IncrementCompletionValidator } from './completion-validator.js';
import { silentLogger } from '../../utils/logger.js';

const INCREMENT_ID = '0001-rubric-gate-fixture';

const SPEC = `---
increment: ${INCREMENT_ID}
title: "Rubric Gate Fixture"
---

# Feature: Rubric Gate Fixture

### US-001: Story

**Acceptance Criteria**:
- [x] **AC-US1-01**: It works.
`;

const TASKS = `# Tasks

### T-001: Implement it
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given X → When Y → Then Z
`;

const CONFIG = JSON.stringify({
  rubric: { required: true },
  coverageTarget: 0,
}, null, 2);

function rubricWith(criterionBlock: string): string {
  return `---
increment: ${INCREMENT_ID}
title: "Rubric Gate Fixture"
generated: "2026-06-01T00:00:00.000Z"
source: spec.md
version: "1.0"
status: pending
---

# Rubric

## Functional Correctness

${criterionBlock}
`;
}

const FAILING_BLOCKING_COMMAND = `### R-US1-01: It works [blocking]
- **Source**: AC-US1-01
- **Evaluator**: command
- **Verify**: exit 1
- **Threshold**: exit 0
- **Result**: [ ] PENDING
`;

const FAILING_ADVISORY_COMMAND = `### R-US1-02: Advisory probe [advisory]
- **Source**: AC-US1-01
- **Evaluator**: command
- **Verify**: exit 1
- **Threshold**: exit 0
- **Result**: [ ] PENDING

### R-US1-03: Passing blocking probe [blocking]
- **Source**: AC-US1-01
- **Evaluator**: command
- **Verify**: exit 0
- **Threshold**: exit 0
- **Result**: [ ] PENDING
`;

describe('IncrementCompletionValidator rubric gating (0865 AC-US1-04)', () => {
  let root: string;
  let prevCwd: string;
  let incrementPath: string;

  beforeEach(async () => {
    prevCwd = process.cwd();
    root = await fsp.mkdtemp(path.join(os.tmpdir(), 'rubric-gate-'));
    const specweave = path.join(root, '.specweave');
    incrementPath = path.join(specweave, 'increments', INCREMENT_ID);
    await fsp.mkdir(path.join(incrementPath, 'reports'), { recursive: true });
    await fsp.writeFile(path.join(specweave, 'config.json'), CONFIG, 'utf-8');
    await fsp.writeFile(path.join(incrementPath, 'spec.md'), SPEC, 'utf-8');
    await fsp.writeFile(path.join(incrementPath, 'tasks.md'), TASKS, 'utf-8');
    process.chdir(root);
  });

  afterEach(async () => {
    process.chdir(prevCwd);
    await fsp.rm(root, { recursive: true, force: true });
  });

  it('TC-007: failing blocking command criterion blocks closure', async () => {
    await fsp.writeFile(
      path.join(incrementPath, 'rubric.md'),
      rubricWith(FAILING_BLOCKING_COMMAND),
      'utf-8',
    );

    const result = await IncrementCompletionValidator.validateCompletion(
      INCREMENT_ID,
      { logger: silentLogger, blockOnP0Orphans: false },
    );

    expect(result.isValid).toBe(false);
    const rubricError = result.errors.find(e => /Rubric:.*blocking/i.test(e) && /R-US1-01/.test(e));
    expect(rubricError).toBeDefined();
  });

  it('TC-008: failing advisory criterion does NOT block closure', async () => {
    await fsp.writeFile(
      path.join(incrementPath, 'rubric.md'),
      rubricWith(FAILING_ADVISORY_COMMAND),
      'utf-8',
    );

    const result = await IncrementCompletionValidator.validateCompletion(
      INCREMENT_ID,
      { logger: silentLogger, blockOnP0Orphans: false },
    );

    // No rubric BLOCKING error should be present.
    const rubricBlockingError = result.errors.find(e => /Rubric:.*blocking criteria failed/i.test(e));
    expect(rubricBlockingError).toBeUndefined();

    // The advisory failure is surfaced as a warning, not an error.
    const advisoryWarning = (result.warnings ?? []).find(w => /advisory/i.test(w));
    expect(advisoryWarning).toBeDefined();
  });
});
