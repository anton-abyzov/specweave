# VSCode Debug Mode: Child Process Failures

## Problem

When running tests or hooks that spawn child processes in **VSCode Debug mode**, the spawned processes fail with exit code 1 and empty output.

**Symptoms:**
- Tests pass with "Run Test" (green play button) but fail with "Debug Test" (bug icon)
- Spawned processes like `claude`, `git`, `npm` exit with code 1
- stdout and stderr are empty
- No obvious error message

## Root Cause

When VSCode debugs a Node.js process, it sets the `NODE_OPTIONS` environment variable with inspector flags:

```
NODE_OPTIONS=--inspect-brk=<port>
```

**This gets inherited by ALL child processes**, including those spawned via:
- `child_process.spawnSync()`
- `child_process.execFileSync()`
- `child_process.spawn()`
- `child_process.exec()`

When a child process inherits these flags, it tries to attach to the debugger on the same port, which:
1. Fails because the port is already in use
2. Causes the process to exit immediately with code 1
3. Produces no output (stdout/stderr empty)

## Solution

**Strip debugger-related environment variables before spawning child processes:**

```typescript
/**
 * Get clean environment for spawning child processes.
 *
 * Works across ALL environments:
 * - Windows, macOS, Linux
 * - VSCode, WebStorm, IntelliJ
 * - Local development, CI/CD pipelines (GitHub Actions, etc.)
 * - Debug mode, run mode, production
 *
 * Safe to use everywhere - if vars are not set, delete is a no-op.
 */
function getCleanEnv(): NodeJS.ProcessEnv {
  const cleanEnv = { ...process.env };

  // Remove Node.js debugger/inspector flags (VSCode, WebStorm, etc.)
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_INSPECT;
  delete cleanEnv.NODE_INSPECT_RESUME_ON_START;

  // Remove coverage instrumentation that can interfere with spawned processes
  delete cleanEnv.NODE_V8_COVERAGE;

  // Remove test runner debug vars
  delete cleanEnv.VSCODE_INSPECTOR_OPTIONS;

  return cleanEnv;
}

// Usage with spawnSync
import { spawnSync } from 'child_process';

const result = spawnSync('claude', ['--version'], {
  encoding: 'utf8',
  env: getCleanEnv(),  // <-- CRITICAL!
});

// Usage with execFileSync
import { execFileSync } from 'child_process';

const output = execFileSync('git', ['status'], {
  encoding: 'utf8',
  env: getCleanEnv(),  // <-- CRITICAL!
});
```

## Why This Matters for SpecWeave Hooks

SpecWeave hooks intercept user prompts and can execute **any logic**, including calling LLMs (even Claude Max/Opus plans). This enables building sophisticated AI-powered workflows:

```typescript
// Example: Hook that calls Claude CLI for smart prompt analysis
const result = spawnSync('claude', ['-p', prompt, '--model', 'haiku'], {
  encoding: 'utf8',
  env: getCleanEnv(),  // Without this, fails in VSCode Debug!
});
```

### Building LLM-Powered Hooks

SpecWeave hooks can call Claude CLI to implement complex decision-making:

```typescript
// user-prompt-submit hook that analyzes intent
import { spawnSync } from 'child_process';

function analyzePromptIntent(userPrompt: string): string {
  const analysisPrompt = `
    Analyze this user prompt and classify the intent:
    "${userPrompt}"

    Return JSON: { "intent": "feature|bug|refactor|question", "confidence": 0.0-1.0 }
  `;

  const result = spawnSync('claude', ['-p', analysisPrompt, '--model', 'haiku'], {
    encoding: 'utf8',
    timeout: 30000,
    shell: true,
    env: getCleanEnv(),  // CRITICAL!
  });

  if (result.status === 0) {
    return JSON.parse(result.stdout);
  }
  return { intent: 'unknown', confidence: 0 };
}
```

### Use Cases Enabled by This Pattern

| Use Case | Description |
|----------|-------------|
| **Smart Routing** | Route prompts to specialized agents based on LLM classification |
| **Context Injection** | Dynamically load relevant docs/code based on prompt analysis |
| **Quality Gates** | Validate code changes meet quality standards before commit |
| **Auto-Documentation** | Generate docs from code changes automatically |
| **Risk Assessment** | Analyze prompts for security/compliance concerns |
| **Cost Optimization** | Route simple queries to cheaper models (haiku vs opus) |
| **Multi-Agent Orchestration** | Coordinate multiple specialized AI agents |

### Cross-Platform Considerations

The `getCleanEnv()` pattern works consistently across:

| Platform | NODE_OPTIONS Source | Fix Required |
|----------|---------------------|--------------|
| **Windows** | VSCode, WebStorm | Yes |
| **macOS** | VSCode, Xcode tools | Yes |
| **Linux** | VSCode, CI runners | Yes |
| **GitHub Actions** | Coverage tools | Yes |
| **GitLab CI** | Debug/trace modes | Yes |
| **Docker** | Parent process flags | Yes |

**Always use `getCleanEnv()`** - it's safe in all environments (no-op when vars aren't set).

## Debugging Checklist

If child processes fail in debug mode:

1. **Check if `NODE_OPTIONS` is set:**
   ```typescript
   console.log('NODE_OPTIONS:', process.env.NODE_OPTIONS);
   // In debug mode: "--inspect-brk=xxxxx"
   // In run mode: undefined
   ```

2. **Verify the fix is applied:**
   ```typescript
   const cleanEnv = getCleanEnv();
   console.log('Cleaned NODE_OPTIONS:', cleanEnv.NODE_OPTIONS);
   // Should be: undefined
   ```

3. **Test both modes:**
   - Run with "Run Test" - should pass
   - Run with "Debug Test" - should now also pass

## Affected Tools

Any external CLI tool spawned as a child process:
- `claude` (Claude Code CLI)
- `git`
- `npm`, `yarn`, `pnpm`
- `node`
- `python`
- Custom scripts

## Related Files

- `src/utils/claude-cli-detector.ts` - Uses `getCleanEnv()` for CLI detection
- `tests/integration/lazy-loading/claude-cli-detection.test.ts` - Test utilities
- `vitest.config.ts` - PATH configuration for test environment

## Alternative: VSCode Launch Configuration

You can also configure VSCode to not set `NODE_OPTIONS` for child processes:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run"],
      "env": {
        "NODE_OPTIONS": ""  // Clear NODE_OPTIONS
      }
    }
  ]
}
```

However, the `getCleanEnv()` approach is more robust as it works regardless of how the process was started.

## Summary

| Mode | NODE_OPTIONS | Child Processes | Solution |
|------|--------------|-----------------|----------|
| Run Test | Not set | Work normally | None needed |
| Debug Test | `--inspect-brk=...` | Fail with exit 1 | Use `getCleanEnv()` |
| Terminal | Not set | Work normally | None needed |
| CI/CD | Not set | Work normally | None needed |

**Always use `getCleanEnv()` when spawning child processes** - it works in all modes and ensures your code is debug-friendly.
