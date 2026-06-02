import { describe, it, expect } from 'vitest';
import { parseRubric } from './rubric-parser.js';

/**
 * Regression: a `command` criterion whose Verify is written as a markdown
 * inline-code span (`` `cmd` ``) must parse to the bare command. Leaving the
 * backticks in makes the shell perform command substitution at evaluation time
 * (it runs the inner command, then execs its OUTPUT) → `exit 127`.
 */
describe('rubric-parser Verify inline-code stripping', () => {
  const rubric = (verify: string) => `---
increment: test
---

# Rubric: test

## Functional Correctness

### R-US1-01: Probe runs [blocking]
- **Source**: AC-US1-01
- **Evaluator**: command
- **Verify**: ${verify}
- **Threshold**: exit 0
- **Result**: [ ] PENDING
`;

  it('strips single backticks around a command probe', () => {
    const doc = parseRubric(rubric('`npx vitest run foo.test.ts`'));
    expect(doc.criteria[0].verify).toBe('npx vitest run foo.test.ts');
  });

  it('strips double backticks (span containing a backtick)', () => {
    const doc = parseRubric(rubric('``grep -q "x" file``'));
    expect(doc.criteria[0].verify).toBe('grep -q "x" file');
  });

  it('leaves an un-backticked probe untouched', () => {
    const doc = parseRubric(rubric('test -f rubric.md'));
    expect(doc.criteria[0].verify).toBe('test -f rubric.md');
  });

  it('does not strip backticks that are not a full-value span', () => {
    const doc = parseRubric(rubric('run `a` then `b`'));
    expect(doc.criteria[0].verify).toBe('run `a` then `b`');
  });
});
