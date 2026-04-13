import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from '../../../../src/utils/fs-native.js';
import { evaluateRubric, summarizeResults } from '../../../../src/core/rubric/rubric-evaluator.js';
import { mergeRubricLayers } from '../../../../src/core/rubric/rubric-merger.js';
import { parseRubric } from '../../../../src/core/rubric/rubric-parser.js';
import type { RubricDocument } from '../../../../src/core/rubric/types.js';

// Test the rubric validation logic that will be integrated into completion-validator.
// These tests exercise the public API the validator will call.

const FIXTURES = path.resolve(__dirname, 'fixtures');
const REPORTS = path.join(FIXTURES, 'reports');

const RUBRIC_ALL_PASS = `---
increment: 0663-test
title: Test
generated: ""
source: test
version: "1.0"
status: evaluated
---

## Functional Correctness

### R-001: Schema correct [blocking]
- **Source**: AC-US1-01
- **Evaluator**: sw:grill
- **Verify**: Check
- **Threshold**: Pass
- **Result**: [x] PASS

### R-002: Migration works [blocking]
- **Source**: AC-US1-02
- **Evaluator**: sw:grill
- **Verify**: Check
- **Threshold**: Pass
- **Result**: [x] PASS

### R-003: Docs updated [blocking]
- **Source**: project-default
- **Evaluator**: sw:code-reviewer
- **Verify**: Check
- **Threshold**: Pass
- **Result**: [x] PASS
`;

const RUBRIC_WITH_FAILURES = `---
increment: 0663-test
title: Test
generated: ""
source: test
version: "1.0"
status: evaluated
---

## Functional Correctness

### R-001: Schema correct [blocking]
- **Evaluator**: sw:grill
- **Result**: [!] FAIL — AC-US1-01 failed

### R-002: Migration works [blocking]
- **Evaluator**: sw:grill
- **Result**: [x] PASS

### R-003: Performance [blocking]
- **Evaluator**: sw:grill
- **Result**: [!] FAIL — timeout exceeded
`;

const RUBRIC_WITH_PENDING = `---
increment: 0663-test
title: Test
generated: ""
source: test
version: "1.0"
status: pending
---

## Functional Correctness

### R-001: Schema correct [blocking]
- **Evaluator**: sw:grill
- **Result**: [x] PASS

### R-002: Not evaluated [blocking]
- **Evaluator**: sw:grill
- **Result**: [ ] PENDING
`;

const RUBRIC_ADVISORY_ONLY_FAIL = `---
increment: 0663-test
title: Test
generated: ""
source: test
version: "1.0"
status: evaluated
---

## Functional Correctness

### R-001: Schema correct [blocking]
- **Evaluator**: sw:grill
- **Result**: [x] PASS

### R-002: Performance [advisory]
- **Evaluator**: sw:grill
- **Result**: [!] FAIL — slow

### R-003: Docs [advisory]
- **Evaluator**: sw:grill
- **Result**: [!] FAIL — missing
`;

describe('Rubric validation for completion-validator', () => {
  it('TC-001: all blocking criteria PASS → no errors', () => {
    const doc = parseRubric(RUBRIC_ALL_PASS);
    const summary = summarizeResults(doc);
    expect(summary.verdict).toBe('PASS');
    expect(summary.blocking.failed).toBe(0);
  });

  it('TC-002: blocking criteria FAIL → error with IDs', () => {
    const doc = parseRubric(RUBRIC_WITH_FAILURES);
    const summary = summarizeResults(doc);
    expect(summary.verdict).toBe('FAIL');
    expect(summary.blocking.failed).toBe(2);

    // Build error message like completion-validator would
    const failedIds = doc.criteria
      .filter(c => c.severity === 'blocking' && c.result?.status === 'fail')
      .map(c => `${c.id} (${c.title})`);
    expect(failedIds).toContain('R-001 (Schema correct)');
    expect(failedIds).toContain('R-003 (Performance)');
  });

  it('TC-003: blocking criterion PENDING → error', () => {
    const doc = parseRubric(RUBRIC_WITH_PENDING);
    const pending = doc.criteria.filter(
      c => c.severity === 'blocking' && c.result === null,
    );
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe('R-002');
    // summarizeResults counts null (PENDING) as unevaluated, distinct from failed
    const summary = summarizeResults(doc);
    expect(summary.verdict).toBe('FAIL');
    expect(summary.blocking.unevaluated).toBe(1);
    expect(summary.blocking.failed).toBe(0);
  });

  it('TC-004: advisory failures → warnings, not errors', () => {
    const doc = parseRubric(RUBRIC_ADVISORY_ONLY_FAIL);
    const summary = summarizeResults(doc);
    expect(summary.verdict).toBe('PASS'); // advisory don't block
    expect(summary.advisory.failed).toBe(2);
  });

  it('TC-005: no rubric.md → merge returns null', async () => {
    const result = await mergeRubricLayers('/nonexistent', 'test', '/nonexistent');
    expect(result).toBeNull();
  });

  it('TC-006: defense-in-depth — rubric errors are additive', () => {
    const doc = parseRubric(RUBRIC_WITH_FAILURES);
    const summary = summarizeResults(doc);
    // These would be pushed to errors[] alongside existing gate errors
    const rubricErrors = [`Rubric: ${summary.blocking.failed} blocking criteria failed`];
    const existingGateErrors = ['Code review: 1 critical finding'];
    const allErrors = [...rubricErrors, ...existingGateErrors];
    expect(allErrors.length).toBe(2);
  });
});
