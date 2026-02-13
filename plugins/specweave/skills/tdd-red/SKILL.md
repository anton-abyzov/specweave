---
description: Write failing tests that define expected behavior. Use when saying "TDD red", "write failing tests", or "test first".
---

# TDD Red Phase - Write Failing Tests

## Project Overrides

!`s="tdd-red"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

Write comprehensive failing tests following TDD red phase principles.

[Extended thinking: Generates failing tests that properly define expected behavior using test-automator agent.]

## Role

Generate failing tests using Task tool with subagent_type="unit-testing::test-automator".

## Prompt Template

"Generate comprehensive FAILING tests for: $ARGUMENTS

## Core Requirements

1. **Test Structure**
   - Framework-appropriate setup (Jest/pytest/JUnit/Go/RSpec)
   - Arrange-Act-Assert pattern
   - should_X_when_Y naming convention
   - Isolated fixtures with no interdependencies

2. **Behavior Coverage**
   - Happy path scenarios
   - Edge cases (empty, null, boundary values)
   - Error handling and exceptions
   - Concurrent access (if applicable)

3. **Failure Verification**
   - Tests MUST fail when run
   - Failures for RIGHT reasons (not syntax/import errors)
   - Meaningful diagnostic error messages
   - No cascading failures

4. **Test Categories**
   - Unit: Isolated component behavior
   - Integration: Component interaction
   - Contract: API/interface contracts
   - Property: Mathematical invariants

## Framework Patterns

**JavaScript/TypeScript (Jest/Vitest)**
- Mock dependencies with `vi.fn()` or `jest.fn()`
- Use `@testing-library` for React components
- Property tests with `fast-check`

**Python (pytest)**
- Fixtures with appropriate scopes
- Parametrize for multiple test cases
- Hypothesis for property-based tests

**Go**
- Table-driven tests with subtests
- `t.Parallel()` for parallel execution
- Use `testify/assert` for cleaner assertions

**Ruby (RSpec)**
- `let` for lazy loading, `let!` for eager
- Contexts for different scenarios
- Shared examples for common behavior

## CLI Integration Test Patterns

When testing CLI commands, hooks, or terminal tools, use these specialized patterns:

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

**Hook Execution Testing** (execute real hooks, not string matching):
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

**Process Spawning Best Practices**:
- Always use `getCleanEnv()` or `getIsolatedEnv()` to strip NODE_OPTIONS
- Set timeout: `{ timeout: 30000 }` for CLI tests
- Capture both stdout AND stderr
- Use `normalizeOutput()` before assertions
- Use `extractJson()` for mixed JSON/text output
- Create temp working directories with `createIsolatedTestDir()`

**Exit Code Verification**:
```typescript
try {
  await execAsync('node bin/cli.js bad-command', { env: getIsolatedEnv(home) });
  expect.unreachable('Expected non-zero exit');
} catch (error: any) {
  expect(error.code).not.toBe(0);
  expect(normalizeOutput(error.stderr)).toContain('Unknown command');
}
```

## Quality Checklist

- Readable test names documenting intent
- One behavior per test
- No implementation leakage
- Meaningful test data (not 'foo'/'bar')
- Tests serve as living documentation

## Anti-Patterns to Avoid

- Tests passing immediately
- Testing implementation vs behavior
- Complex setup code
- Multiple responsibilities per test
- Brittle tests tied to specifics

## Edge Case Categories

- **Null/Empty**: undefined, null, empty string/array/object
- **Boundaries**: min/max values, single element, capacity limits
- **Special Cases**: Unicode, whitespace, special characters
- **State**: Invalid transitions, concurrent modifications
- **Errors**: Network failures, timeouts, permissions

## Output Requirements

- Complete test files with imports
- Documentation of test purpose
- Commands to run and verify failures
- Metrics: test count, coverage areas
- Next steps for green phase"

## Validation

After generation:
1. Run tests - confirm they fail
2. Verify helpful failure messages
3. Check test independence
4. Ensure comprehensive coverage

## Example (Minimal)

```typescript
// auth.service.test.ts
describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepo = { findByEmail: jest.fn() } as any;
    authService = new AuthService(mockUserRepo);
  });

  it('should_return_token_when_valid_credentials', async () => {
    const user = { id: '1', email: 'test@example.com', passwordHash: 'hashed' };
    mockUserRepo.findByEmail.mockResolvedValue(user);

    const result = await authService.authenticate('test@example.com', 'pass');

    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
  });

  it('should_fail_when_user_not_found', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);

    const result = await authService.authenticate('none@example.com', 'pass');

    expect(result.success).toBe(false);
    expect(result.error).toBe('INVALID_CREDENTIALS');
  });
});
```

Test requirements: $ARGUMENTS
