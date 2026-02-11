---
id: cli-integration-testing
title: CLI & Hook Integration Testing Guide
status: DRAFT
category: testing
created: 2026-02-11
---

# CLI & Hook Integration Testing Guide

How to write reliable integration tests for CLI commands, shell hooks, and terminal tools. Based on best practices from OpenClaw, pnpm, oclif/Salesforce, and Bubbletea.

## The Testing Pyramid for CLI Tools

```
        /  E2E  \          5%  - Full workflows (init → increment → done)
       /  CLI    \        15%  - Spawn process, verify output + filesystem
      / Integration\      20%  - Hook execution, config parsing, sync flows
     /    Unit      \     60%  - Pure functions, parsers, validators
```

## Core Helpers

SpecWeave provides purpose-built helpers in `tests/test-utils/`:

### 1. Home Directory Isolation (`temp-home.ts`)

**Problem**: CLI tests that touch `~/.specweave/` or `~/.claude/` pollute real user config.

**Solution**: Override `HOME` to a temp directory for the duration of the test.

```typescript
import { withIsolatedHome, getIsolatedEnv } from '../test-utils/temp-home.js';

it('should work in isolated home', async () => {
  const { homePath, restore } = await withIsolatedHome('my-test');
  try {
    // HOME is now a temp dir with .specweave/ and .claude/ created
    const { stdout } = await execAsync('node bin/specweave.js --version', {
      env: getIsolatedEnv(homePath),
    });
    expect(stdout).toBeTruthy();
  } finally {
    await restore(); // ALWAYS restore in finally block
  }
});
```

**For child processes**, use `getIsolatedEnv()` which also strips `NODE_OPTIONS` to prevent debugger interference:

```typescript
const env = getIsolatedEnv(homePath, { CI: 'true', MY_VAR: 'test' });
await execAsync(command, { env });
```

### 2. Working Directory Isolation (`isolated-test-dir.ts`)

**Problem**: Tests that create `.specweave/` structures can collide with the real project.

**Solution**: Create disposable working directories in `os.tmpdir()`.

```typescript
import { createIsolatedTestDir, createSpecweaveStructure } from '../test-utils/isolated-test-dir.js';

it('should manipulate increments safely', async () => {
  const { testDir, cleanup } = await createIsolatedTestDir('increment-test');
  try {
    await createSpecweaveStructure(testDir);
    // testDir/.specweave/increments/ exists
    // NEVER touches project .specweave/
  } finally {
    await cleanup();
  }
});
```

### 3. Output Normalization (`normalize-output.ts`)

**Problem**: CLI output contains ANSI color codes, spinner artifacts, and platform-specific line endings.

**Solution**: Normalize before asserting.

```typescript
import { normalizeOutput, extractJson, stripAnsi } from '../test-utils/normalize-output.js';

// Strip ANSI codes and normalize line endings
const clean = normalizeOutput(stdout); // strip ANSI + \r\n → \n + trim

// Extract JSON from mixed output (log lines + JSON)
const json = extractJson<{ decision: string }>(stdout);
expect(json?.decision).toBe('approve');
```

### 4. Hook Test Harness (`hook-test-harness.ts`)

**Problem**: Hooks are bash scripts; testing them requires proper process spawning.

**Solution**: Use the `HookTestHarness` class.

```typescript
import { HookTestHarness } from '../test-utils/hook-test-harness.js';

it('should execute hook and return JSON', async () => {
  const harness = new HookTestHarness(testDir, hookPath);
  const result = await harness.execute({ CI: 'true' });

  expect(result.exitCode).toBe(0);
  const json = extractJson(result.stdout);
  expect(json).toHaveProperty('decision');
});
```

## Vitest Configuration Tiers

SpecWeave separates tests by speed and resource requirements:

| Config | Command | Timeout | Workers | Purpose |
|--------|---------|---------|---------|---------|
| `vitest.config.ts` | `npm test` | 10s | default | All tests |
| `vitest.unit.config.ts` | `npm run test:unit:fast` | 5s | max | Unit tests only |
| `vitest.e2e.config.ts` | `npm run test:e2e:cli` | 30s | 2-4 | CLI + e2e tests |

**Why separate configs?** CLI tests spawn real processes (7-10s each). Running them with unit tests in parallel causes flakiness and slows the feedback loop.

## Common Patterns

### Pattern 1: Test CLI command output

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

