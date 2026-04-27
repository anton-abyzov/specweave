---
description: "[DEPRECATED] Write failing tests that define expected behavior. Use when saying \"TDD red\", \"write failing tests\", or \"test first\"."
version: 1.0.0
deprecated: true
---

> ⚠️ DEPRECATED: Use `sw:tdd-cycle --phase red` instead. This skill will be removed in v1.3.0.

## Migration

This skill has been deprecated as part of the Opus 4.7 framework alignment (increment 0669).

- **Use instead**: `sw:tdd-cycle --phase red` runs only the RED phase (write failing tests)
- **Removal**: Scheduled for v1.3.0 (2 minor releases after v1.1.0)
- **Why**: The three TDD phase skills (tdd-red, tdd-green, tdd-refactor) were consolidated into `sw:tdd-cycle` with a `--phase` flag. Alias routing in `marketplace.json` redirects `/sw:tdd-red` → `/sw:tdd-cycle --phase red` automatically.

For the migration policy, see `.specweave/docs/internal/specs/skill-deprecation-policy.md`.

---

# TDD Red Phase - Write Failing Tests

## Project Overrides

**Skill Memories**: If `.specweave/skill-memories/tdd-red.md` exists, read and apply its learnings.

Write comprehensive failing tests following TDD red phase principles.

## Role

Generate failing tests using Task tool with subagent_type="unit-testing::test-automator".

## Prompt Template

"Generate comprehensive FAILING tests for: $ARGUMENTS

## Core Requirements

1. **Test Structure**: Framework-appropriate setup, Arrange-Act-Assert, should_X_when_Y naming, isolated fixtures
2. **Behavior Coverage**: Happy path, edge cases (empty/null/boundary), error handling, concurrent access
3. **Failure Verification**: Tests MUST fail when run, for RIGHT reasons (not syntax/import errors), meaningful diagnostics
4. **Test Categories**: Unit (isolated), Integration (interaction), Contract (API/interface), Property (invariants)

## CLI Integration Test Patterns

**Temp Home Isolation** (prevents touching real ~/.specweave/):
```typescript
import { withIsolatedHome, getIsolatedEnv } from '../test-utils/temp-home.js';

it('should run CLI command in isolated environment', async () => {
  const { homePath, restore } = await withIsolatedHome('my-test');
  try {
    const { stdout } = await execAsync('node bin/cli.js --version', {
      env: getIsolatedEnv(homePath),
    });
    expect(normalizeOutput(stdout)).toMatch(/^\d+\.\d+\.\d+$/);
  } finally {
    await restore();
  }
});
```

**Hook Execution Testing**:
```typescript
import { HookTestHarness } from '../test-utils/hook-test-harness.js';
import { extractJson } from '../test-utils/normalize-output.js';

it('should return approve decision from hook', async () => {
  const harness = new HookTestHarness(testDir, hookPath);
  const result = await harness.execute({ CI: 'true' });
  const json = extractJson<{ decision: string }>(result.stdout);
  expect(json?.decision).toBe('approve');
});
```

**Process Spawning**: Use `getCleanEnv()`/`getIsolatedEnv()` to strip NODE_OPTIONS. Set `{ timeout: 30000 }`. Use `normalizeOutput()` and `extractJson()`.

## Validation

After generation:
1. Run tests — confirm they fail
2. Verify helpful failure messages
3. Check test independence
4. Ensure comprehensive coverage"

Test requirements: $ARGUMENTS

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#tdd-red)
