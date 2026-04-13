import { describe, it, expect } from 'vitest';
import { generateRubric } from '../../../../src/core/rubric/rubric-generator.js';
import { parseRubric } from '../../../../src/core/rubric/rubric-parser.js';

const SPEC_WITH_ACS = `---
increment: 0663-test
title: Test Feature
type: feature
status: active
---

# Feature: Test Feature

## User Stories

### US-001: Config Schema
**Project**: specweave

**Acceptance Criteria**:
- [ ] **AC-US1-01**: New workspace section added
- [ ] **AC-US1-02**: WorkspaceRepo type includes id, path, prefix
- [ ] **AC-US1-03**: Boolean flags removed from type system
`;

const EMPTY_SPEC = `---
increment: 0663-empty
title: Empty
---
`;

describe('generateRubric', () => {
  it('TC-001: generates rubric from spec with N ACs', () => {
    const md = generateRubric('0663-test', SPEC_WITH_ACS);
    const matches = md.match(/### R-/g);
    expect(matches!.length).toBeGreaterThanOrEqual(3);
  });

  it('TC-002: generated criterion references its source AC', () => {
    const md = generateRubric('0663-test', SPEC_WITH_ACS);
    expect(md).toContain('AC-US1-01');
  });

  it('TC-003: generated rubric includes standard categories', () => {
    const md = generateRubric('0663-test', SPEC_WITH_ACS);
    expect(md).toContain('## Test Coverage');
    expect(md).toContain('## Code Quality');
    expect(md).toContain('## Independent Evaluation');
  });

  it('TC-004: generated rubric has valid YAML frontmatter', () => {
    const md = generateRubric('0663-test', SPEC_WITH_ACS);
    expect(md).toMatch(/^---/);
    expect(md).toContain('increment: 0663-test');
    expect(md).toMatch(/generated: \d{4}-\d{2}-\d{2}T/);
    expect(md).toContain('status: pending');
    expect(md).toContain('version:');
  });

  it('TC-005: all generated criteria have PENDING result', () => {
    const md = generateRubric('0663-test', SPEC_WITH_ACS);
    const doc = parseRubric(md);
    for (const criterion of doc.criteria) {
      expect(criterion.result).toBeNull();
    }
  });

  it('TC-006: coverage threshold from options', () => {
    const md = generateRubric('0663-test', SPEC_WITH_ACS, { coverageTarget: 90 });
    expect(md).toContain('>= 90%');
  });

  it('TC-007: empty spec generates only standard categories', () => {
    const md = generateRubric('0663-empty', EMPTY_SPEC);
    expect(md).not.toContain('- **Source**: AC-');
    expect(md).toContain('## Test Coverage');
    expect(md).toContain('## Code Quality');
    expect(md).toContain('## Independent Evaluation');
  });

  it('TC-008: criterion IDs are sequential R-001, R-002, ...', () => {
    const md = generateRubric('0663-test', SPEC_WITH_ACS);
    const doc = parseRubric(md);
    const specCriteria = doc.criteria.filter(c => c.id.startsWith('R-') && !c.id.startsWith('R-D'));
    for (let i = 0; i < specCriteria.length; i++) {
      expect(specCriteria[i].id).toBe(`R-${String(i + 1).padStart(3, '0')}`);
    }
  });
});
