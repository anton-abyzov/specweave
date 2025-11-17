---
name: specweave:check-hooks
description: Comprehensive health check for hooks - detects import errors, runtime failures, performance issues, and provides auto-fix suggestions
---

# Check Hook Health

**Command**: `/specweave:check-hooks`

Runs comprehensive health check on all hooks in the project.
Detects import errors, runtime failures, performance issues, and provides auto-fix suggestions.

## Usage

```bash
# Check all hooks
/specweave:check-hooks

# Check and auto-fix issues
/specweave:check-hooks --fix

# Check only critical hooks
/specweave:check-hooks --critical

# Verbose output with details
/specweave:check-hooks --verbose

# Check specific hook
/specweave:check-hooks update-ac-status

# Generate markdown report
/specweave:check-hooks --format markdown --output report.md
```

## Options

- `--fix` - Automatically repair fixable issues (missing .js extensions, etc.)
- `--critical` - Check only critical hooks (post-task-completion, user-prompt-submit)
- `--verbose` - Show detailed error messages and stack traces
- `--format <format>` - Output format: console (default), markdown, json, junit
- `--output <file>` - Write report to file
- `--timeout <ms>` - Hook execution timeout (default: 5000ms)
- `--fail-on-warnings` - Exit with error code if warnings detected

## What It Checks

### Import Errors (ERR_MODULE_NOT_FOUND)
- Missing .js extensions in ES module imports
- Incorrect import paths
- Missing dependencies

### Runtime Errors
- Static vs instance method mismatches
- Syntax errors
- JSON parse errors

### Performance Issues
- Hooks exceeding expected execution time
- Slow file I/O operations

### Best Practices
- Deprecated API usage
- Security vulnerabilities

## Auto-Fix Capabilities

The `--fix` flag can automatically repair:

1. **Missing .js Extensions**
   ```typescript
   // Before:
   import { ACStatusManager } from '../../../../src/core/increment/ac-status-manager';

   // After:
   import { ACStatusManager } from '../../../../src/core/increment/ac-status-manager.js';
   ```

2. **Import Path Corrections** (high confidence only)

## Output Formats

### Console (Default)
Colorized output for terminal viewing:

```
🏥 Hook Health Check
═══════════════════════════════════════════════════════════

✅ All hooks healthy (8/8 passed)

Hooks Checked:
  ✅ update-ac-status (42ms)
  ✅ auto-transition (38ms)
  ✅ sync-living-docs (156ms)
  ...

Summary:
  Total Hooks: 8
  ✅ Passed: 8
  ⏱️  Total Time: 625ms
```

### Markdown
Detailed report for documentation:

```markdown
# 🏥 Hook Health Check Report

**Generated**: 2025-11-16 14:00:00
**Overall Health**: 🟢 HEALTHY

## Summary
- **Total Hooks**: 8
- **Passed**: ✅ 8
- **Failed**: ❌ 0
```

### JSON
Machine-readable format for CI/CD:

```json
{
  "timestamp": "2025-11-16T14:00:00Z",
  "totalHooks": 8,
  "passedHooks": 8,
  "failedHooks": 0,
  "overallHealth": "healthy"
}
```

### JUnit XML
For CI/CD test reporting:

```xml
<testsuite name="Hook Health Check" tests="8" failures="0">
  <testcase name="update-ac-status" classname="specweave" time="0.042"/>
</testsuite>
```

## Exit Codes

- `0` - All hooks healthy
- `1` - Hook failures detected
- `2` - Critical hook failures (blocks workflow)

## Examples

### Pre-Build Health Check
```bash
npm run check:hooks
```

### CI/CD Integration
```yaml
# .github/workflows/test.yml
- name: Check Hook Health
  run: npm run check:hooks -- --format junit --output junit.xml

- name: Publish Test Results
  uses: EnricoMi/publish-unit-test-result-action@v2
  with:
    files: junit.xml
```

### Pre-Commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

npm run check:hooks --critical
if [ $? -ne 0 ]; then
  echo "❌ Critical hooks failing - commit blocked"
  exit 1
fi
```

## Troubleshooting

### "Hook execution timeout"
Increase timeout: `/specweave:check-hooks --timeout 10000`

### "Cannot find module"
Run with auto-fix: `/specweave:check-hooks --fix`

### "Permission denied"
Check hook file permissions: `chmod +x plugins/*/hooks/*.sh`

## See Also

- Hook Health Check Architecture: `.specweave/increments/0037-project-specific-tasks/architecture/HOOK-HEALTH-CHECK-ARCHITECTURE.md`
- Hook Development Guide: `.specweave/docs/public/guides/hook-development.md`
