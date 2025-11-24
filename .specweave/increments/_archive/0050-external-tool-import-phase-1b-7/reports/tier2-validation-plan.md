# Tier 2 Validation Plan - PreToolUse Environment Variable Testing

**Date:** 2025-11-22
**Status:** BLOCKER for Tier 2 deployment
**Judge Assessment:** PASS WITH CONCERNS (75% confidence)

---

## Critical Assumption to Validate

**ASSUMPTION:** PreToolUse hooks receive `TOOL_USE_ARGS` environment variable with file_path

**Risk if Wrong:** Tier 2 provides ZERO benefit over Tier 1, becomes pure overhead

**Probability of Failure:** 70% (Claude Code env var issue likely affects all hook types)

---

## Validation Test Procedure

### 1. Setup Test Hook

**File:** `plugins/specweave/hooks/test-pretooluse-env.sh`

**Register in plugin.json:**
```json
{
  "matcher": "Edit",
  "hooks": [{
    "type": "command",
    "command": "${CLAUDE_PLUGIN_ROOT}/hooks/test-pretooluse-env.sh",
    "timeout": 2
  }]
}
```

### 2. Execute Test Edits

```bash
# Make 10 test edits to any file
for i in {1..10}; do
  echo "test $i" >> .specweave/test-file.md
  sleep 0.5
done
```

### 3. Analyze Results

```bash
# Review test log
cat /tmp/pretooluse-test.log

# Count successful detections
grep "TOOL_USE_ARGS:" /tmp/pretooluse-test.log | grep -v "<EMPTY>" | wc -l

# Count total invocations
grep "PreToolUse:Edit invocation" /tmp/pretooluse-test.log | wc -l

# Calculate success rate
# Success Rate = (non-empty count) / (total count) * 100%
```

### 4. Success Criteria

**TIER 2 VIABLE if:**
- ✅ TOOL_USE_ARGS contains file_path in ≥80% of invocations
- ✅ file_path can be extracted successfully
- ✅ file_path matches the edited file

**TIER 2 NOT VIABLE if:**
- ❌ TOOL_USE_ARGS is empty in >20% of invocations
- ❌ file_path extraction fails
- ❌ file_path points to wrong file

### 5. Decision Matrix

| Success Rate | Decision | Next Steps |
|--------------|----------|------------|
| >95% | ✅ Deploy Tier 2 | Monitor for 1 week, target >95% sustained |
| 80-95% | ⚠️ Deploy with caution | Investigate failures, improve detection |
| 50-80% | ⚠️ Don't deploy | Tier 1 sufficient, plan Tier 3 |
| <50% | ❌ Tier 2 fails | File bug with Anthropic, skip to Tier 3 |

---

## Alternative Validation Methods

### Method 2: Live Monitoring

**Enable test hook alongside production hooks:**
```bash
# Both hooks run in parallel
PreToolUse:Edit → test-pretooluse-env.sh (logs env vars)
PreToolUse:Edit → pre-edit-spec.sh (production)
```

**Monitor metrics:**
```bash
# Check if pre-edit-spec.sh detects files
grep "Detected file_path:" .specweave/logs/hooks-debug.log | wc -l

# Compare to total invocations
grep "PreToolUse:Edit invocation" /tmp/pretooluse-test.log | wc -l
```

### Method 3: Diff Analysis

**Compare PreToolUse vs PostToolUse detection:**
```bash
# PreToolUse detections
grep "pre-edit-spec: Detected file_path:" .specweave/logs/hooks-debug.log > /tmp/pre.txt

# PostToolUse detections
grep "post-edit-spec: File from PreToolUse signal:" .specweave/logs/hooks-debug.log > /tmp/post.txt

# They should match 1:1
diff /tmp/pre.txt /tmp/post.txt
```

---

## Rollback Plan

### If PreToolUse Validation Fails (<80% success rate)

**Immediate Actions:**
1. **DO NOT deploy Tier 2 to production**
2. Remove PreToolUse hooks from plugin.json
3. Keep Tier 1 improvements (debouncing, mtime, background)
4. Document findings in ADR-0060

