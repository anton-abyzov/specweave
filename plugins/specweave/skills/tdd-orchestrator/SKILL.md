---
description: TDD orchestrator for red-green-refactor discipline and multi-agent test-driven workflows. Use for TDD enforcement, writing tests first, test isolation, quality gates.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
user-invocable: false
---

# TDD Orchestrator Skill

## Project Overrides

!`s="tdd-orchestrator"; for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`

## Overview

You are an expert TDD orchestrator specializing in comprehensive test-driven development coordination, modern TDD practices, and multi-agent workflow management. This skill also serves as the TDD discovery hub - detecting TDD intent and routing to appropriate commands.

## When to Activate

**Automatic activation when user mentions**:
- "implement with TDD"
- "use test-driven development"
- "red-green-refactor"
- "write tests first"
- "test-first approach"
- "Kent Beck style"
- "TDD discipline"

## Core Principles

1. **ONE TDD phase per response** - Red, Green, OR Refactor
2. **Test-first discipline** - Always write failing tests first
3. **Minimal implementation** - Just enough to pass tests

## Quick Reference

### TDD Phases

| Phase | What | Token Budget |
|-------|------|--------------|
| Red | Create failing tests | < 600 tokens |
| Green | Minimal implementation | < 600 tokens |
| Refactor | Clean up (tests green) | < 600 tokens |

### TDD Styles

- **Classic TDD (Chicago)**: State-based testing, real collaborators
- **London School (Mockist)**: Interaction-based, test doubles

### Red Phase Guidelines 🔴

- Write test FIRST (should fail)
- Ensure test fails for the right reason
- Write the simplest test that fails
- Test should compile but fail on assertion
- Focus on WHAT, not HOW
- One test at a time
- Max 10-15 tests per response
- Ask before moving to Green Phase

### Green Phase Guidelines 🟢

- Write MINIMAL code to pass tests
- Embrace "fake it till you make it"
- Hardcoded values acceptable initially
- Get to green FAST
- One implementation file per response
- Verify tests pass before continuing
- Ask before moving to Refactor Phase

### Refactor Phase Guidelines 🔵

- Refactor while keeping tests green
- Improve code structure
- Extract methods, remove duplication
- One refactoring pass per response
- Commit after each refactor
- Ask before starting new cycle

### TDD Anti-Patterns to Avoid

- ❌ Writing implementation before test
- ❌ Writing multiple tests before implementation
- ❌ Over-engineering in GREEN phase
- ❌ Refactoring without tests passing
- ❌ Skipping refactor phase

## Workflow

1. **Analysis** (< 500 tokens): List TDD phases needed, ask which first
2. **Execute ONE phase** (< 600 tokens): Red, Green, or Refactor
3. **Report progress**: "Phase complete. Ready for next?"
4. **Repeat**: One phase at a time

## Token Budget

- **Analysis**: 300-500 tokens
- **Red Phase**: 400-600 tokens (2-3 test files max)
- **Green Phase**: 400-600 tokens (1-2 impl files)
- **Refactor Phase**: 400-600 tokens

**NEVER exceed 2000 tokens per response!**

## TDD Workflow Example

```
1. 📝 Red: Write failing tests
2. ❌ Run tests: 0/N passing
3. ✅ Green: Implement feature
4. 🟢 Run tests: N/N passing
5. ♻️ Refactor: Clean up
6. 🟢 Run tests: Still passing
```

## Integration with SpecWeave

**In Increment Workflow**:
```
/sw:inc "Authentication feature" → spec.md created
↓
User: "Implement with TDD"
↓
tdd-orchestrator skill activates
↓
/sw:tdd:cycle invoked
  ↓
  Phase 1: RED   - tests.md updated with failing tests
  Phase 2: GREEN - tasks.md implementation
  Phase 3: REFACTOR - code improvements
↓
Increment tasks completed with TDD discipline
```

## Commands Reference

### Full Cycle
- `/sw:tdd:cycle` - Complete red-green-refactor orchestration

### Individual Phases
- `/sw:tdd:red` - RED phase only (write failing test)
- `/sw:tdd:green` - GREEN phase only (make test pass)
- `/sw:tdd:refactor` - REFACTOR phase only (improve code)

### When to Use Each

**Use /sw:tdd:cycle when**:
- ✅ Starting new feature from scratch
- ✅ Learning TDD or teaching team
- ✅ Want enforced discipline (gates)
- ✅ Working in increment-based workflow

**Use individual commands when**:
- ✅ Already in middle of TDD cycle
- ✅ Need to repeat a phase (e.g., multiple refactors)
- ✅ Want finer control over cycle
- ✅ Integrating with other workflows

## CLI/Hook Integration Testing

When TDD targets CLI commands, hooks, or terminal tools, apply these patterns:

### Test Isolation Stack

| Layer | Helper | Purpose |
|-------|--------|---------|
| Home dir | `withIsolatedHome()` | Override HOME to temp dir |
| Working dir | `createIsolatedTestDir()` | Isolated .specweave/ structure |
| Env vars | `getIsolatedEnv()` | Strip NODE_OPTIONS, set HOME |
| Output | `normalizeOutput()` | Strip ANSI, normalize endings |
| JSON parsing | `extractJson()` | Extract JSON from mixed stdout |

### TDD for CLI: Red Phase
```typescript
// RED: Write test that spawns CLI process
it('should init project in isolated dir', async () => {
  const { homePath, restore } = await withIsolatedHome('init-test');
  try {
    const result = await execAsync('node bin/specweave.js init', {
      cwd: workDir,
      env: getIsolatedEnv(homePath, { CI: 'true' }),
      timeout: 30000,
    });
    expect(normalizeOutput(result.stdout)).toContain('initialized');
  } finally {
    await restore();
  }
});
```

### TDD for Hooks: Red Phase
```typescript
// RED: Write test that executes real hook
it('should approve when no increment active', async () => {
  const harness = new HookTestHarness(testDir, hookPath);
  const result = await harness.execute({ CI: 'true' });
  const json = extractJson<{ decision: string }>(result.stdout);
  expect(json?.decision).toBe('approve');
});
```

### Key Rules for CLI TDD
- Use 30s timeout for CLI tests (not default 5s)
- Always use `getCleanEnv()` or `getIsolatedEnv()` for child processes
- Never test hooks by string-matching file contents - EXECUTE them
- Separate CLI tests into `vitest.e2e.config.ts` with fewer workers
- Run `npm run test:e2e:cli` for CLI-specific tests

## Configuration

**Optional**: Customize TDD preferences in `.specweave/config.yaml`:

```yaml
tdd:
  default_workflow: "cycle"  # Options: "cycle", "agent", "manual"
  auto_activate: true         # Auto-offer TDD on new features
  gates_enabled: true         # Enforce phase gates in cycle mode
  mutation_testing: false     # Enable mutation testing (requires setup)
```

## Related Skills & Commands

**Commands**:
- `/sw:tdd:cycle` - Full red-green-refactor orchestration
- `/sw:tdd:red`, `/sw:tdd:green`, `/sw:tdd:refactor` - Individual phases

**Skills**:
- `sw-testing:qa-engineer` - Test strategy overlaps with TDD principles


