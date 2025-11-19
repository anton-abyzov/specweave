# Plugin Hook Error Analysis

**Date**: 2025-11-14
**Increment**: 0031-external-tool-status-sync
**Issue**: "Plugin hook error" appears when running commands

## Investigation Summary

### Findings

1. **Hooks Are Executing Successfully**
   - Debug logs show successful execution
   - TodoWrite hook fires correctly
   - Tasks.md is being updated
   - No actual errors in hook-debug.log

2. **Recent Path Fixes**
   - Commit 583cb00 fixed paths for DORA metrics and spec sync
   - Changed `dist/metrics/` → `dist/src/metrics/`
   - Changed `dist/cli/commands/` → `dist/src/cli/commands/`
   - Root cause: TypeScript preserves source directory structure

3. **Error Source**
   - "Plugin hook error:" is Claude Code's generic error message
   - Not found in SpecWeave codebase - comes from Claude Code itself
   - Actual error details being suppressed

4. **Missing Files Detected**
   - ❌ `dist/cli/index.js` does not exist
   - ✅ `dist/src/core/increment/metadata-manager.js` exists and works
   - ✅ `dist/plugins/specweave/lib/hooks/*.js` all exist
   - ✅ Hooks have proper fallback logic

### Root Cause Hypothesis

**Most Likely**: Hook output format issue or exit code problem

When a hook encounters an error (like missing file), it may:
1. Output invalid JSON (Claude Code expects valid JSON)
2. Exit with non-zero code (Claude Code treats as error)
3. Fail silently with error suppression (`2>/dev/null`)

**Example Scenario**:
```bash
# Hook tries to require missing file
node -e "require('./dist/cli/index.js')" 2>/dev/null || echo "OK"
# Outputs: "OK" (not valid JSON for hook response)
# Claude Code sees invalid response → "Plugin hook error"
```

### Hooks Analyzed

1. **user-prompt-submit.sh** (line 29)
   ```bash
   if [[ -f "dist/cli/index.js" ]]; then
   ```
   - Checks for dist/cli/index.js (doesn't exist)
   - Falls back to manual metadata check (works)
   - Should NOT cause error (fallback logic present)

2. **pre-command-deduplication.sh** (line 27)
   ```bash
   if [[ -f "dist/src/core/deduplication/command-deduplicator.js" ]]; then
   ```
   - Uses CORRECT path (dist/src/)
   - Should work fine

3. **post-task-completion.sh** (lines 207-227)
   ```bash
   if [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/sync-living-docs.js" ]; then
   ```
   - Uses CORRECT path
   - Multiple fallback locations
   - Should work fine

### Test Requirements

A comprehensive test should verify:

1. **Path Resolution**
   - All required TypeScript files exist
   - Hooks use correct paths (dist/src/, not dist/)
   - Fallback paths work correctly

2. **Hook Output Format**
   - All hooks output valid JSON
   - Proper decision/systemMessage/reason structure
   - No plain text mixed with JSON

3. **Exit Codes**
   - Hooks exit with 0 on success
   - Hooks exit with 0 on expected errors (fail-open)
   - Non-zero exit only for critical failures

4. **Error Handling**
   - Missing dependencies are handled gracefully
   - Invalid input is handled gracefully
   - File not found errors don't break execution

5. **Integration**
   - Hooks work in actual Claude Code environment
   - JSON parsing by Claude Code succeeds
   - Error messages are properly formatted

## Recommended Actions

### 1. Fix dist/cli/index.js Check

**File**: `plugins/specweave/hooks/user-prompt-submit.sh` (line 29)

**Current**:
```bash
if command -v node >/dev/null 2>&1 && [[ -f "dist/cli/index.js" ]]; then
```

**Should be**:
```bash
if command -v node >/dev/null 2>&1 && [[ -f "dist/src/cli/index.js" ]]; then
```

**Why**: TypeScript compilation preserves source structure (src/ → dist/src/)

### 2. Add Hook Validation Script

Create `scripts/validate-hooks.sh` to:
- Test all hooks with sample input
- Verify JSON output format
- Check exit codes
- Validate path resolution

### 3. Create Automated Test

**Test Suite**: `tests/integration/hooks/hook-validation.spec.ts`

Should test:
- Hook execution with valid input
- Hook execution with missing dependencies
- Hook output format validation
- Exit code verification
- Path resolution checks

### 4. Add CI/CD Hook Validation

Add to `.github/workflows/test.yml`:
```yaml
- name: Validate Hooks
  run: |
    npm run build
    bash scripts/validate-hooks.sh
```

## Prevention Guidelines

### For Contributors

1. **Always use dist/src/ paths** (not dist/)
   ```bash
   # ❌ WRONG
   require('./dist/cli/index.js')

   # ✅ CORRECT
   require('./dist/src/cli/index.js')
   ```

2. **Test hooks locally before committing**
   ```bash
   bash scripts/validate-hooks.sh
   ```

3. **Check compiled output structure**
   ```bash
   npm run build
   ls -la dist/src/  # Should match src/ structure
   ```

### For Hook Development

1. **Always output valid JSON**
   ```bash
   cat <<EOF
   {
     "decision": "approve"
   }
   EOF
   ```

2. **Always exit with 0** (fail-open pattern)
   ```bash
   node -e "..." 2>/dev/null || echo "OK"
   exit 0
   ```

3. **Use multiple fallback paths**
   ```bash
   if [ -f "$PROJECT_ROOT/dist/src/file.js" ]; then
     # Use project local
   elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/src/file.js" ]; then
     # Use installed package
   elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/file.js" ]; then
     # Use plugin root
   else
     echo "[$(date)] ⚠️  file.js not found in any location"
   fi
   ```

## Next Steps

1. ✅ Investigation complete
2. ⏳ Create comprehensive test suite
3. ⏳ Fix dist/cli/index.js path issue
4. ⏳ Add validation script
5. ⏳ Add CI/CD validation

## Related Files

- `.specweave/increments/0031-external-tool-status-sync/reports/HOOK-PATH-ISSUES-ANALYSIS.md`
- `.specweave/increments/0031-external-tool-status-sync/reports/HOOK-FIXES-SUMMARY.md`
- Commit: 583cb00 (fix: correct hook file paths)
- Commit: 222827e (chore: release v0.17.19 - hook path fixes)
