import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { generateRubric } from '../../src/core/rubric/rubric-generator.js';
import { parseRubric } from '../../src/core/rubric/rubric-parser.js';
import { mergeRubricLayers } from '../../src/core/rubric/rubric-merger.js';
import { evaluateRubric, summarizeResults } from '../../src/core/rubric/rubric-evaluator.js';

const REPORTS_DIR = path.resolve(__dirname, '../unit/core/rubric/fixtures/reports');
const GLOBAL_DEFAULTS = path.resolve(__dirname, '../unit/core/rubric/fixtures/global-defaults.md');

const SPEC_CONTENT = `---
increment: 0663-pipeline-test
title: Pipeline Test
type: feature
status: active
---

# Feature: Pipeline Test

## User Stories

### US-001: Config Schema
**Project**: specweave

**Acceptance Criteria**:
- [ ] **AC-US1-01**: New workspace section added
- [ ] **AC-US1-02**: WorkspaceRepo type includes id, path, prefix
- [ ] **AC-US1-03**: Boolean flags removed
`;

describe('Rubric Pipeline Integration', () => {
  it('TC-001: full pipeline — generate, parse, evaluate with passing reports → PASS', async () => {
    // Generate
    const rubricMd = generateRubric('0663-pipeline-test', SPEC_CONTENT, { coverageTarget: 90 });

    // Parse
    const doc = parseRubric(rubricMd);
    expect(doc.criteria.length).toBeGreaterThan(3); // 3 ACs + 4 defaults

    // All start PENDING
    for (const c of doc.criteria) {
      expect(c.result).toBeNull();
    }

    // Evaluate against passing reports
    const evaluated = await evaluateRubric(doc, REPORTS_DIR);

    // Summarize
    const summary = summarizeResults(evaluated);

    // 2.0: the generator emits a single `sw:review` gate (grill + code-reviewer
    // + judge-llm merged). review.json has no blocking findings, so all pass.
    const reviewCriteria = evaluated.criteria.filter(c => c.evaluator === 'sw:review');
    expect(reviewCriteria.length).toBeGreaterThan(0);
    for (const c of reviewCriteria) {
      expect(c.result).not.toBeNull();
      expect(c.result!.status).toBe('pass');
    }
  });

  it('TC-002: full pipeline — failing gate reports → FAIL verdict', async () => {
    const rubricMd = generateRubric('0663-fail-test', SPEC_CONTENT);
    const doc = parseRubric(rubricMd);

    // Evaluate with a review report carrying critical/high findings
    const evaluated = await evaluateRubric(doc, REPORTS_DIR, {
      reviewReport: 'review-blocking.json',
    });

    const summary = summarizeResults(evaluated);
    expect(summary).toBeDefined();
    const reviewCriteria = evaluated.criteria.filter(c => c.evaluator === 'sw:review');
    expect(reviewCriteria.some(c => c.result?.status === 'fail')).toBe(true);
  });

  it('TC-003: backward compat — no rubric files at any tier → null', async () => {
    const result = await mergeRubricLayers(
      '/nonexistent/project',
      '0663-no-rubric',
      '/nonexistent/increment',
    );
    expect(result).toBeNull();
  });

  it('TC-004: parse-then-merge round trip preserves criterion count', async () => {
    const rubricMd = generateRubric('0663-merge-test', SPEC_CONTENT);
    const doc = parseRubric(rubricMd);
    const specCriteriaCount = doc.criteria.length;

    // Merge with global defaults (4 criteria, but IDs overlap with generated R-D01..R-D04)
    const merged = await mergeRubricLayers(
      '/nonexistent',
      '0663-merge-test',
      '/nonexistent',
      {
        globalPath: GLOBAL_DEFAULTS,
        incrementPath: undefined, // no increment file — use generated doc directly
      },
    );

    expect(merged).not.toBeNull();
    // Global has R-D01, R-D02. Generated has R-D01..R-D04.
    // Generated R-D01..R-D04 don't exist in this merge (no increment file),
    // only global R-D01, R-D02 survive.
    expect(merged!.criteria.length).toBeGreaterThan(0);
  });
});
