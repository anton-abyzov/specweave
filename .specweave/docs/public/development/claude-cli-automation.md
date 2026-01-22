# Claude CLI Automation Patterns

## Overview

This document covers patterns for automating Claude Code CLI from scripts, tests, and CI/CD pipelines.

---

## Basic CLI Usage

### Installation & Authentication

```bash
# Install Claude Code CLI globally
npm install -g @anthropic-ai/claude-code

# Login (opens browser for OAuth)
claude login

# Verify authentication
claude --version
```

### Running Claude with a Prompt

```bash
# Simple prompt execution
claude "Explain this code" < file.ts

# With specific model
claude --model opus "Design an API for user management"

# Quick mode (opus for extensive analysis)
claude --model opus "Analyze this architecture and suggest improvements"

# Fast mode (haiku for simple tasks)
claude --model haiku "Fix the typo in this error message"
```

---

## Plugin Management

### Installing Plugins

```bash
# Install from marketplace
claude plugin install sw@specweave
claude plugin install sw-frontend@specweave
claude plugin install sw-testing@specweave

# Install all plugins from a marketplace
claude plugin marketplace update specweave
claude plugin install sw-*@specweave

# List installed plugins
claude plugin list
```

### Plugin Commands

```bash
# Enable/disable plugins
claude plugin enable sw-frontend@specweave
claude plugin disable sw-frontend@specweave

# Update marketplace cache
claude plugin marketplace update specweave
```

---

## Automation Patterns

### 1. Script-Based Execution

```bash
#!/bin/bash
# automation.sh

# Run Claude with a file as input
claude "Review this code for security issues" < src/auth.ts > review.md

# Run Claude with specific instructions
claude --model sonnet "Create unit tests for this function" < src/utils.ts > tests.ts

# Batch processing
for file in src/*.ts; do
  claude "Add JSDoc comments" < "$file" > "${file%.ts}.documented.ts"
done
```

### 2. Node.js Child Process

```typescript
import { spawnSync, execFileSync } from 'child_process';
import { getCleanEnv } from './utils/clean-env.js';

/**
 * CRITICAL: Always use getCleanEnv() when spawning Claude CLI
 * This prevents NODE_OPTIONS inheritance issues in debug mode and CI/CD
 */
function runClaude(prompt: string, input?: string): string {
  const result = spawnSync('claude', [prompt], {
    encoding: 'utf-8',
    env: getCleanEnv(),  // ← CRITICAL for debug mode + CI/CD
    input,
    timeout: 120000,
  });

  if (result.status !== 0) {
    throw new Error(`Claude failed: ${result.stderr}`);
  }

  return result.stdout;
}

// Usage
const review = runClaude('Review this code', fs.readFileSync('src/auth.ts', 'utf-8'));
```

### 3. CI/CD Integration

```yaml
# .github/workflows/code-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Claude CLI
        run: npm install -g @anthropic-ai/claude-code

      - name: Login to Claude
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: claude login --api-key "$ANTHROPIC_API_KEY"

      - name: Review Changed Files
        run: |
          git diff --name-only HEAD~1 | while read file; do
            if [[ "$file" == *.ts ]]; then
              claude "Review this TypeScript code for issues" < "$file" >> review.md
            fi
          done

      - name: Post Review Comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const review = fs.readFileSync('review.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: review
            });
```

---

## Model Selection Guide

| Use Case | Model | Flag |
|----------|-------|------|
| Quick fixes, simple tasks | Haiku | `--model haiku` |
| Standard development | Sonnet | (default) |
| Complex analysis, architecture | Opus | `--model opus` |
| Extended reasoning (ultrathink) | Opus 4.5 | `--model opus` |

### When to Use Each Model

**Haiku (Fast & Cheap)**:
- Typo fixes
- Simple code generation
- Quick questions
- Formatting changes

**Sonnet (Default)**:
- Standard development tasks
- Code reviews
- Test generation
- Bug fixes

**Opus (Most Capable)**:
- Architecture design
- Complex refactoring
- Security analysis
- Performance optimization
- Multi-file changes

---

## Testing with Claude CLI

### Integration Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { getCleanEnv } from '../test-utils/clean-env.js';

describe('Claude CLI Integration', () => {
  // Skip if Claude CLI not available
  const claudeAvailable = spawnSync('claude', ['--version'], {
    encoding: 'utf-8',
    env: getCleanEnv(),
  }).status === 0;

  it.skipIf(!claudeAvailable)('should generate code', () => {
    const result = spawnSync(
      'claude',
      ['Generate a hello world function in TypeScript'],
      {
        encoding: 'utf-8',
        env: getCleanEnv(),
        timeout: 60000,
      }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('function');
  });
});
```

### getCleanEnv() is MANDATORY

**Why it's critical**:
1. VSCode Debug Mode sets `NODE_OPTIONS=--inspect-brk=<port>`
2. CI/CD pipelines may set coverage/instrumentation flags
3. Child processes inherit these env vars and FAIL

```typescript
// src/utils/clean-env.ts
export function getCleanEnv(): NodeJS.ProcessEnv {
  const cleanEnv = { ...process.env };

  // Remove debugger flags (VSCode, WebStorm, IntelliJ)
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_INSPECT;
  delete cleanEnv.NODE_INSPECT_RESUME_ON_START;

  // Remove coverage/instrumentation (CI/CD)
  delete cleanEnv.NODE_V8_COVERAGE;
  delete cleanEnv.VSCODE_INSPECTOR_OPTIONS;

  return cleanEnv;
}
```

---

## Error Handling

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| Exit code 1, empty output | NODE_OPTIONS inheritance | Use `getCleanEnv()` |
| "Not authenticated" | Missing login | Run `claude login` |
| Timeout | Long-running task | Increase timeout |
| "Model not available" | Wrong model name | Check `--model` flag |

### Robust Error Handling

```typescript
function runClaudeSafe(prompt: string, options: ClaudeOptions = {}): string | null {
  try {
    const result = spawnSync('claude', [
      prompt,
      ...(options.model ? ['--model', options.model] : []),
    ], {
      encoding: 'utf-8',
      env: getCleanEnv(),
      timeout: options.timeout ?? 120000,
      input: options.input,
    });

    if (result.status !== 0) {
      console.error(`Claude failed (exit ${result.status}):`, result.stderr);
      return null;
    }

    return result.stdout;
  } catch (error) {
    console.error('Claude execution error:', error);
    return null;
  }
}
```

---

## Best Practices

**✅ DO**:
- Always use `getCleanEnv()` when spawning Claude CLI
- Set reasonable timeouts for long tasks
- Use appropriate model for task complexity
- Handle errors gracefully
- Log Claude interactions for debugging

**❌ DON'T**:
- Use `process.env` directly in spawn calls
- Skip error handling
- Use Opus for simple tasks (expensive)
- Hardcode credentials in scripts
- Ignore timeout settings

---

## Related Documentation

- [VSCode Debug Child Processes](./troubleshooting/vscode-debug-child-processes.md)
- [Testing Skill: Unit Testing Expert](../../plugins/specweave-testing/skills/unit-testing-expert/SKILL.md)
- [CI/CD Integration Guide](./ci-cd-integration.md)