describe('CLI Commands', { timeout: 30000 }, () => {
  it('should show version', async () => {
    const { stdout } = await execAsync('node bin/specweave.js --version', {
      env: getIsolatedEnv(homePath),
    });
    expect(normalizeOutput(stdout)).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
```

### Pattern 2: Test CLI creates files

```typescript
it('should create config on init', async () => {
  await execAsync('node bin/specweave.js init --adapter=claude --language=en', {
    cwd: workDir,
    env: getIsolatedEnv(homePath, { CI: 'true' }),
  });

  const configPath = path.join(workDir, '.specweave', 'config.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
  expect(config.adapters?.default).toBe('claude');
});
```

### Pattern 3: Test exit codes

```typescript
it('should fail for unknown command', async () => {
  try {
    await execAsync('node bin/specweave.js bad-command', {
      env: getIsolatedEnv(homePath),
    });
    expect.unreachable('Expected non-zero exit');
  } catch (error: any) {
    expect(error.code).not.toBe(0);
  }
});
```

### Pattern 4: Test hook with stdin

```typescript
it('should process user prompt input', async () => {
  const input = JSON.stringify({ prompt: '/sw:progress' });
  const hookPath = 'plugins/specweave/hooks/user-prompt-submit.sh';

  const result = await execAsync(
    `echo '${input.replace(/'/g, "'\\''")}' | bash "${hookPath}"`,
    { cwd: projectRoot, env: getIsolatedEnv(homePath) }
  );

  const json = extractJson(result.stdout);
  expect(json).toHaveProperty('decision');
});
```

### Pattern 5: Golden file testing (for stable output)

Inspired by Bubbletea's `*.golden` pattern and Turborepo's Insta snapshots:

```typescript
it('should match expected help output', async () => {
  const { stdout } = await execAsync('node bin/specweave.js --help', {
    env: getIsolatedEnv(homePath),
  });

  // Use Vitest snapshots as golden files
  expect(normalizeOutput(stdout)).toMatchSnapshot();
});
```

Run with `--update` to regenerate: `npx vitest run --update`

## Anti-Patterns

### Do NOT: String-match file contents instead of executing

```typescript
// BAD - doesn't verify the hook actually works
const hookContent = fs.readFileSync(hookPath, 'utf-8');
expect(hookContent).toContain('specweave detect-intent');

// GOOD - actually runs the hook
const harness = new HookTestHarness(testDir, hookPath);
const result = await harness.execute();
expect(result.exitCode).toBe(0);
```

### Do NOT: Use process.cwd() in test paths

```typescript
// BAD - unreliable in parallel execution, can delete real files
const testDir = process.cwd();

// GOOD - isolated temp directory
const { testDir, cleanup } = await createIsolatedTestDir('my-test');
```

### Do NOT: Forget to strip NODE_OPTIONS

```typescript
// BAD - will break in VSCode debugger
await execAsync(command, { env: process.env });

// GOOD - strips debugger flags
await execAsync(command, { env: getIsolatedEnv(homePath) });
```

### Do NOT: Use default timeout for CLI tests

```typescript
// BAD - 5s timeout will fail for init (takes 7-10s)
describe('CLI Tests', () => { ... });

// GOOD - explicit longer timeout
describe('CLI Tests', { timeout: 30000 }, () => { ... });
```

## Comparison with Industry Tools

| Feature | SpecWeave | OpenClaw | pnpm | oclif |
|---------|-----------|----------|------|-------|
| Home isolation | `withIsolatedHome()` | `temp-home.ts` | `pnpm_tmp` | TestSession |
| Output normalization | `normalizeOutput()` | `normalize-text.ts` | N/A | N/A |
| Config tiers | 3 configs | 6 configs | 2 modes | nyc auto |
| Coverage target | 40% | 70% | merged lcov | nyc auto |
| Process spawning | `execAsync` + `getIsolatedEnv` | `spawn` + env snapshot | CLI invocation | In-process |
| JSON extraction | `extractJson()` | Manual parsing | N/A | `--json` flag |

## Further Reading

- [Testing Fundamentals](testing-fundamentals.md) - Testing pyramid, TDD, BDD, coverage
- [SpecWeave CLAUDE.md](../../../CLAUDE.md) - TDD mode configuration
- OpenClaw test helpers: [github.com/openclaw/openclaw/tree/main/test/helpers](https://github.com/openclaw/openclaw/tree/main/test/helpers)
- Bubbletea testing: [charm.land/blog/teatest](https://charm.land/blog/teatest/)
- oclif test framework: [oclif.io/docs/testing](https://oclif.io/docs/testing/)
