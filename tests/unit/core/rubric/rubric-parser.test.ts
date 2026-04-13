import { describe, it, expect } from 'vitest';
import { parseRubric } from '../../../../src/core/rubric/rubric-parser.js';
import { RubricParseError } from '../../../../src/core/rubric/types.js';

const VALID_RUBRIC = `---
increment: 0663-test
title: Test Rubric
generated: 2026-04-12T00:00:00.000Z
source: spec.md
version: "1.0"
status: evaluated
---

# Rubric: Test Rubric

## Functional Correctness

### R-001: Config schema validated [blocking]
- **Source**: AC-US1-01, AC-US1-02
- **Evaluator**: sw:grill
- **Verify**: WorkspaceConfig type exists
- **Threshold**: All source ACs pass
- **Result**: [x] PASS

### R-002: Migration is idempotent [advisory]
- **Source**: AC-US2-01
- **Evaluator**: sw:grill
- **Verify**: Running migration twice produces same result
- **Threshold**: Idempotent
- **Result**: [!] FAIL — 2 critical findings

## Test Coverage

### R-003: Unit test coverage meets target [blocking]
- **Source**: project-default
- **Evaluator**: coverage
- **Verify**: Coverage output
- **Threshold**: >= 90% line coverage
- **Result**: [ ] PENDING
`;

describe('parseRubric', () => {
  it('TC-001: parses complete valid rubric.md into RubricDocument', () => {
    const doc = parseRubric(VALID_RUBRIC);
    expect(doc.incrementId).toBe('0663-test');
    expect(doc.title).toBe('Test Rubric');
    expect(doc.generated).toBe('2026-04-12T00:00:00.000Z');
    expect(doc.criteria).toHaveLength(3);
  });

  it('TC-002: parses criterion header with [blocking] severity', () => {
    const doc = parseRubric(VALID_RUBRIC);
    const r001 = doc.criteria.find(c => c.id === 'R-001')!;
    expect(r001.id).toBe('R-001');
    expect(r001.title).toBe('Config schema validated');
    expect(r001.severity).toBe('blocking');
  });

  it('TC-003: parses criterion header with [advisory] severity', () => {
    const doc = parseRubric(VALID_RUBRIC);
    const r002 = doc.criteria.find(c => c.id === 'R-002')!;
    expect(r002.severity).toBe('advisory');
  });

  it('TC-004: parses all three Result states', () => {
    const doc = parseRubric(VALID_RUBRIC);
    const r001 = doc.criteria.find(c => c.id === 'R-001')!;
    expect(r001.result).not.toBeNull();
    expect(r001.result!.status).toBe('pass');

    const r002 = doc.criteria.find(c => c.id === 'R-002')!;
    expect(r002.result).not.toBeNull();
    expect(r002.result!.status).toBe('fail');
    expect(r002.result!.evidence).toBe('2 critical findings');

    const r003 = doc.criteria.find(c => c.id === 'R-003')!;
    expect(r003.result).toBeNull();
  });

  it('TC-005: parses Evaluator field with all supported values', () => {
    const content = `---
increment: test
title: Test
generated: ""
source: test
version: "1.0"
status: pending
---

## Test

### R-001: Grill test [blocking]
- **Evaluator**: sw:grill
- **Result**: [ ] PENDING

### R-002: Code review test [blocking]
- **Evaluator**: sw:code-reviewer
- **Result**: [ ] PENDING

### R-003: Judge test [blocking]
- **Evaluator**: sw:judge-llm
- **Result**: [ ] PENDING

### R-004: Coverage test [blocking]
- **Evaluator**: coverage
- **Result**: [ ] PENDING

### R-005: Manual test [advisory]
- **Evaluator**: manual
- **Result**: [ ] PENDING
`;
    const doc = parseRubric(content);
    expect(doc.criteria[0].evaluator).toBe('sw:grill');
    expect(doc.criteria[1].evaluator).toBe('sw:code-reviewer');
    expect(doc.criteria[2].evaluator).toBe('sw:judge-llm');
    expect(doc.criteria[3].evaluator).toBe('coverage');
    expect(doc.criteria[4].evaluator).toBe('manual');
  });

  it('TC-006: parses Source field with multiple AC IDs', () => {
    const doc = parseRubric(VALID_RUBRIC);
    const r001 = doc.criteria.find(c => c.id === 'R-001')!;
    expect(r001.sourceACs).toEqual(['AC-US1-01', 'AC-US1-02']);
  });

  it('TC-007: parses single-AC Source field', () => {
    const doc = parseRubric(VALID_RUBRIC);
    const r002 = doc.criteria.find(c => c.id === 'R-002')!;
    expect(r002.sourceACs).toEqual(['AC-US2-01']);
  });

  it('TC-008: throws RubricParseError on malformed frontmatter', () => {
    const bad = `---
increment: test
title: Broken
`;
    expect(() => parseRubric(bad)).toThrow(RubricParseError);
  });

  it('TC-009: parses category from ## Section heading', () => {
    const doc = parseRubric(VALID_RUBRIC);
    const r001 = doc.criteria.find(c => c.id === 'R-001')!;
    const r002 = doc.criteria.find(c => c.id === 'R-002')!;
    expect(r001.category).toBe('functional-correctness');
    expect(r002.category).toBe('functional-correctness');
    const r003 = doc.criteria.find(c => c.id === 'R-003')!;
    expect(r003.category).toBe('test-coverage');
  });

  it('TC-010: parses Verify and Threshold fields', () => {
    const doc = parseRubric(VALID_RUBRIC);
    const r001 = doc.criteria.find(c => c.id === 'R-001')!;
    expect(r001.verify).toBe('WorkspaceConfig type exists');
    expect(r001.threshold).toBe('All source ACs pass');
  });

  it('TC-011: parses rubric.md with no criteria (empty document)', () => {
    const empty = `---
increment: empty
title: Empty Rubric
generated: ""
source: test
version: "1.0"
status: pending
---

# Rubric: Empty
`;
    const doc = parseRubric(empty);
    expect(doc.criteria).toEqual([]);
  });
});