**File Bug with Anthropic:**
```
Title: PreToolUse hooks do not receive TOOL_USE_ARGS environment variable

Description:
- PreToolUse hooks registered for Edit/Write tools
- TOOL_USE_ARGS is empty in X% of invocations
- Expected: file_path available in TOOL_USE_ARGS
- Actual: Empty or inconsistent

Reproduction:
1. Register PreToolUse:Edit hook
2. Add logging: echo "${TOOL_USE_ARGS:-EMPTY}" > /tmp/test.log
3. Make 10 edits
4. Observe: TOOL_USE_ARGS is empty in most cases

Impact: Cannot implement efficient file path detection in hooks

Test Results: [Attach /tmp/pretooluse-test.log]
```

**Alternative Path:**
- Tier 1 remains permanent solution (97% overhead reduction achieved)
- Evaluate Tier 3 (filesystem watcher) as next step
- Timeline: Spike Tier 3 in next sprint if Tier 1 proves insufficient

---

## Success Path

### If PreToolUse Validation Succeeds (>80% success rate)

**Deployment Sequence:**
1. ✅ Remove test hook from plugin.json
2. ✅ Deploy production PreToolUse hooks (pre-edit-spec.sh, pre-write-spec.sh)
3. ✅ Deploy updated PostToolUse hooks (with Tier 2 coordination)
4. ✅ Restart Claude Code
5. ✅ Monitor `/specweave:check-hooks` for 1 week

**Monitoring Targets (Week 1):**
- Tier 2 success rate: >95%
- Fallback rate: <5%
- Hook latency: <5ms (95th percentile)
- Zero circuit breaker trips

**Decision Gate (After 1 Week):**
- If metrics met → Tier 2 declared successful, close initiative
- If metrics not met → Investigate, optimize, or rollback
- If marginal (90-95%) → Extend monitoring to 2 weeks

---

## Timeline

**Phase 1: Validation (1 day)**
- [x] Create test hook
- [ ] Register in plugin.json
- [ ] Execute 100 test edits
- [ ] Analyze results
- [ ] Make GO/NO-GO decision

**Phase 2: Deployment (if GO) (1 day)**
- [ ] Remove test hook
- [ ] Deploy production Tier 2
- [ ] Restart Claude Code
- [ ] Verify initial metrics

**Phase 3: Monitoring (7 days)**
- [ ] Daily `/specweave:check-hooks` review
- [ ] Track Tier 2 success rate trend
- [ ] Document any issues
- [ ] Final assessment

**Phase 4: Decision (1 day)**
- [ ] Review 7-day metrics
- [ ] PASS/FAIL determination
- [ ] Update ADR-0060 with results
- [ ] Plan next steps (Tier 3 or close)

---

## Risk Mitigation

### Race Condition (MODERATE risk)

**Issue:** Concurrent Edit/Write could overwrite `.pending-status-update`

**Mitigation:** Use PID-based unique filenames
```bash
# PreToolUse
PENDING_FILE="$STATE_DIR/.pending-status-update-$$"

# PostToolUse
PENDING_FILE=$(ls -t "$STATE_DIR"/.pending-status-update-* 2>/dev/null | head -1)
```

**Implementation:** Address in next iteration (post-validation)

### Metrics File Growth (MINOR risk)

**Issue:** JSONL file could grow unbounded on high-activity projects

**Mitigation:** Time-based rotation (24 hours) instead of entry count (1000)

**Implementation:** Monitor during Phase 3, address if >100KB/day

---

## Acceptance Criteria

**Before declaring Tier 2 successful:**
- [x] Judge LLM assessment: PASS (with concerns addressed)
- [ ] PreToolUse env var validation: >80% success
- [ ] 7-day monitoring: Tier 2 success rate >95%
- [ ] 7-day monitoring: Zero critical issues
- [ ] Documentation: ADR-0060 updated with results
- [ ] `/specweave:check-hooks` shows HEALTHY status

---

## Next Steps

**IMMEDIATE (today):**
1. Register test hook in plugin.json (temporarily)
2. Make 100 test edits across different files
3. Analyze /tmp/pretooluse-test.log
4. Make GO/NO-GO decision

**IF GO:**
- Deploy Tier 2 to production
- Begin 7-day monitoring

**IF NO-GO:**
- Document test results in ADR-0060
- File bug with Anthropic (include logs)
- Keep Tier 1 as permanent solution
- Evaluate Tier 3 need

**DECISION MAKER:** Engineering team (based on test results)
