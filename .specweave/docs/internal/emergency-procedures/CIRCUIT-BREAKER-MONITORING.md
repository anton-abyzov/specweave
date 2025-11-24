# Circuit Breaker Monitoring and Recovery Guide

**Purpose**: Monitor and recover from hook circuit breaker triggers that disable AC sync and status line updates.

**Incident Reference**: 2025-11-24 - Circuit breaker triggered due to PROJECT_ROOT variable order bug
**Related**: CLAUDE.md Section 9a (Hook Performance & Safety)

---

## What is the Circuit Breaker?

**Auto-protection mechanism** that disables hooks after 3 consecutive failures to prevent:
- Infinite recursion loops
- Claude Code crashes
- Process storms
- Data corruption

**Files**:
- `.specweave/state/.hook-circuit-breaker` - POST-tool-use hooks (TodoWrite, etc.)
- `.specweave/state/.hook-circuit-breaker-pre` - PRE-tool-use hooks (Edit/Write validation)

---

## Symptoms of Circuit Breaker Activation

### 1. **AC Sync Broken**
```bash
# Tasks complete but ACs stay at 0%
✓ Tasks: 37/37 (100%)
❌ ACs: 0/70 (0%)  # Should be 70/70!
```

### 2. **Status Line Not Updating**
```bash
# Cache shows stale data
cat .specweave/state/status-line.json
# "lastUpdate": "2025-11-23..." (yesterday!)
```

### 3. **Hooks Not Firing**
```bash
# TodoWrite completes but no background work happens
# No AC checkboxes updated in spec.md
# No status line refresh
```

---

## Quick Health Check (30 seconds)

```bash
# 1. Check circuit breaker files
ls -la .specweave/state/.hook-circuit-breaker* 2>/dev/null

# 2. Check hook metrics (last execution time)
tail -1 .specweave/state/hook-metrics.jsonl | jq -r '.timestamp'

# 3. Check status line cache age
cat .specweave/state/status-line.json | jq -r '.lastUpdate'

# 4. Validate AC sync
grep -c "^\- \[x\] \*\*AC-" .specweave/increments/*/spec.md | \
  awk -F: '{sum+=$2} END {print "Total ACs completed:", sum}'
```

**Expected results**:
- ✅ No circuit breaker files
- ✅ Hook metrics < 1 hour old
- ✅ Status line cache < 1 hour old
- ✅ AC count > 0

---

## Emergency Recovery (5 minutes)

### Step 1: Reset Circuit Breaker
```bash
# Remove circuit breaker files
rm -f .specweave/state/.hook-circuit-breaker*

# Verify removed
ls .specweave/state/.hook-circuit-breaker* 2>&1 | \
  grep "No such file" && echo "✅ Circuit breaker reset"
```

### Step 2: Fix Active Increment State (if needed)
```bash
# Check current active increments
cat .specweave/state/active-increment.json | jq '.ids[]'

# If empty but you have in-progress increments:
# Manually update:
echo '{
  "ids": ["0053-safe-feature-deletion"],
  "lastUpdated": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
}' > .specweave/state/active-increment.json
```

### Step 3: Force Status Line Update
```bash
# Update cache immediately
node -e "(async () => {
  const { StatusLineUpdater } = await import('./dist/src/core/status-line/status-line-updater.js');
  const updater = new StatusLineUpdater(process.cwd());
  await updater.update();
  console.log('✅ Status line cache updated');
})()"

# Verify
cat .specweave/state/status-line.json | jq '.lastUpdate'
```

### Step 4: Test Hook Execution
```bash
# Test post-task-completion hook manually
bash plugins/specweave/hooks/post-task-completion.sh <<< '{
  "tool_input": {
    "todos": [
      {"content": "Test task", "status": "completed", "activeForm": "Testing"}
    ]
  }
}'

# Should see debug output, no errors
```

### Step 5: Restart Claude Code
```
# For status line display to appear
# Exit Claude Code and restart
```

---

## Root Cause Investigation (30 minutes)

### Check Hook Logs
```bash
# Recent hook errors
tail -50 .specweave/logs/hooks-debug.log 2>/dev/null | grep -i error

# Circuit breaker trigger count
find .specweave/state -name ".hook-circuit-breaker*" -exec echo {} \; -exec cat {} \;
```

### Validate Hook Variable Order
```bash
# Run validation script
bash scripts/validate-hook-variable-order.sh

# Expected: All hooks pass
# If fails: Hook code has variable order bug (CRITICAL!)
```

### Check for Recent Hook Changes
```bash
# Git log for hook modifications
git log --oneline --all --since="3 days ago" -- plugins/specweave/hooks/

# Compare with latest known good version
git diff origin/develop..HEAD -- plugins/specweave/hooks/
```

