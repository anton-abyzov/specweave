---
description: Validate hook health and display performance metrics (Tier 2 monitoring)
---

# /specweave:check-hooks - Hook Health Dashboard

**Purpose:** Display comprehensive hook performance metrics, detection rates, and health status.

**Tier 2 Feature:** This command validates the PreToolUse coordination layer is working correctly.

---

## Instructions for Claude

When this command is executed, perform the following analysis:

### 1. **Read Hook Metrics File**

Location: `.specweave/state/hook-metrics.jsonl`

The metrics file contains JSONL (JSON Lines) format - one JSON object per line.

Each entry has:
```json
{
  "timestamp": "2025-11-22T01:30:00Z",
  "hook": "pre-edit-spec|post-edit-spec|pre-write-spec|post-write-spec",
  "event": "file_detected|tier2_success|tier1_fallback",
  "file_path": "/path/to/file.md",
  "method": "pretooluse|env_content|env_result|env_args|mtime"
}
```

### 2. **Calculate Key Metrics**

**Tier 2 Success Rate:**
```
Tier 2 Rate = (tier2_success events) / (total post-tool events) * 100%
```

**Target:** >95% (Tier 2 should handle most cases)

**Detection Method Breakdown:**
- `pretooluse`: Tier 2 PreToolUse coordination (best)
- `env_content`: Environment variable (TOOL_USE_CONTENT)
- `env_result`: Environment variable (TOOL_RESULT)
- `env_args`: Environment variable (TOOL_USE_ARGS)
- `mtime`: File modification time fallback (Tier 1)

**Fallback Rate:**
```
Fallback Rate = (mtime detections) / (total detections) * 100%
```

**Target:** <5% (should rarely need mtime fallback)

### 3. **Check Hook Health Status**

**Circuit Breaker Status:**
- File: `.specweave/state/.hook-circuit-breaker`
- If exists: Read failure count
- If count ≥ 3: ⚠️ CIRCUIT BREAKER OPEN (hooks disabled)
- If count < 3: ✅ Circuit breaker OK
- If doesn't exist: ✅ No failures detected

**Kill Switch Status:**
- Check environment variable: `SPECWEAVE_DISABLE_HOOKS`
- If set to "1": ⚠️ HOOKS MANUALLY DISABLED
- If not set or "0": ✅ Hooks enabled

**Lock Files Status:**
- Check for stale locks:
  - `.specweave/state/.hook-post-edit.lock`
  - `.specweave/state/.hook-post-write.lock`
- If older than 10 seconds: ⚠️ Stale lock detected
- If not present: ✅ No locks

### 4. **Read Recent Hook Logs**

Location: `.specweave/logs/hooks-debug.log`

**Look for:**
- Recent errors or warnings
- Debounce effectiveness (count "Debounced" messages)
- PreToolUse signal messages
- Circuit breaker trips

**Time window:** Last 100 lines or last 1 hour

### 5. **Output Format**

Display results in this format:

```
🔍 SpecWeave Hook Health Dashboard (Tier 2)
═══════════════════════════════════════════════════════════

📊 DETECTION METRICS (Last 24 hours)
────────────────────────────────────
Total Hook Executions:        156
Tier 2 Success (PreToolUse):  149 (95.5%) ✅
Tier 1 Fallback (env vars):     5 (3.2%)
Tier 1 Fallback (mtime):        2 (1.3%)

Detection Method Breakdown:
  • pretooluse:     149 (95.5%) ✅ Target: >95%
  • env_content:      3 (1.9%)
  • env_args:         2 (1.3%)
  • mtime:            2 (1.3%)  ✅ Target: <5%

🏥 HEALTH STATUS
────────────────────────────────────
Circuit Breaker:      ✅ OK (0 failures)
Kill Switch:          ✅ Hooks enabled
Stale Locks:          ✅ None detected
Debounce Efficiency:  87% (136/156 skipped)

⚡ PERFORMANCE
────────────────────────────────────
Average Hook Latency:     ~3ms
Debounce Window:          5 seconds
Background Updates:       Active
Metrics Collection:       Active

📝 RECENT ACTIVITY (Last 10 events)
────────────────────────────────────
[2025-11-22 01:30:15] post-edit-spec: File from PreToolUse signal: /path/to/spec.md
[2025-11-22 01:30:10] pre-edit-spec: Signaled PostToolUse for: /path/to/spec.md
[2025-11-22 01:29:45] post-edit-spec: Debounced (2s since last update)
...

✅ SUMMARY
────────────────────────────────────
Status: HEALTHY ✅

Tier 2 coordination is working correctly (95.5% success rate).
Fallback rate is within acceptable range (<5%).
No health issues detected.

Recommendations:
  • None - system performing optimally

To disable hooks temporarily:
  export SPECWEAVE_DISABLE_HOOKS=1

To reset circuit breaker:
  rm .specweave/state/.hook-circuit-breaker
```

### 6. **Health Assessment Logic**

**Determine overall status:**

- ✅ **HEALTHY** if:
  - Tier 2 success rate >90%
  - Fallback rate <10%
  - No circuit breaker trips
  - Hooks enabled

- ⚠️ **WARNING** if:
  - Tier 2 success rate 70-90%
  - Fallback rate 10-30%
  - Circuit breaker count 1-2

- ❌ **CRITICAL** if:
  - Tier 2 success rate <70%
  - Fallback rate >30%
  - Circuit breaker open (count ≥ 3)
  - Hooks manually disabled

### 7. **Troubleshooting Recommendations**

Based on status, provide targeted recommendations:

**If Tier 2 success rate <95%:**
```
⚠️ PreToolUse coordination not working optimally

Recommendations:
1. Check if PreToolUse hooks are registered in plugin.json
2. Verify hook files are executable (chmod +x)
3. Review .specweave/logs/hooks-debug.log for PreToolUse errors
4. Consider filing bug with Anthropic (environment variable passing)
```

**If fallback rate >10%:**
```
⚠️ High fallback rate detected

Recommendations:
1. Tier 2 coordination may not be working
2. Environment variables still not being passed
3. Consider Tier 3 implementation (filesystem watcher)
```

**If circuit breaker open:**
```
❌ Hooks disabled due to consecutive failures

Immediate actions:
1. Review .specweave/logs/hooks-debug.log for errors
2. Fix underlying issues
3. Reset circuit breaker: rm .specweave/state/.hook-circuit-breaker
4. Restart Claude Code
```

### 8. **Error Handling**

If metrics file doesn't exist:
```
⚠️ No metrics data available

This is normal for:
  • New SpecWeave installation
  • First run after Tier 2 upgrade

Metrics will be collected automatically as you work.
Run this command again after a few Edit/Write operations.
```

If logs not accessible:
```
⚠️ Could not read hook logs

Check file permissions:
  .specweave/logs/hooks-debug.log
  .specweave/state/hook-metrics.jsonl
```

---

## Implementation Notes

**For Claude:**
1. Parse JSONL file line by line (each line is a JSON object)
2. Calculate metrics using simple counting
3. Display results using the template above
4. Adjust recommendations based on actual metrics
5. Keep output concise but informative

**Time-based filtering:**
- Default: Last 24 hours
- Option: All time (if user requests)
- Filter by comparing timestamp field

**Edge cases:**
- Empty metrics file → Show "waiting for data" message
- Corrupted JSONL → Skip invalid lines, report count
- Missing state directory → Create it, show initialization message

---

## Related Documentation

- ADR-0060: Hook Performance Optimization
- `.specweave/increments/0050-*/reports/hook-crash-analysis.md`
- CLAUDE.md: "Hook Performance Best Practices"