### Test Hooks in Isolation
```bash
# Test each critical hook
for hook in post-task-completion.sh pre-edit-write-consolidated.sh \
            post-edit-write-consolidated.sh post-metadata-change.sh; do
  echo "Testing $hook..."
  bash -n plugins/specweave/hooks/$hook && echo "  ✅ Syntax OK" || echo "  ❌ Syntax Error"
done
```

---

## Prevention Measures

### 1. **Pre-commit Validation** (Automated)
```bash
# Already configured in .git/hooks/pre-commit
# Runs on every commit:
bash scripts/validate-hook-variable-order.sh
```

### 2. **Regression Tests** (CI/CD)
```bash
# Run before releasing
npm run test:unit tests/unit/hooks/recursion-guard.test.ts

# Expected: 34 tests pass
```

### 3. **Monitoring Alerts** (Optional)
```bash
# Add to .bashrc or .zshrc for daily checks:
alias specweave-health='ls .specweave/state/.hook-circuit-breaker* 2>&1 | \
  grep "No such file" && echo "✅ Hooks healthy" || echo "🚨 Circuit breaker triggered!"'
```

### 4. **Status Line Validation** (Weekly)
```bash
# Validate status line sync
/specweave-validate-status

# Or manually:
bash scripts/validate-hook-variable-order.sh
```

---

## Common Failure Modes

### Failure Mode #1: PROJECT_ROOT Variable Order Bug
**Symptom**: Infinite recursion, 3x hook fires, circuit breaker triggers
**Cause**: `RECURSION_GUARD_FILE` uses `$PROJECT_ROOT` before it's defined
**Fix**: Ensure `PROJECT_ROOT=` appears before `RECURSION_GUARD_FILE=` in all hooks
**Prevention**: Pre-commit validation + regression tests

### Failure Mode #2: Missing Dependencies
**Symptom**: Hook fails with "command not found: jq"
**Cause**: jq/node/git not in PATH during hook execution
**Fix**: Install missing dependencies or use full paths
**Prevention**: Document required dependencies

### Failure Mode #3: Permission Errors
**Symptom**: Hook fails with "Permission denied" writing to .specweave/state/
**Cause**: File ownership/permissions incorrect
**Fix**: `chmod -R u+w .specweave/state/`
**Prevention**: Don't run hooks as different users

### Failure Mode #4: Stale Lock Files
**Symptom**: Hook hangs, timeouts
**Cause**: Previous hook crashed, lock file not cleaned
**Fix**: `rm -f .specweave/state/.hook-*.lock`
**Prevention**: Hooks use trap EXIT to cleanup locks

---

## Incident Response Checklist

**Time-to-recovery target**: < 10 minutes

- [ ] **Detect** (1 min):
  - Check circuit breaker files exist
  - Check status line shows 0% ACs despite completed tasks

- [ ] **Isolate** (2 min):
  - Note which circuit breaker triggered (pre vs post)
  - Check last hook execution time
  - Review recent git commits to hooks/

- [ ] **Recover** (5 min):
  - Remove circuit breaker files
  - Fix active increment state (if needed)
  - Force status line update
  - Test hook execution
  - Restart Claude Code

- [ ] **Investigate** (30 min):
  - Check hook logs for errors
  - Validate hook variable order
  - Test hooks in isolation
  - Review git history for hook changes

- [ ] **Prevent** (1 hour):
  - Fix root cause (code bug, missing dependency, etc.)
  - Add regression test if needed
  - Update documentation
  - Push fix to marketplace

---

## Emergency Contacts

**For contributors:**
- Check CLAUDE.md Section 9a (Hook Performance & Safety)
- Run: `bash scripts/validate-hook-variable-order.sh`
- Review: `.specweave/docs/internal/architecture/adr/0073-hook-recursion-prevention.md`

**For users:**
- Issue: https://github.com/anton-abyzov/specweave/issues
- Discussion: GitHub Discussions
- Emergency: Disable hooks with `export SPECWEAVE_DISABLE_HOOKS=1`

---

## Success Criteria

Circuit breaker recovery is successful when:

1. ✅ Circuit breaker files removed
2. ✅ Hooks execute without errors (test manually)
3. ✅ AC sync works (TodoWrite → spec.md ACs updated)
4. ✅ Status line updates (cache timestamp recent)
5. ✅ Validation passes (`bash scripts/validate-hook-variable-order.sh`)
6. ✅ Regression tests pass (`npm run test:unit tests/unit/hooks/recursion-guard.test.ts`)

---

**Last Updated**: 2025-11-24
**Next Review**: 2025-12-24
